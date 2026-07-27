alter table public.profiles
  add column if not exists email text,
  add column if not exists active boolean not null default true;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, store_id, role, full_name, email, active)
  values (
    new.id,
    (select id from public.stores where slug = 'armazem-parada-obrigatoria' limit 1),
    'customer'::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    lower(new.email),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

create or replace function public.is_admin_of(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and store_id = target_store
      and role = 'admin'
      and active = true
  );
$$;

create or replace function public.is_staff_of(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and store_id = target_store
      and role in ('admin', 'manager', 'employee')
      and active = true
  );
$$;

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin_of(store_id))
with check (public.is_admin_of(store_id));

grant select, update on public.profiles to authenticated;
