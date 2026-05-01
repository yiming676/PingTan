-- PingTan Smart Campus launch hardening migration.
-- Non-destructive: keeps existing auth users, profiles, menus, bookings and tickets.

create extension if not exists "uuid-ossp";

alter table public.profiles add column if not exists email text;
alter table public.profiles alter column phone drop not null;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

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

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;
end $$;

update public.profiles
set role = 'teacher'
where role not in ('teacher', 'canteen_admin', 'repair_admin', 'super_admin');

update public.profiles p
set role = 'super_admin',
    email = coalesce(p.email, u.email),
    phone = coalesce(nullif(p.phone, ''), '15359150175')
from auth.users u
where p.id = u.id
  and (
    lower(u.email) = '467124450@qq.com'
    or public.normalize_phone_digits(p.phone) = '15359150175'
    or lower(p.name) = 'yiming'
  );

update public.profiles p
set role = 'teacher'
where p.role = 'super_admin'
  and not exists (
    select 1
    from auth.users u
    where u.id = p.id
      and (
        lower(u.email) = '467124450@qq.com'
        or public.normalize_phone_digits(p.phone) = '15359150175'
        or lower(p.name) = 'yiming'
      )
  );

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('teacher', 'canteen_admin', 'repair_admin', 'super_admin'));

create unique index if not exists profiles_email_lower_key
  on public.profiles (lower(email))
  where email is not null;

create index if not exists profiles_phone_digits_idx
  on public.profiles (public.normalize_phone_digits(phone))
  where phone is not null and phone <> '';

create unique index if not exists profiles_single_super_admin_idx
  on public.profiles ((role))
  where role = 'super_admin';

create or replace function public.super_admin_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(coalesce(u.email, p.email)) = '467124450@qq.com'
     or public.normalize_phone_digits(p.phone) = '15359150175'
     or lower(p.name) = 'yiming'
  order by p.created_at
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
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
  select coalesce(public.current_user_role() = 'super_admin', false)
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
  where lower(coalesce(p.email, u.email)) = lower(trim(login_identifier))
     or lower(u.email) = lower(trim(login_identifier))
     or (
       public.normalize_phone_digits(login_identifier) <> ''
       and public.normalize_phone_digits(p.phone) = public.normalize_phone_digits(login_identifier)
     )
  order by p.created_at
  limit 1
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_phone text;
begin
  metadata_phone := nullif(new.raw_user_meta_data ->> 'phone', '');

  insert into public.profiles (id, name, email, phone, teacher_no, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), '新用户'),
    coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
    metadata_phone,
    nullif(new.raw_user_meta_data ->> 'teacher_no', ''),
    'teacher'
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      phone = coalesce(public.profiles.phone, excluded.phone),
      teacher_no = coalesce(public.profiles.teacher_no, excluded.teacher_no);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
grant execute on function public.normalize_phone_digits(text) to anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_manage_canteen() to authenticated;
grant execute on function public.can_manage_repair() to authenticated;
grant execute on function public.can_manage_notifications() to authenticated;
grant execute on function public.can_manage_users() to authenticated;

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  owner_id := public.super_admin_user_id();

  if new.id = owner_id and new.role <> 'super_admin' then
    raise exception 'The owner account must remain super_admin';
  end if;

  if new.id <> owner_id and new.role = 'super_admin' then
    raise exception 'Only the owner account can be super_admin';
  end if;

  if not public.can_manage_users() and new.role is distinct from old.role then
    raise exception 'Only super admins can change user roles';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_update on public.profiles;
create trigger protect_profile_update
  before update on public.profiles
  for each row execute function public.protect_profile_update();

alter table public.meal_menus add column if not exists booking_status text not null default 'open';
alter table public.meal_menus add column if not exists image_path text;
alter table public.meal_menus add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.meal_menus'::regclass
      and conname = 'meal_menus_booking_status_check'
  ) then
    alter table public.meal_menus
      add constraint meal_menus_booking_status_check
      check (booking_status in ('open', 'closed'));
  end if;
end $$;

alter table public.meal_bookings add column if not exists updated_at timestamptz not null default now();
update public.meal_bookings set updated_at = created_at where updated_at is null;

alter table public.repair_images add column if not exists storage_path text;
update public.repair_images set storage_path = image_url where storage_path is null;
alter table public.repair_images alter column storage_path set not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_meal_menus_updated_at on public.meal_menus;
create trigger touch_meal_menus_updated_at
  before update on public.meal_menus
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_meal_bookings_updated_at on public.meal_bookings;
create trigger touch_meal_bookings_updated_at
  before update on public.meal_bookings
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_repair_tickets_updated_at on public.repair_tickets;
create trigger touch_repair_tickets_updated_at
  before update on public.repair_tickets
  for each row execute function public.touch_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.meal_bookings'::regclass
      and conname = 'meal_bookings_user_id_profiles_fkey'
  ) then
    alter table public.meal_bookings
      add constraint meal_bookings_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
    alter table public.meal_bookings validate constraint meal_bookings_user_id_profiles_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.repair_tickets'::regclass
      and conname = 'repair_tickets_user_id_profiles_fkey'
  ) then
    alter table public.repair_tickets
      add constraint repair_tickets_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
    alter table public.repair_tickets validate constraint repair_tickets_user_id_profiles_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_target_user_id_profiles_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_target_user_id_profiles_fkey
      foreign key (target_user_id) references public.profiles(id) on delete cascade not valid;
    alter table public.notifications validate constraint notifications_target_user_id_profiles_fkey;
  end if;
end $$;

create index if not exists meal_bookings_menu_id_idx on public.meal_bookings(menu_id);
create index if not exists meal_bookings_user_id_idx on public.meal_bookings(user_id);
create index if not exists meal_bookings_date_meal_type_idx on public.meal_bookings(date, meal_type);
create index if not exists repair_tickets_user_id_idx on public.repair_tickets(user_id);
create index if not exists repair_tickets_status_created_at_idx on public.repair_tickets(status, created_at desc);
create index if not exists repair_images_ticket_id_idx on public.repair_images(ticket_id);
create index if not exists notifications_target_user_id_idx on public.notifications(target_user_id);

create or replace function public.protect_meal_booking_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  if public.can_manage_canteen() then
    return new;
  end if;

  if new.user_id <> (select auth.uid()) then
    raise exception 'Users can only change their own meal bookings';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id
      or new.menu_id <> old.menu_id
      or new.date <> old.date
      or new.meal_type <> old.meal_type then
      raise exception 'Meal booking ownership and meal slot cannot be changed';
    end if;
  end if;

  if tg_op = 'INSERT'
    or (tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'booked') then
    select m.booking_status
    into current_status
    from public.meal_menus m
    where m.id = new.menu_id
      and m.date = new.date
      and m.meal_type = new.meal_type;

    if current_status is null then
      raise exception '该餐次还没有菜单，暂不能报饭';
    end if;

    if current_status <> 'open' then
      raise exception '该餐次已截止报饭';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_meal_booking_write on public.meal_bookings;
create trigger protect_meal_booking_write
  before insert or update on public.meal_bookings
  for each row execute function public.protect_meal_booking_write();

drop policy if exists "Admin can view all profiles" on public.profiles;
drop policy if exists "Managers can view all profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own editable profile" on public.profiles;
drop policy if exists "Super admins can update all profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Managers can view all profiles"
  on public.profiles for select
  using (
    public.can_manage_users()
    or public.can_manage_canteen()
    or public.can_manage_repair()
    or public.can_manage_notifications()
  );

create policy "Users can update own editable profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Super admins can update all profiles"
  on public.profiles for update
  using (public.can_manage_users())
  with check (public.can_manage_users());

drop policy if exists "Admin can insert menus" on public.meal_menus;
drop policy if exists "Admin can update menus" on public.meal_menus;
drop policy if exists "Canteen admins can insert menus" on public.meal_menus;
drop policy if exists "Canteen admins can update menus" on public.meal_menus;
drop policy if exists "Canteen admins can delete menus" on public.meal_menus;
drop policy if exists "Authenticated users can view menus" on public.meal_menus;

create policy "Authenticated users can view menus"
  on public.meal_menus for select
  using ((select auth.role()) = 'authenticated');

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

drop policy if exists "Admin can view all bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can view all bookings" on public.meal_bookings;
drop policy if exists "Users can view own bookings" on public.meal_bookings;
drop policy if exists "Users can insert own bookings" on public.meal_bookings;
drop policy if exists "Users can update own bookings" on public.meal_bookings;
drop policy if exists "Users can delete own bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can update all bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can delete bookings" on public.meal_bookings;

create policy "Users can view own bookings"
  on public.meal_bookings for select
  using ((select auth.uid()) = user_id);

create policy "Canteen admins can view all bookings"
  on public.meal_bookings for select
  using (public.can_manage_canteen());

create policy "Users can insert own bookings"
  on public.meal_bookings for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own bookings"
  on public.meal_bookings for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Canteen admins can update all bookings"
  on public.meal_bookings for update
  using (public.can_manage_canteen())
  with check (public.can_manage_canteen());

create policy "Canteen admins can delete bookings"
  on public.meal_bookings for delete
  using (public.can_manage_canteen());

drop policy if exists "Admin can view all tickets" on public.repair_tickets;
drop policy if exists "Admin can update all tickets" on public.repair_tickets;
drop policy if exists "Repair admins can view all tickets" on public.repair_tickets;
drop policy if exists "Repair admins can update all tickets" on public.repair_tickets;
drop policy if exists "Users can view own tickets" on public.repair_tickets;
drop policy if exists "Users can insert own tickets" on public.repair_tickets;
drop policy if exists "Users can update own tickets" on public.repair_tickets;

create policy "Users can view own tickets"
  on public.repair_tickets for select
  using ((select auth.uid()) = user_id);

create policy "Repair admins can view all tickets"
  on public.repair_tickets for select
  using (public.can_manage_repair());

create policy "Users can insert own tickets"
  on public.repair_tickets for insert
  with check ((select auth.uid()) = user_id);

create policy "Repair admins can update all tickets"
  on public.repair_tickets for update
  using (public.can_manage_repair())
  with check (public.can_manage_repair());

drop policy if exists "Admin can view all images" on public.repair_images;
drop policy if exists "Repair admins can view all images" on public.repair_images;
drop policy if exists "Repair admins can delete all images" on public.repair_images;
drop policy if exists "Users can view own ticket images" on public.repair_images;
drop policy if exists "Users can insert own ticket images" on public.repair_images;
drop policy if exists "Users can delete own ticket images" on public.repair_images;

create policy "Users can view own ticket images"
  on public.repair_images for select
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
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
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own ticket images"
  on public.repair_images for delete
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );

create policy "Repair admins can delete all images"
  on public.repair_images for delete
  using (public.can_manage_repair());

drop policy if exists "Notification admins can view all notifications" on public.notifications;
drop policy if exists "Notification admins can insert notifications" on public.notifications;
drop policy if exists "Notification admins can update notifications" on public.notifications;
drop policy if exists "Notification admins can delete notifications" on public.notifications;
drop policy if exists "Users can view relevant notifications" on public.notifications;

create policy "Users can view relevant notifications"
  on public.notifications for select
  using (
    (select auth.role()) = 'authenticated'
    and (target_user_id is null or target_user_id = (select auth.uid()))
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

insert into storage.buckets (id, name, public)
values
  ('repair-images', 'repair-images', true),
  ('avatars', 'avatars', true),
  ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view repair images" on storage.objects;
drop policy if exists "Authenticated users can upload repair images" on storage.objects;
drop policy if exists "Users can delete own repair images" on storage.objects;
drop policy if exists "Repair admins can delete repair images" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Authenticated users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;
drop policy if exists "Canteen admins can upload menu images" on storage.objects;
drop policy if exists "Canteen admins can update menu images" on storage.objects;
drop policy if exists "Canteen admins can delete menu images" on storage.objects;

create policy "Authenticated users can upload repair images"
  on storage.objects for insert
  with check (
    bucket_id = 'repair-images'
    and (select auth.role()) = 'authenticated'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own repair images"
  on storage.objects for delete
  using (
    bucket_id = 'repair-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
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
    and (select auth.role()) = 'authenticated'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Authenticated users can update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Canteen admins can upload menu images"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and public.can_manage_canteen()
  );

create policy "Canteen admins can update menu images"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and public.can_manage_canteen()
  )
  with check (
    bucket_id = 'menu-images'
    and public.can_manage_canteen()
  );

create policy "Canteen admins can delete menu images"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and public.can_manage_canteen()
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array['meal_bookings', 'meal_menus', 'repair_tickets', 'repair_images']
  loop
    if not exists (
      select 1
      from pg_publication p
      join pg_publication_rel pr on pr.prpubid = p.oid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
