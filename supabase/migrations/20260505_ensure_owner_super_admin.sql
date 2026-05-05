-- Re-assert the configured owner account as the single super admin.

with owner_profile as (
  select p.id
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(coalesce(u.email, p.email, '')) = '467124450@qq.com'
     or public.normalize_phone_digits(p.phone) = '15359150175'
     or lower(trim(p.name)) = 'yiming'
  order by p.created_at
  limit 1
)
update public.profiles p
set role = 'teacher'
where p.role = 'super_admin'
  and not exists (
    select 1
    from owner_profile owner
    where owner.id = p.id
  );

with owner_profile as (
  select p.id, u.email as auth_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(coalesce(u.email, p.email, '')) = '467124450@qq.com'
     or public.normalize_phone_digits(p.phone) = '15359150175'
     or lower(trim(p.name)) = 'yiming'
  order by p.created_at
  limit 1
)
update public.profiles p
set role = 'super_admin',
    email = coalesce(p.email, owner.auth_email),
    phone = coalesce(nullif(p.phone, ''), '15359150175')
from owner_profile owner
where p.id = owner.id;
