-- A row version is checked inside the UPDATE lock, not in a preceding SELECT.
alter table public.products add column revision uuid not null default gen_random_uuid();

create function private.check_product_revision() returns trigger
language plpgsql set search_path = '' as $$
declare expected text;
begin
  if current_user in ('authenticated', 'anon') then
    expected := nullif(current_setting('request.headers', true), '')::jsonb ->> 'if-match';
    if expected is null or expected = '' then
      raise sqlstate 'PT428' using message = 'A product revision is required.';
    end if;
    if expected <> old.revision::text then
      raise sqlstate 'PT409' using message = 'The product was modified. Reload before saving.';
    end if;
  end if;
  new.revision := gen_random_uuid();
  return new;
end;
$$;
revoke all on function private.check_product_revision() from public, anon, authenticated;
create trigger products_revision_check before update on public.products
for each row execute function private.check_product_revision();
comment on column public.products.revision is 'Opaque edit version; send its exact value as If-Match on authenticated UPDATE.';
