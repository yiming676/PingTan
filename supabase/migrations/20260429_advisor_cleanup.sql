-- Advisor cleanup after launch hardening.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.protect_profile_update() from public, anon, authenticated;
revoke all on function public.protect_meal_booking_write() from public, anon, authenticated;
revoke all on function public.super_admin_user_id() from public, anon, authenticated;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.can_manage_canteen() from public, anon;
revoke all on function public.can_manage_repair() from public, anon;
revoke all on function public.can_manage_notifications() from public, anon;
revoke all on function public.can_manage_users() from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_manage_canteen() to authenticated;
grant execute on function public.can_manage_repair() to authenticated;
grant execute on function public.can_manage_notifications() to authenticated;
grant execute on function public.can_manage_users() to authenticated;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
