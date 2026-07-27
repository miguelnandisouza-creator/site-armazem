create type public.user_role as enum ('admin', 'customer', 'manager', 'employee', 'cashier');
create type public.product_status as enum ('draft', 'active', 'archived');

create table public.stores (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, store_id uuid references public.stores(id) on delete set null,
  role public.user_role not null default 'customer', full_name text, created_at timestamptz not null default now()
);
insert into public.stores (name, slug) values ('Armazém Parada Obrigatória', 'armazem-parada-obrigatoria');

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, store_id, role, full_name)
  values (
    new.id,
    (select id from public.stores where slug = 'armazem-parada-obrigatoria'),
    case when lower(new.email) = 'teste@gmail.com' then 'admin'::public.user_role else 'customer'::public.user_role end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create table public.categories (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  name text not null, slug text not null, image_url text, unique(store_id, slug)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, name text not null, brand text, ean text,
  description text, price_cents integer not null check (price_cents >= 0), sale_price_cents integer check (sale_price_cents >= 0),
  status public.product_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(store_id, ean), check (sale_price_cents is null or sale_price_cents <= price_cents)
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  url text not null, alt_text text, position smallint not null default 0
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz not null,
  created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table public.favorites (user_id uuid references public.profiles(id) on delete cascade, product_id uuid references public.products(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id, product_id));
create table public.shopping_list_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, product_id uuid references public.products(id) on delete cascade, label text, quantity numeric not null default 1, checked boolean not null default false, created_at timestamptz not null default now(), check (product_id is not null or label is not null));

create index products_store_status_idx on public.products(store_id, status);
create index products_category_idx on public.products(category_id);
create index promotions_active_idx on public.promotions(store_id, starts_at, ends_at);

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.promotions enable row level security;
alter table public.favorites enable row level security;
alter table public.shopping_list_items enable row level security;

create function public.is_staff_of(target_store uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id = auth.uid() and store_id = target_store and role in ('admin','manager','employee')) $$;
create policy "public reads active products" on public.products for select using (status = 'active' or public.is_staff_of(store_id));
create policy "staff manages products" on public.products for all using (public.is_staff_of(store_id)) with check (public.is_staff_of(store_id));
create policy "public reads categories" on public.categories for select using (true);
create policy "staff manages categories" on public.categories for all using (public.is_staff_of(store_id)) with check (public.is_staff_of(store_id));
create policy "own profile" on public.profiles for select using (id = auth.uid());
create policy "own favorites" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own shopping list" on public.shopping_list_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public reads images" on public.product_images for select using (true);
create policy "staff manages images" on public.product_images for all using (exists(select 1 from public.products p where p.id = product_id and public.is_staff_of(p.store_id))) with check (exists(select 1 from public.products p where p.id = product_id and public.is_staff_of(p.store_id)));
create policy "public reads promotions" on public.promotions for select using (true);
create policy "staff manages promotions" on public.promotions for all using (public.is_staff_of(store_id)) with check (public.is_staff_of(store_id));
