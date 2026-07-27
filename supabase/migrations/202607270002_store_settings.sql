alter table public.stores
  add column if not exists whatsapp text,
  add column if not exists address text,
  add column if not exists open_time time not null default '08:00',
  add column if not exists close_time time not null default '21:00';

drop policy if exists "staff manages store settings" on public.stores;
create policy "staff manages store settings"
on public.stores
for update
to authenticated
using (public.is_staff_of(id))
with check (public.is_staff_of(id));

grant update on public.stores to authenticated;
