-- Profile edit validation, notification read receipts, and repair image realtime support.
-- Non-destructive: existing duplicate phone data is allowed until users edit their own profile.

create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists "Users can view own notification reads" on public.notification_reads;
drop policy if exists "Users can insert own notification reads" on public.notification_reads;
drop policy if exists "Users can update own notification reads" on public.notification_reads;

create policy "Users can view own notification reads"
  on public.notification_reads for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own notification reads"
  on public.notification_reads for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own notification reads"
  on public.notification_reads for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists notification_reads_notification_id_idx
  on public.notification_reads(notification_id);

create index if not exists notifications_created_target_idx
  on public.notifications(created_at desc, target_user_id);

create or replace function public.unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications n
  where (n.target_user_id is null or n.target_user_id = (select auth.uid()))
    and not exists (
      select 1
      from public.notification_reads r
      where r.notification_id = n.id
        and r.user_id = (select auth.uid())
    )
$$;

create or replace function public.mark_notifications_read(notification_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification_reads (user_id, notification_id, read_at)
  select (select auth.uid()), n.id, now()
  from public.notifications n
  where n.id = any(notification_ids)
    and (n.target_user_id is null or n.target_user_id = (select auth.uid()))
  on conflict (user_id, notification_id)
  do update set read_at = excluded.read_at
$$;

grant execute on function public.unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create or replace function public.update_own_profile(profile_name text, profile_phone text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
  updated_profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception '请先登录';
  end if;

  if nullif(trim(profile_name), '') is null then
    raise exception '用户名不能为空';
  end if;

  normalized_phone := public.normalize_phone_digits(profile_phone);

  if normalized_phone <> '' and normalized_phone !~ '^1[0-9]{10}$' then
    raise exception '请输入有效的 11 位手机号';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id <> (select auth.uid())
      and lower(trim(p.name)) = lower(trim(profile_name))
  ) then
    raise exception '该用户名已被其他账号使用';
  end if;

  if normalized_phone <> '' and exists (
    select 1
    from public.profiles p
    where p.id <> (select auth.uid())
      and public.normalize_phone_digits(p.phone) = normalized_phone
  ) then
    raise exception '该手机号已绑定其他账号';
  end if;

  update public.profiles
  set name = trim(profile_name),
      phone = nullif(normalized_phone, '')
  where id = (select auth.uid())
  returning * into updated_profile;

  return updated_profile;
end;
$$;

grant execute on function public.update_own_profile(text, text) to authenticated;

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  normalized_phone text;
begin
  owner_id := public.super_admin_user_id();

  if new.id = owner_id and new.role <> 'super_admin' then
    raise exception 'The owner account must remain super_admin';
  end if;

  if new.id <> owner_id and new.role = 'super_admin' then
    raise exception 'Only the owner account can be super_admin';
  end if;

  if not public.can_manage_users() then
    if new.role is distinct from old.role then
      raise exception 'Only super admins can change user roles';
    end if;

    if new.email is distinct from old.email then
      raise exception '邮箱注册后不可自行修改';
    end if;
  end if;

  if new.name is distinct from old.name then
    if nullif(trim(new.name), '') is null then
      raise exception '用户名不能为空';
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(trim(p.name)) = lower(trim(new.name))
    ) then
      raise exception '该用户名已被其他账号使用';
    end if;
  end if;

  if new.phone is distinct from old.phone then
    normalized_phone := public.normalize_phone_digits(new.phone);

    if normalized_phone <> '' and normalized_phone !~ '^1[0-9]{10}$' then
      raise exception '请输入有效的 11 位手机号';
    end if;

    if normalized_phone <> '' and exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and public.normalize_phone_digits(p.phone) = normalized_phone
    ) then
      raise exception '该手机号已绑定其他账号';
    end if;

    new.phone := nullif(normalized_phone, '');
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['notifications', 'notification_reads', 'repair_images']
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
