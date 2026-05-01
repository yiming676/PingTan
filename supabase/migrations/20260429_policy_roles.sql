-- Scope application RLS policies to authenticated users explicitly.

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Managers can view all profiles" on public.profiles;
drop policy if exists "Users can update own editable profile" on public.profiles;
drop policy if exists "Super admins can update all profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Managers can view all profiles"
  on public.profiles for select
  to authenticated
  using (
    public.can_manage_users()
    or public.can_manage_canteen()
    or public.can_manage_repair()
    or public.can_manage_notifications()
  );

create policy "Users can update own editable profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Super admins can update all profiles"
  on public.profiles for update
  to authenticated
  using (public.can_manage_users())
  with check (public.can_manage_users());

drop policy if exists "Authenticated users can view menus" on public.meal_menus;
drop policy if exists "Canteen admins can insert menus" on public.meal_menus;
drop policy if exists "Canteen admins can update menus" on public.meal_menus;
drop policy if exists "Canteen admins can delete menus" on public.meal_menus;

create policy "Authenticated users can view menus"
  on public.meal_menus for select
  to authenticated
  using (true);

create policy "Canteen admins can insert menus"
  on public.meal_menus for insert
  to authenticated
  with check (public.can_manage_canteen());

create policy "Canteen admins can update menus"
  on public.meal_menus for update
  to authenticated
  using (public.can_manage_canteen())
  with check (public.can_manage_canteen());

create policy "Canteen admins can delete menus"
  on public.meal_menus for delete
  to authenticated
  using (public.can_manage_canteen());

drop policy if exists "Users can view own bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can view all bookings" on public.meal_bookings;
drop policy if exists "Users can insert own bookings" on public.meal_bookings;
drop policy if exists "Users can update own bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can update all bookings" on public.meal_bookings;
drop policy if exists "Canteen admins can delete bookings" on public.meal_bookings;

create policy "Users can view own bookings"
  on public.meal_bookings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Canteen admins can view all bookings"
  on public.meal_bookings for select
  to authenticated
  using (public.can_manage_canteen());

create policy "Users can insert own bookings"
  on public.meal_bookings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own bookings"
  on public.meal_bookings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Canteen admins can update all bookings"
  on public.meal_bookings for update
  to authenticated
  using (public.can_manage_canteen())
  with check (public.can_manage_canteen());

create policy "Canteen admins can delete bookings"
  on public.meal_bookings for delete
  to authenticated
  using (public.can_manage_canteen());

drop policy if exists "Users can view own tickets" on public.repair_tickets;
drop policy if exists "Repair admins can view all tickets" on public.repair_tickets;
drop policy if exists "Users can insert own tickets" on public.repair_tickets;
drop policy if exists "Repair admins can update all tickets" on public.repair_tickets;

create policy "Users can view own tickets"
  on public.repair_tickets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Repair admins can view all tickets"
  on public.repair_tickets for select
  to authenticated
  using (public.can_manage_repair());

create policy "Users can insert own tickets"
  on public.repair_tickets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Repair admins can update all tickets"
  on public.repair_tickets for update
  to authenticated
  using (public.can_manage_repair())
  with check (public.can_manage_repair());

drop policy if exists "Users can view own ticket images" on public.repair_images;
drop policy if exists "Repair admins can view all images" on public.repair_images;
drop policy if exists "Users can insert own ticket images" on public.repair_images;
drop policy if exists "Users can delete own ticket images" on public.repair_images;
drop policy if exists "Repair admins can delete all images" on public.repair_images;

create policy "Users can view own ticket images"
  on public.repair_images for select
  to authenticated
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );

create policy "Repair admins can view all images"
  on public.repair_images for select
  to authenticated
  using (public.can_manage_repair());

create policy "Users can insert own ticket images"
  on public.repair_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own ticket images"
  on public.repair_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.repair_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );

create policy "Repair admins can delete all images"
  on public.repair_images for delete
  to authenticated
  using (public.can_manage_repair());

drop policy if exists "Users can view relevant notifications" on public.notifications;
drop policy if exists "Notification admins can view all notifications" on public.notifications;
drop policy if exists "Notification admins can insert notifications" on public.notifications;
drop policy if exists "Notification admins can update notifications" on public.notifications;
drop policy if exists "Notification admins can delete notifications" on public.notifications;

create policy "Users can view relevant notifications"
  on public.notifications for select
  to authenticated
  using (target_user_id is null or target_user_id = (select auth.uid()));

create policy "Notification admins can view all notifications"
  on public.notifications for select
  to authenticated
  using (public.can_manage_notifications());

create policy "Notification admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.can_manage_notifications());

create policy "Notification admins can update notifications"
  on public.notifications for update
  to authenticated
  using (public.can_manage_notifications())
  with check (public.can_manage_notifications());

create policy "Notification admins can delete notifications"
  on public.notifications for delete
  to authenticated
  using (public.can_manage_notifications());
