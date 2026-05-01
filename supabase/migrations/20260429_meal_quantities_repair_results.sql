-- Add meal item quantities, repair completion results, and all-admin notification permissions.
-- Non-destructive: preserves existing menus, bookings, tickets, and notifications.

alter table public.meal_bookings
  add column if not exists selected_items jsonb not null default '[]'::jsonb;

alter table public.repair_tickets
  add column if not exists result_text text,
  add column if not exists result_image_url text,
  add column if not exists result_image_path text,
  add column if not exists completed_at timestamptz;

create or replace function public.can_manage_notifications()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('canteen_admin', 'repair_admin', 'super_admin'), false)
$$;

grant execute on function public.can_manage_notifications() to authenticated;

drop policy if exists "Notification admins can view all notifications" on public.notifications;
drop policy if exists "Notification admins can insert notifications" on public.notifications;
drop policy if exists "Notification admins can update notifications" on public.notifications;
drop policy if exists "Notification admins can delete notifications" on public.notifications;

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

create index if not exists meal_bookings_selected_items_gin_idx
  on public.meal_bookings using gin (selected_items);

create index if not exists repair_tickets_completed_at_idx
  on public.repair_tickets(completed_at desc)
  where completed_at is not null;
