-- ============================================================
-- PingTan 智慧校园 — Supabase Schema
-- 在 Supabase SQL Editor 中一次性执行此文件
-- ============================================================

-- 0. 清理已有表（按依赖反序删除）
drop table if exists public.repair_images cascade;
drop table if exists public.repair_tickets cascade;
drop table if exists public.meal_bookings cascade;
drop table if exists public.meal_menus cascade;
drop table if exists public.notifications cascade;
drop table if exists public.profiles cascade;

-- 清理辅助函数
drop function if exists public.resolve_login_phone(text);
drop function if exists public.resolve_login_email(text);
drop function if exists public.normalize_phone_digits(text);
drop function if exists public.can_manage_users();
drop function if exists public.can_manage_notifications();
drop function if exists public.can_manage_repair();
drop function if exists public.can_manage_canteen();
drop function if exists public.current_user_role();
drop function if exists public.handle_new_user();
drop function if exists public.protect_profile_update();
drop function if exists public.touch_updated_at();

-- 清理 storage policies（忽略不存在的情况）
do $$ begin
  drop policy if exists "Authenticated users can upload repair images" on storage.objects;
  drop policy if exists "Anyone can view repair images" on storage.objects;
  drop policy if exists "Authenticated users can view repair images" on storage.objects;
  drop policy if exists "Users can delete own repair images" on storage.objects;
  drop policy if exists "Repair admins can delete repair images" on storage.objects;
  drop policy if exists "Authenticated users can upload avatars" on storage.objects;
  drop policy if exists "Authenticated users can update own avatars" on storage.objects;
  drop policy if exists "Anyone can view avatars" on storage.objects;
  drop policy if exists "Users can delete own avatars" on storage.objects;
exception when others then null;
end $$;

create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles — 用户资料
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  teacher_no  text unique,
  name        text not null,
  email       text unique,
  phone       text not null,
  role        text not null default 'teacher'
    check (role in ('teacher', 'canteen_admin', 'repair_admin', 'super_admin')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.can_manage_canteen()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('canteen_admin', 'super_admin'), false)
$$;

create or replace function public.can_manage_repair()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('repair_admin', 'super_admin'), false)
$$;

create or replace function public.can_manage_notifications()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('canteen_admin', 'repair_admin', 'super_admin'), false)
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

create or replace function public.normalize_phone_digits(phone_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when digits ~ '^86[0-9]{11}$' then substring(digits from 3)
    else digits
  end
  from (
    select regexp_replace(coalesce(phone_value, ''), '\D', '', 'g') as digits
  ) normalized
$$;

-- 手机号登录通过 profiles.phone 解析到 Supabase Auth 的 email 字段，不触发短信验证码。
create or replace function public.resolve_login_email(login_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.email) = lower(trim(login_identifier))
     or lower(u.email) = lower(trim(login_identifier))
     or public.normalize_phone_digits(p.phone) = public.normalize_phone_digits(login_identifier)
  limit 1
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_email text;
  metadata_phone text;
begin
  metadata_email := nullif(new.raw_user_meta_data ->> 'email', '');
  metadata_phone := nullif(new.raw_user_meta_data ->> 'phone', '');

  insert into public.profiles (id, name, email, phone, teacher_no, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), '老师'),
    metadata_email,
    coalesce(metadata_phone, ''),
    nullif(new.raw_user_meta_data ->> 'teacher_no', ''),
    'teacher'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_users() then
    if new.role is distinct from old.role then
      raise exception 'Only super admins can change user roles';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_update
  before update on public.profiles
  for each row execute function public.protect_profile_update();

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Managers can view all profiles"
  on public.profiles for select
  using (
    public.can_manage_users()
    or public.can_manage_notifications()
    or public.can_manage_canteen()
    or public.can_manage_repair()
  );

create policy "Users can update own editable profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Super admins can update all profiles"
  on public.profiles for update
  using (public.can_manage_users())
  with check (public.can_manage_users());

-- ============================================================
-- 2. meal_menus — 每日菜单
-- ============================================================
create table public.meal_menus (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  items       jsonb not null default '[]'::jsonb,
  description text,
  image_url   text,
  time_range  text,
  created_at  timestamptz not null default now(),
  unique(date, meal_type)
);

alter table public.meal_menus enable row level security;

create policy "Authenticated users can view menus"
  on public.meal_menus for select
  using (auth.role() = 'authenticated');

create policy "Canteen admins can insert menus"
  on public.meal_menus for insert
  with check (public.can_manage_canteen());

create policy "Canteen admins can update menus"
  on public.meal_menus for update
  using (public.can_manage_canteen())
  with check (public.can_manage_canteen());

create policy "Canteen admins can delete menus"
  on public.meal_menus for delete
  using (public.can_manage_canteen());

-- ============================================================
-- 3. meal_bookings — 餐次预订记录
-- ============================================================
create table public.meal_bookings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  menu_id     uuid not null references public.meal_menus(id) on delete cascade,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  status      text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, date, meal_type)
);

alter table public.meal_bookings enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_meal_bookings_updated_at
  before update on public.meal_bookings
  for each row execute function public.touch_updated_at();

create policy "Users can view own bookings"
  on public.meal_bookings for select
  using (auth.uid() = user_id);

create policy "Canteen admins can view all bookings"
  on public.meal_bookings for select
  using (public.can_manage_canteen());

create policy "Users can insert own bookings"
  on public.meal_bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on public.meal_bookings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Canteen admins can update all bookings"
  on public.meal_bookings for update
  using (public.can_manage_canteen())
  with check (public.can_manage_canteen());

create policy "Canteen admins can delete bookings"
  on public.meal_bookings for delete
  using (public.can_manage_canteen());

-- ============================================================
-- 4. repair_tickets — 报修工单
-- ============================================================
create table public.repair_tickets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  fault_type   text not null check (fault_type in ('水电门窗', '多媒体', '空调', '其他')),
  location     text not null,
  description  text not null,
  status       text not null default '待处理' check (status in ('待处理', '处理中', '已完成')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.repair_tickets enable row level security;

create trigger touch_repair_tickets_updated_at
  before update on public.repair_tickets
  for each row execute function public.touch_updated_at();

create policy "Users can view own tickets"
  on public.repair_tickets for select
  using (auth.uid() = user_id);

create policy "Repair admins can view all tickets"
  on public.repair_tickets for select
  using (public.can_manage_repair());

create policy "Users can insert own tickets"
  on public.repair_tickets for insert
  with check (auth.uid() = user_id);

create policy "Repair admins can update all tickets"
  on public.repair_tickets for update
  using (public.can_manage_repair())
  with check (public.can_manage_repair());

-- ============================================================
-- 5. repair_images — 报修图片
-- ============================================================
create table public.repair_images (
  id           uuid primary key default uuid_generate_v4(),
  ticket_id    uuid not null references public.repair_tickets(id) on delete cascade,
  image_url    text not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

alter table public.repair_images enable row level security;

create policy "Users can view own ticket images"
  on public.repair_images for select
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Repair admins can view all images"
  on public.repair_images for select
  using (public.can_manage_repair());

create policy "Users can insert own ticket images"
  on public.repair_images for insert
  with check (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Users can delete own ticket images"
  on public.repair_images for delete
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Repair admins can delete all images"
  on public.repair_images for delete
  using (public.can_manage_repair());

-- ============================================================
-- 6. notifications — 通知公告
-- ============================================================
create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  content         text not null,
  type            text not null default 'info' check (type in ('info', 'warning', 'urgent')),
  target_user_id  uuid references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view relevant notifications"
  on public.notifications for select
  using (
    auth.role() = 'authenticated'
    and (target_user_id is null or target_user_id = auth.uid())
  );

create policy "Notification admins can view all notifications"
  on public.notifications for select
  using (public.can_manage_notifications());

create policy "Notification admins can insert notifications"
  on public.notifications for insert
  with check (public.can_manage_notifications());

create policy "Notification admins can update notifications"
  on public.notifications for update
  using (public.can_manage_notifications())
  with check (public.can_manage_notifications());

create policy "Notification admins can delete notifications"
  on public.notifications for delete
  using (public.can_manage_notifications());

-- ============================================================
-- 7. Storage Buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values ('repair-images', 'repair-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "Authenticated users can upload repair images"
  on storage.objects for insert
  with check (
    bucket_id = 'repair-images'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view repair images"
  on storage.objects for select
  using (bucket_id = 'repair-images');

create policy "Users can delete own repair images"
  on storage.objects for delete
  using (
    bucket_id = 'repair-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Repair admins can delete repair images"
  on storage.objects for delete
  using (
    bucket_id = 'repair-images'
    and public.can_manage_repair()
  );

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Authenticated users can update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 8. 示例数据 — 通知公告
-- ============================================================
insert into public.notifications (title, content, type) values
  ('关于2024年秋季学期校历安排的通知', '各位老师：2024年秋季学期将于9月1日正式开学，请做好教学准备工作。详细校历安排已发至各教研组邮箱。', 'info'),
  ('食堂菜品升级公告', '为提升教职工用餐体验，学校食堂将于下周起增加特色菜品供应，新增海鲜粥、牛肉面等选项，欢迎品尝。', 'info'),
  ('多媒体教室设备维护通知', '本周六（10月28日）将对全校多媒体教室进行设备维护升级，届时教室将暂停使用，请提前做好教学安排。', 'warning');

-- ============================================================
-- 9. 示例数据 — 今日菜单
-- ============================================================
insert into public.meal_menus (date, meal_type, items, description, image_url, time_range) values
  (current_date, 'breakfast', '["现磨豆浆","手工肉包","茶叶蛋","红薯粥"]', '营养早餐，活力一天', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600', '07:00 - 08:30'),
  (current_date, 'lunch', '["红烧肉","清炒时蔬","紫菜蛋花汤","东北大米饭"]', '含水果: 香蕉', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', '11:30 - 13:00'),
  (current_date, 'dinner', '["家常豆腐","清蒸鱼","紫米粥","时令蔬菜"]', '清淡晚餐，健康生活', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600', '17:30 - 18:30');
