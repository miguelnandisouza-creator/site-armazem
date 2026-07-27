create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, store_id, role, full_name)
  values (
    new.id,
    (select id from public.stores where slug = 'armazem-parada-obrigatoria'),
    case when lower(new.email) = 'miguelnandisouza@gmail.com' then 'admin'::public.user_role else 'customer'::public.user_role end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    role = case when lower(new.email) = 'miguelnandisouza@gmail.com' then 'admin'::public.user_role else public.profiles.role end,
    store_id = excluded.store_id;
  return new;
end;
$$;

insert into public.profiles (id, store_id, role, full_name)
select id, (select id from public.stores where slug = 'armazem-parada-obrigatoria'), 'admin'::public.user_role, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
where lower(email) = 'miguelnandisouza@gmail.com'
on conflict (id) do update set role = 'admin'::public.user_role, store_id = excluded.store_id;
