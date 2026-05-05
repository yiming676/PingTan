-- Clean up Supabase Advisor WARN findings without dropping unused indexes.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
$$;

create or replace function private.can_manage_canteen()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_user_role() in ('canteen_admin', 'super_admin'), false)
$$;

create or replace function private.can_manage_repair()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_user_role() in ('repair_admin', 'super_admin'), false)
$$;

create or replace function private.can_manage_notifications()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_user_role() in ('canteen_admin', 'repair_admin', 'super_admin'), false)
$$;

create or replace function private.can_manage_users()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_user_role() = 'super_admin', false)
$$;

create or replace function private.super_admin_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
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

grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.can_manage_canteen() to authenticated, service_role;
grant execute on function private.can_manage_repair() to authenticated, service_role;
grant execute on function private.can_manage_notifications() to authenticated, service_role;
grant execute on function private.can_manage_users() to authenticated, service_role;
grant execute on function private.super_admin_user_id() to authenticated, service_role;

revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.can_manage_canteen() from public, anon, authenticated;
revoke all on function public.can_manage_repair() from public, anon, authenticated;
revoke all on function public.can_manage_notifications() from public, anon, authenticated;
revoke all on function public.can_manage_users() from public, anon, authenticated;
revoke all on function public.resolve_login_email(text) from public, anon, authenticated;

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  owner_id uuid;
  normalized_phone text;
begin
  owner_id := private.super_admin_user_id();

  if new.id = owner_id and new.role <> 'super_admin' then
    raise exception 'The owner account must remain super_admin';
  end if;

  if new.id <> owner_id and new.role = 'super_admin' then
    raise exception 'Only the owner account can be super_admin';
  end if;

  if coalesce(auth.role(), '') <> 'service_role' and not private.can_manage_users() then
    if new.role is distinct from old.role then
      raise exception 'Only super admins can change user roles';
    end if;

    if new.email is distinct from old.email then
      raise exception 'Email cannot be changed after registration';
    end if;
  end if;

  if new.name is distinct from old.name then
    if nullif(trim(new.name), '') is null then
      raise exception 'Name cannot be empty';
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(trim(p.name)) = lower(trim(new.name))
    ) then
      raise exception 'Name is already used by another account';
    end if;
  end if;

  if new.phone is distinct from old.phone then
    normalized_phone := public.normalize_phone_digits(new.phone);

    if normalized_phone <> '' and normalized_phone !~ '^1[0-9]{10}$' then
      raise exception 'Phone number must be 11 digits';
    end if;

    if normalized_phone <> '' and exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and public.normalize_phone_digits(p.phone) = normalized_phone
    ) then
      raise exception 'Phone number is already bound to another account';
    end if;

    new.phone := nullif(normalized_phone, '');
  end if;

  return new;
end;
$$;

create or replace function public.protect_meal_booking_write()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  current_status text;
begin
  if private.can_manage_canteen() then
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

  select m.booking_status
    into current_status
  from public.meal_menus m
  where m.id = new.menu_id;

  if current_status is distinct from 'open' then
    raise exception 'Meal booking is closed';
  end if;

  return new;
end;
$$;

create or replace function public.unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path = ''
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
security invoker
set search_path = ''
as $$
  insert into public.notification_reads (user_id, notification_id, read_at)
  select (select auth.uid()), n.id, now()
  from public.notifications n
  where n.id = any(notification_ids)
    and (n.target_user_id is null or n.target_user_id = (select auth.uid()))
  on conflict (user_id, notification_id)
  do update set read_at = excluded.read_at
$$;

create or replace function public.update_own_profile(profile_name text, profile_phone text)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_phone text;
  updated_profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in first';
  end if;

  if nullif(trim(profile_name), '') is null then
    raise exception 'Name cannot be empty';
  end if;

  normalized_phone := public.normalize_phone_digits(profile_phone);

  update public.profiles
  set name = trim(profile_name),
      phone = nullif(normalized_phone, '')
  where id = (select auth.uid())
  returning * into updated_profile;

  return updated_profile;
end;
$$;

revoke all on function public.unread_notification_count() from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.update_own_profile(text, text) from public, anon;
grant execute on function public.unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.update_own_profile(text, text) to authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Managers can view all profiles" on public.profiles;
drop policy if exists "Users can update own editable profile" on public.profiles;
drop policy if exists "Super admins can update all profiles" on public.profiles;

create policy "Profiles are viewable by owner or managers"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or private.can_manage_users()
    or private.can_manage_notifications()
    or private.can_manage_canteen()
    or private.can_manage_repair()
  );

create policy "Profiles are updateable by owner or super admins"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id or private.can_manage_users())
  with check ((select auth.uid()) = id or private.can_manage_users());

drop policy if exists "Canteen admins can insert menus" on public.meal_menus;
drop policy if exists "Canteen admins can update menus" on public.meal_menus;
drop policy if exists "Canteen admins can delete menus" on public.meal_menus;

create policy "Canteen admins can insert menus"
  on public.meal_menus for insert
  to authenticated
  with check (private.can_manage_canteen());

create policy "Canteen admins can update menus"
  on public.meal_menus for update
  to authenticated
  using (private.can_manage_canteen())
  with check (private.can_manage_canteen());

create policy "Canteen admins can delete menus"
  on public.meal_menus for delete
  to authenticated
  using (private.can_manage_canteen());

drop policy if exists "Users can view own bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can view all bookings" on public.meal_bookings;
drop policy if exists "Users can update own bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can update all bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can delete bookings" on public.meal_bookings;

create policy "Bookings are viewable by owner or canteen admins"
  on public.meal_bookings for select
  to authenticated
  using ((select auth.uid()) = user_id or private.can_manage_canteen());

create policy "Users can update own bookings or canteen admins can update all"
  on public.meal_bookings for update
  to authenticated
  using ((select auth.uid()) = user_id or private.can_manage_canteen())
  with check ((select auth.uid()) = user_id or private.can_manage_canteen());

create policy "Canteen admins can delete bookings"
  on public.meal_bookings for delete
  to authenticated
  using (private.can_manage_canteen());

drop policy if exists "Users can view own tickets" on public.repair_tickets;
drop policy if exists "Repair admins can view all tickets" on public.repair_tickets;
drop policy if exists "Repair admins can update all tickets" on public.repair_tickets;

create policy "Tickets are viewable by owner or repair admins"
  on public.repair_tickets for select
  to authenticated
  using ((select auth.uid()) = user_id or private.can_manage_repair());

create policy "Repair admins can update all tickets"
  on public.repair_tickets for update
  to authenticated
  using (private.can_manage_repair())
  with check (private.can_manage_repair());

drop policy if exists "Users can view own ticket images" on public.repair_images;
drop policy if exists "Repair admins can view all images" on public.repair_images;
drop policy if exists "Users can delete own ticket images" on public.repair_images;
drop policy if exists "Repair admins can delete all images" on public.repair_images;

create policy "Images are viewable by ticket owner or repair admins"
  on public.repair_images for select
  to authenticated
  using (
    private.can_manage_repair()
    or exists (
      select 1
      from public.repair_tickets t
      where t.id = ticket_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "Images are deletable by ticket owner or repair admins"
  on public.repair_images for delete
  to authenticated
  using (
    private.can_manage_repair()
    or exists (
      select 1
      from public.repair_tickets t
      where t.id = ticket_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view relevant notifications" on public.notifications;
drop policy if exists "Notification admins can view all notifications" on public.notifications;
drop policy if exists "Notification admins can insert notifications" on public.notifications;
drop policy if exists "Notification admins can update notifications" on public.notifications;
drop policy if exists "Notification admins can delete notifications" on public.notifications;

create policy "Notifications are viewable by target users or notification admins"
  on public.notifications for select
  to authenticated
  using (
    private.can_manage_notifications()
    or target_user_id is null
    or target_user_id = (select auth.uid())
  );

create policy "Notification admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (private.can_manage_notifications());

create policy "Notification admins can update notifications"
  on public.notifications for update
  to authenticated
  using (private.can_manage_notifications())
  with check (private.can_manage_notifications());

create policy "Notification admins can delete notifications"
  on public.notifications for delete
  to authenticated
  using (private.can_manage_notifications());

drop policy if exists "Users can delete own repair images" on storage.objects;
drop policy if exists "Repair admins can delete repair images" on storage.objects;
drop policy if exists "Canteen admins can upload menu images" on storage.objects;
drop policy if exists "Canteen admins can update menu images" on storage.objects;
drop policy if exists "Canteen admins can delete menu images" on storage.objects;

create policy "Repair images are deletable by owner or repair admins"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'repair-images'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or private.can_manage_repair()
    )
  );

create policy "Canteen admins can upload menu images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'menu-images'
    and private.can_manage_canteen()
  );

create policy "Canteen admins can update menu images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'menu-images'
    and private.can_manage_canteen()
  )
  with check (
    bucket_id = 'menu-images'
    and private.can_manage_canteen()
  );

create policy "Canteen admins can delete menu images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'menu-images'
    and private.can_manage_canteen()
  );
