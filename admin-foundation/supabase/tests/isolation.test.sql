-- Executed by `supabase test db`, not by the offline suite.
-- SQL role impersonation checks actual PostgreSQL policies; the separate HTTP
-- suite checks genuine Auth-issued sessions. All SQL fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id,email) values
 ('33333333-3333-4333-8333-333333333333','sql-a@example.test'),
 ('44444444-4444-4444-8444-444444444444','sql-b@example.test');
insert into public.stores (id,name,slug) values
 ('77777777-7777-4777-8777-777777777777','SQL ficticio A','sql-ficticio-a'),
 ('88888888-8888-4888-8888-888888888888','SQL ficticio B','sql-ficticio-b');
insert into public.store_memberships (store_id,user_id) values
 ('77777777-7777-4777-8777-777777777777','33333333-3333-4333-8333-333333333333'),
 ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444');
insert into public.products (store_id,id,name,price,is_draft,available) values
 ('77777777-7777-4777-8777-777777777777','sql-a','Producto A',10,false,true),
 ('88888888-8888-4888-8888-888888888888','sql-b','Producto B',20,false,true);

select throws_ok($$insert into public.products(store_id,id) values ('77777777-7777-4777-8777-777777777777','sql-a')$$,'23505',null,'ID duplicado rechazado dentro del comercio');
select lives_ok($$insert into public.products(store_id,id) values ('88888888-8888-4888-8888-888888888888','sql-a')$$,'El mismo ID puede existir en otro comercio');
select throws_ok($$update public.products set price=1.234 where id='sql-a'$$,'23514',null,'No se redondean decimales incorrectos');
select throws_ok($$update public.products set price=-1 where id='sql-a'$$,'23514',null,'Precio negativo rechazado');
select throws_ok($$update public.products set price=10000000 where id='sql-a'$$,'23514',null,'Rango monetario compatible con el motor');
select throws_ok($$update public.products set price='NaN'::numeric where id='sql-a'$$,'23514',null,'NaN rechazado');
select throws_ok($$update public.products set price='Infinity'::numeric where id='sql-a'$$,'23514',null,'Infinito rechazado');
select throws_ok($$update public.products set price=null where id='sql-b'$$,'23514',null,'Producto completo requiere precio');
select throws_ok($$update public.products set option_groups='[{"id":"color","label":"Color","options":["A","A"]}]' where id='sql-b'$$,'23514',null,'Opciones duplicadas rechazadas');
select throws_ok($$update public.products set option_groups='[{"id":"color","label":"Color","options":["Negro"," negro "]}]' where id='sql-b'$$,'23514',null,'Colores equivalentes rechazados');
select throws_ok($$update public.products set catalog_data='{"price":1}' where id='sql-b'$$,'23514',null,'Metadatos no pueden suplantar campos principales');

set local role anon;
select throws_ok('select * from public.products','42501',null,'Anónimo no lee productos');
select throws_ok('select * from public.stores','42501',null,'Anónimo no lee comercios');
select throws_ok('select * from public.store_memberships','42501',null,'Anónimo no lee pertenencias');
select throws_ok($$insert into public.products(store_id) values ('77777777-7777-4777-8777-777777777777')$$,'42501',null,'Anónimo no crea productos');
select throws_ok($$update public.products set name='intruso'$$,'42501',null,'Anónimo no edita');
select throws_ok('delete from public.products','42501',null,'Anónimo no elimina');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select is((select count(*) from public.products)::integer,1,'A solo ve su producto');
select is((select count(*) from public.stores)::integer,1,'A solo ve su comercio');
select is((select count(*) from public.store_memberships)::integer,1,'A solo ve su pertenencia');
select is((select count(*) from public.products where store_id='88888888-8888-4888-8888-888888888888')::integer,0,'Filtro directo no expone B');
select lives_ok($$insert into public.products(store_id,name) values ('77777777-7777-4777-8777-777777777777','Borrador A')$$,'A puede crear con ID automático');
select set_config('request.headers',json_build_object('if-match',(select revision from products where id='sql-a'))::text,true);
select lives_ok($$update public.products set name='Editado A' where id='sql-a'$$,'A puede editar su producto');
select results_eq($$update public.products set name='intruso' where id='sql-b' returning id$$,$$select null::text where false$$,'A no actualiza B');
select throws_ok($$insert into public.products(store_id) values ('88888888-8888-4888-8888-888888888888')$$,'42501',null,'A no inserta en B');
select throws_ok($$update public.products set id='otro' where id='sql-a'$$,'42501',null,'API no tiene UPDATE de ID');
select throws_ok($$update public.products set store_id='88888888-8888-4888-8888-888888888888' where id='sql-a'$$,'42501',null,'API no tiene UPDATE de comercio');
select throws_ok($$insert into public.store_memberships values ('88888888-8888-4888-8888-888888888888','33333333-3333-4333-8333-333333333333')$$,'42501',null,'Usuario no se asigna otra pertenencia');
select throws_ok($$update public.store_memberships set store_id='88888888-8888-4888-8888-888888888888'$$,'42501',null,'Usuario no mueve pertenencias');
select throws_ok('delete from public.store_memberships','42501',null,'Usuario no borra pertenencias');
select throws_ok('delete from public.products','42501',null,'Usuario no borra ni propios ni ajenos');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
select is((select count(*) from public.products where store_id='77777777-7777-4777-8777-777777777777')::integer,0,'B no ve A');
select is((select name from public.products where id='sql-b'),'Producto B','Intento de A no cambió B');
select results_eq($$update public.products set name='intruso B' where store_id='77777777-7777-4777-8777-777777777777' returning id$$,$$select null::text where false$$,'B no actualiza A');
select throws_ok($$insert into public.products(store_id) values ('77777777-7777-4777-8777-777777777777')$$,'42501',null,'B no inserta en A');
reset role;
select is((select name from public.products where store_id='77777777-7777-4777-8777-777777777777' and id='sql-a'),'Editado A','Intento de B no cambió A');

-- Deliberately broaden column grants INSIDE this rollback-only test to exercise
-- the trigger independently of grants, with legitimate membership of both stores.
insert into public.store_memberships values ('88888888-8888-4888-8888-888888888888','33333333-3333-4333-8333-333333333333');
grant update (id,store_id) on public.products to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
select throws_ok($$update public.products set id='otro-id' where store_id='77777777-7777-4777-8777-777777777777' and id='sql-a'$$,'23514',null,'Trigger impide renombrar ID aunque se amplíen permisos');
select throws_ok($$update public.products set store_id='88888888-8888-4888-8888-888888888888' where store_id='77777777-7777-4777-8777-777777777777' and id='sql-a'$$,'23514',null,'Trigger impide mover aun con pertenencia válida a ambos');
select is((select count(*) from public.products where store_id='77777777-7777-4777-8777-777777777777' and id='sql-a')::integer,1,'Identidad original intacta');
reset role;
select * from finish();
rollback;
