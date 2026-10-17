begin;

-- No catalog publication or Storage objects in phase 1.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.valid_options(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare g jsonb; option_value jsonb; group_ids text[] := '{}'; option_values text[]; option_key text; is_color boolean;
begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  for g in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(g) is distinct from 'object'
      or jsonb_typeof(g->'id') is distinct from 'string'
      or (g->>'id') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$'
      or (g->>'id') = any(group_ids)
      or jsonb_typeof(g->'label') is distinct from 'string' or btrim(g->>'label') = ''
      or jsonb_typeof(g->'options') is distinct from 'array' then return false; end if;
    if exists(select 1 from jsonb_object_keys(g) as k where k not in ('id','label','options')) then return false; end if;
    if jsonb_array_length(g->'options') = 0 then return false; end if;
    group_ids := array_append(group_ids,g->>'id'); option_values := '{}';
    is_color := lower(g->>'id') = 'color' or translate(lower(g->>'label'),'áéíóúü','aeiouu') in ('color','colores');
    for option_value in select * from jsonb_array_elements(g->'options') loop
      option_key := option_value #>> '{}';
      if is_color then option_key := lower(regexp_replace(option_key,'^[[:space:]]+|[[:space:]]+$','','g')); end if;
      if jsonb_typeof(option_value) is distinct from 'string'
        or btrim(option_value #>> '{}') = '' or option_key = any(option_values) then return false; end if;
      option_values := array_append(option_values,option_key);
    end loop;
  end loop;
  return true;
end;
$$;

create function private.valid_catalog_data(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; item jsonb;
begin
  if jsonb_typeof(value) is distinct from 'object' then return false; end if;
  for k,v in select * from jsonb_each(value) loop
    if k = any(array['category','short','description','pricePrefix','image','mediaMode','imagePosition','imageFit','badge','layout']) then
      if jsonb_typeof(v) is distinct from 'string' then return false; end if;
    elsif k = any(array['gallery','images','imageLabels','tags']) then
      if jsonb_typeof(v) is distinct from 'array' then return false; end if;
      for item in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(item) is distinct from 'string' or btrim(item #>> '{}') = '' then return false; end if;
      end loop;
    elsif k = any(array['featured','offer']) then
      if jsonb_typeof(v) is distinct from 'boolean' then return false; end if;
    elsif k = 'order' then
      if jsonb_typeof(v) is distinct from 'number' then return false; end if;
      if (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
         or abs((v #>> '{}')::numeric) > 9007199254740991 then return false; end if;
    else return false;
    end if;
  end loop;
  if value ? 'mediaMode' and value->>'mediaMode' not in ('auto','galeria','color','color_galeria') then return false; end if;
  if value ? 'imageFit' and value->>'imageFit' not in ('auto','cover','contain') then return false; end if;
  if value ? 'layout' and value->>'layout' not in ('','featured','compact') then return false; end if;
  if value ? 'imagePosition' and value->>'imagePosition' !~* '^[a-z0-9% .-]*$' then return false; end if;
  -- Only validate representation here. Image availability/publication is a later phase.
  return true;
end;
$$;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create table public.store_memberships (
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (store_id,user_id)
);
create index store_memberships_user_idx on public.store_memberships(user_id,store_id);

create table public.products (
  store_id uuid not null references public.stores(id),
  id text not null default gen_random_uuid()::text check (id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$'),
  name text not null default '',
  -- Deliberately no numeric(p,2): PostgreSQL would round invalid extra decimals.
  price numeric check (price >= 0 and price < 10000000 and price = trunc(price,2)),
  old_price numeric check (old_price >= 0 and old_price < 10000000 and old_price = trunc(old_price,2)),
  is_draft boolean not null default true,
  available boolean not null default false,
  option_groups jsonb not null default '[]' check (private.valid_options(option_groups)),
  catalog_data jsonb not null default '{}' check (private.valid_catalog_data(catalog_data)),
  legacy_cart_ids text[] not null default '{}',
  legacy_names text[] not null default '{}',
  primary key (store_id,id),
  check (is_draft or (btrim(name) <> '' and price is not null)),
  check (not is_draft or not available)
);

create function private.preserve_product_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.store_id is distinct from old.store_id or new.id is distinct from old.id then
    raise exception using errcode = '23514', message = 'El comercio y el ID permanente del producto no se pueden cambiar.';
  end if;
  return new;
end;
$$;
create trigger products_identity_immutable before update on public.products
  for each row execute function private.preserve_product_identity();

-- RLS starts enabled in the creation migration: no exposure between migrations.
alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.products enable row level security;
revoke all on public.stores, public.store_memberships, public.products from public, anon, authenticated;
revoke all on function private.valid_options(jsonb), private.valid_catalog_data(jsonb), private.preserve_product_identity() from public, anon, authenticated;
commit;
