begin;
-- Policies use membership rows, not user-editable auth metadata or client filters.
create policy memberships_read_self on public.store_memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy stores_read_member on public.stores for select to authenticated
  using (id in (select store_id from public.store_memberships where user_id = (select auth.uid())));
create policy products_read_member on public.products for select to authenticated
  using (store_id in (select store_id from public.store_memberships where user_id = (select auth.uid())));
create policy products_insert_member on public.products for insert to authenticated
  with check (store_id in (select store_id from public.store_memberships where user_id = (select auth.uid())));
create policy products_update_member on public.products for update to authenticated
  using (store_id in (select store_id from public.store_memberships where user_id = (select auth.uid())))
  with check (store_id in (select store_id from public.store_memberships where user_id = (select auth.uid())));

-- Explicit grants replace Supabase defaults. No DELETE, tenant assignment or alias editing.
revoke all on public.stores, public.store_memberships, public.products from public, anon, authenticated;
grant select on public.stores, public.store_memberships, public.products to authenticated;
grant insert (store_id,name,price,old_price,is_draft,available,option_groups,catalog_data) on public.products to authenticated;
grant update (name,price,old_price,is_draft,available,option_groups,catalog_data) on public.products to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.valid_options(jsonb), private.valid_catalog_data(jsonb) to authenticated, service_role;
grant usage on schema private to service_role;
-- For local fixture provisioning only. Never expose service_role to a browser.
grant all on public.stores, public.store_memberships, public.products to service_role;
commit;
