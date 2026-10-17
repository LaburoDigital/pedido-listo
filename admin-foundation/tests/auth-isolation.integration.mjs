import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {localConfig,api,expectStatus,testReceiptPath} from '../scripts/local-api.mjs';
import mapper from '../src/product-mapper.cjs';

// This file is intentionally EXCLUDED from npm test. Missing credentials/server FAIL,
// never silently skip; these are real HTTP calls to Auth + PostgREST + PostgreSQL RLS.
test('Supabase LOCAL: autenticación real y aislamiento bidireccional por API',{timeout:120000},async t=>{
  const config=localConfig(), request=api(config);
  const receipt=JSON.parse(await readFile(testReceiptPath(),'utf8'));
  assert.equal(receipt.state,'ready','Ejecutar antes seed:local en un proyecto vacío.');
  assert.equal(receipt.url,config.url);
  assert.equal(receipt.users.length,2);
  const sessions=[];
  // Setup/cleanup only: privileged credentials are never used to prove tenant access.
  const admin={key:config.serviceKey,token:config.serviceKey};
  const created=[];
  let extraMembership=false;
  const check=(result,expected,label)=>expectStatus(result,[expected],label);
  const denied=(result,label)=>assert.ok([400,401,403,409,422].includes(result.status),`${label}: esperaba rechazo; HTTP ${result.status}`);
  const filter=u=>`store_id=eq.${u.store_id}&id=eq.ropa-001`;
  const own=async u=>check(await request(`/rest/v1/products?${filter(u)}`,{token:u.token}),200,'Lectura propia');
  try {
    for(const user of receipt.users) await t.test(`login real ${user.email}`,async()=>{
      const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:user.email,password:user.password}});
      const auth=check(result,200,'Login');
      assert.ok(typeof auth.access_token==='string'); assert.equal(auth.user.id,user.user_id);
      sessions.push({...user,token:auth.access_token,refresh:auth.refresh_token});
    });
    assert.equal(sessions.length,2,'Los dos logins deben funcionar antes de probar permisos.');
    await t.test('contraseña incorrecta, sesión inválida y acceso sin sesión rechazados',async()=>{
      const signup=await request('/auth/v1/signup',{method:'POST',body:{email:`blocked-${randomUUID()}@example.test`,password:randomUUID()}});
      assert.equal(signup.status,422);
      assert.equal(signup.data.error_code,'signup_disabled','Habilitar email login no debe abrir el registro público.');
      denied(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:receipt.users[0].email,password:randomUUID()}}),'Contraseña incorrecta');
      denied(await request('/rest/v1/products',{token:'invalid.jwt.token'}),'Token inválido');
      for(const table of ['products','stores','store_memberships']) denied(await request(`/rest/v1/${table}`),'Anónimo');
    });
    await t.test('refresh de sesión real conserva identidad',async()=>{
      const auth=check(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:sessions[0].refresh}}),200,'Refresh');
      assert.equal(auth.user.id,sessions[0].user_id); sessions[0].token=auth.access_token;
    });
    for(let i=0;i<2;i++) {
      const user=sessions[i], other=sessions[1-i], token=user.token;
      await t.test(`aislamiento ${i===0?'A → B':'B → A'}: leer, crear, editar, eliminar y escalar`,async()=>{
        const rows=check(await request('/rest/v1/products',{token}),200,'Catálogo');
        assert.ok(rows.length>0); assert.ok(rows.every(r=>r.store_id===user.store_id));
        assert.equal(mapper.mapCatalog(rows,user.store_id).length,1);
        for(const table of ['stores','store_memberships']) {
          const list=check(await request(`/rest/v1/${table}`,{token}),200,'Leer pertenencia');
          assert.equal(list.length,1); assert.equal(table==='stores'?list[0].id:list[0].store_id,user.store_id);
        }
        assert.deepEqual(check(await request(`/rest/v1/products?${filter(other)}`,{token}),200,'Consulta cruzada'),[]);
        const before=await own(other);
        assert.deepEqual(check(await request(`/rest/v1/products?${filter(other)}`,{method:'PATCH',token,body:{name:'intrusión'}}),200,'Actualizar ajeno'),[]);
        assert.deepEqual(await own(other),before,'Una actualización de cero filas no es una mutación exitosa.');
        denied(await request('/rest/v1/products',{method:'POST',token,body:{store_id:other.store_id,name:'Intruso'}}),'Insertar en otro comercio');
        denied(await request('/rest/v1/store_memberships',{method:'POST',token,body:{store_id:other.store_id,user_id:user.user_id}}),'Autoasignar pertenencia');
        denied(await request(`/rest/v1/store_memberships?user_id=eq.${user.user_id}`,{method:'PATCH',token,body:{store_id:other.store_id}}),'Mover pertenencia');
        denied(await request(`/rest/v1/store_memberships?user_id=eq.${user.user_id}`,{method:'DELETE',token}),'Borrar pertenencia');
        denied(await request(`/rest/v1/stores?id=eq.${user.store_id}`,{method:'PATCH',token,body:{id:other.store_id}}),'Mover comercio');
        denied(await request(`/rest/v1/products?${filter(user)}`,{method:'DELETE',token}),'Borrar propio');
        denied(await request(`/rest/v1/products?${filter(other)}`,{method:'DELETE',token}),'Borrar ajeno');
        const inserted=check(await request('/rest/v1/products',{method:'POST',token,body:{store_id:user.store_id,name:'Prueba de edición',price:12.34,is_draft:false,available:true}}),201,'Crear propio')[0];
        created.push({store_id:user.store_id,id:inserted.id}); assert.match(inserted.id,/^[0-9a-f-]{36}$/);
        const query=`/rest/v1/products?store_id=eq.${user.store_id}&id=eq.${inserted.id}`;
        const updated=check(await request(query,{method:'PATCH',token,headers:{'If-Match':inserted.revision},body:{name:'Renombrado',price:23.45,catalog_data:{order:9}}}),200,'Editar propio');
        assert.equal(updated.length,1); assert.equal(updated[0].id,inserted.id); assert.equal(updated[0].name,'Renombrado'); assert.equal(Number(updated[0].price),23.45);
        denied(await request(query,{method:'PATCH',token,body:{id:'otro-id'}}),'Modificar ID');
        denied(await request(query,{method:'PATCH',token,body:{store_id:other.store_id}}),'Modificar comercio');
        for(const price of [-1,'',null,'1,25',1.234,10000000,'NaN','Infinity']) denied(await request(query,{method:'PATCH',token,headers:{'If-Match':updated[0].revision},body:{price}}),`Precio inválido ${price}`);
        denied(await request(query,{method:'PATCH',token,headers:{'If-Match':updated[0].revision},body:{option_groups:[{id:'color',label:'Color',options:['Azul','Azul']}]}}),'Variantes duplicadas');
        denied(await request(query,{method:'PATCH',token,headers:{'If-Match':updated[0].revision},body:{catalog_data:{id:'inyectado'}}}),'Identidad en metadatos');
        const unchanged=check(await request(query,{token}),200,'Releer tras rechazos')[0];
        assert.equal(unchanged.id,inserted.id); assert.equal(unchanged.store_id,user.store_id); assert.equal(Number(unchanged.price),23.45);
        assert.deepEqual(await own(other),before);
      });
    }
    await t.test('ni dos pertenencias válidas permiten mover un producto o cambiar su ID',async()=>{
      const [a,b]=sessions;
      check(await request('/rest/v1/store_memberships',{...admin,method:'POST',body:{user_id:a.user_id,store_id:b.store_id}}),201,'Preparar segunda pertenencia');
      extraMembership=true;
      const beforeA=await own(a),beforeB=await own(b);
      denied(await request(`/rest/v1/products?${filter(a)}`,{token:a.token,method:'PATCH',body:{store_id:b.store_id}}),'Mover con doble pertenencia');
      denied(await request(`/rest/v1/products?${filter(a)}`,{token:a.token,method:'PATCH',body:{id:'nuevo-id'}}),'Cambiar ID con doble pertenencia');
      assert.deepEqual(await own(a),beforeA); assert.deepEqual(await own(b),beforeB);
    });
  } finally {
    // Delete only rows created by this run; never delete/reset the user's project.
    for(const p of created) expectStatus(await request(`/rest/v1/products?store_id=eq.${p.store_id}&id=eq.${p.id}`,{...admin,method:'DELETE'}),[200,204],'Limpiar producto de prueba');
    if(extraMembership) expectStatus(await request(`/rest/v1/store_memberships?store_id=eq.${receipt.users[1].store_id}&user_id=eq.${receipt.users[0].user_id}`,{...admin,method:'DELETE'}),[200,204],'Limpiar pertenencia temporal');
    for(const u of sessions) expectStatus(await request('/auth/v1/logout',{method:'POST',token:u.token}),[200,204],'Cerrar sesión de prueba');
  }
});
