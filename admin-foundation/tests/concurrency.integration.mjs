import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localConfig,api,expectStatus,testReceiptPath} from '../scripts/local-api.mjs';

test('API real: dos sesiones compiten; una sola edición se confirma',{timeout:60000},async()=>{
  const config=localConfig(),request=api(config),receipt=JSON.parse(await readFile(testReceiptPath(),'utf8'));
  const user=receipt.users[0],sessions=[];let product;
  const check=(r,status=200)=>expectStatus(r,[status],'Prueba de concurrencia');
  const admin={key:config.serviceKey,token:config.serviceKey};
  try{
    for(let i=0;i<2;i++)sessions.push(check(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:user.email,password:user.password}})).access_token);
    product=check(await request('/rest/v1/products',{method:'POST',token:sessions[0],body:{store_id:user.store_id,name:'Atomic test',price:10,is_draft:false}}),201)[0];
    const path=`/rest/v1/products?store_id=eq.${product.store_id}&id=eq.${product.id}`;
    assert.equal((await request(path,{method:'PATCH',token:sessions[0],body:{price:12}})).status,428);
    // Repeated overlapping requests exercise the row lock with independently issued JWTs.
    for(let i=0;i<5;i++){
      const old=check(await request(path,{token:sessions[0]}))[0];
      const results=await Promise.all(sessions.map((token,index)=>request(path,{method:'PATCH',token,headers:{'If-Match':old.revision},body:{price:20+i*2+index}})));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
      const winner=results.find(r=>r.status===200).data[0],current=check(await request(path,{token:sessions[1]}))[0];
      assert.deepEqual(current,winner);assert.notEqual(current.revision,old.revision);
      assert.equal((await request(path,{method:'PATCH',token:sessions[1],headers:{'If-Match':old.revision},body:{price:99}})).status,409);
    }
    const current=check(await request(path,{token:sessions[0]}))[0];
    for(const body of [{revision:crypto.randomUUID()},{id:'replacement'},{store_id:receipt.users[1].store_id}])assert.equal((await request(path,{method:'PATCH',token:sessions[0],headers:{'If-Match':current.revision},body})).status,403);
    assert.deepEqual(check(await request(path,{token:sessions[0]}))[0],current);
    // Privileged maintenance also invalidates older editor versions.
    check(await request(path,{...admin,method:'PATCH',body:{price:50}}));
    assert.equal((await request(path,{method:'PATCH',token:sessions[0],headers:{'If-Match':current.revision},body:{price:70}})).status,409);
  }finally{
    if(product)check(await request(`/rest/v1/products?store_id=eq.${product.store_id}&id=eq.${product.id}`,{...admin,method:'DELETE'}));
    for(const token of sessions)expectStatus(await request('/auth/v1/logout?scope=local',{method:'POST',token}),[200,204],'Cerrar sesión de prueba');
  }
});
