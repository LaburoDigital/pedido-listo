const {test}=require('node:test');const assert=require('node:assert/strict');
const {createClient,validateConfig}=require('../panel/client.js');
const config={url:'http://127.0.0.1:54321',key:'sb_publishable_test'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('solo acepta configuración pública local',()=>{
  assert.doesNotThrow(()=>validateConfig(config));
  assert.throws(()=>validateConfig({...config,url:'https://remote.supabase.co'}));
  assert.throws(()=>validateConfig({...config,key:'sb_secret_private'}));
  const jwt='e30.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';
  assert.throws(()=>validateConfig({...config,key:jwt}));
});
test('login, renovación única concurrente y salida con almacén en memoria en Node',async()=>{
  let refresh=0;const calls=[];
  const client=createClient(config,async(url,options)=>{
    calls.push({url,options});
    if(url.includes('grant_type=password'))return response({access_token:'first',refresh_token:'refresh',expires_in:0,user:{id:'a'}});
    if(url.includes('grant_type=refresh_token')){refresh++;await new Promise(r=>setTimeout(r,15));return response({access_token:'second',refresh_token:'next',expires_in:3600,user:{id:'a'}});}
    if(url.includes('logout'))return response({});return response([]);
  });
  await client.login('a@example.test','secret');await Promise.all([client.stores(),client.stores()]);
  assert.equal(refresh,1);assert.ok(calls.filter(c=>c.url.includes('/rest/')).every(c=>c.options.headers.Authorization==='Bearer second'));
  await client.logout();await assert.rejects(()=>client.stores(),/sesión/);
});
test('paginación completa y filtro explícito por comercio',async()=>{
  const seen=[];const client=createClient(config,async(url)=>{
    if(url.includes('token?'))return response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}});
    seen.push(url);return response(url.includes('offset=0')?Array.from({length:200},(_,i)=>({id:String(i),store_id:'a'})):[]);
  });await client.login('a','b');assert.equal((await client.products('a')).length,200);assert.equal(seen.length,2);assert.ok(seen.every(u=>u.includes('store_id=eq.a')));
});
test('rechaza actualizaciones con identidad e informa fila ajena/inexistente',async()=>{
  let patches=0;const client=createClient(config,async(url,o)=>{
    if(url.includes('token?'))return response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}});
    if(o.method==='PATCH')patches++;return response([]);
  });await client.login('a','b');
  await assert.rejects(()=>client.save('a',{id:'p',store_id:'a'},{id:'changed'}),/identidad/);
  await assert.rejects(()=>client.save('a',{id:'p',store_id:'a',revision:'v1'},{name:'x'}),/disponible/);assert.equal(patches,1);
});
test('una escritura con respuesta perdida no se reintenta',async()=>{
  let writes=0;const c=createClient(config,async(url)=>{if(url.includes('token?'))return response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}});writes++;throw Error('offline');});
  await c.login('a','b');await assert.rejects(()=>c.save('a',null,{name:'nuevo'}),e=>e.kind==='uncertain');assert.equal(writes,1);
});
test('cambio concurrente detectado impide sobrescribir el producto',async()=>{
  let writes=0;const original={id:'p',store_id:'a',name:'Anterior',revision:'v1'};
  const c=createClient(config,async(url,o)=>{if(url.includes('token?'))return response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}});assert.equal(o.method,'PATCH');assert.equal(o.headers['If-Match'],'v1');writes++;return response({code:'PT409'},409);});
  await c.login('a','b');await assert.rejects(()=>c.save('a',original,{name:'Mi edición'}),e=>e.kind==='conflict');assert.equal(writes,1);
});
test('sesión rechazada se elimina y no sigue consultando datos',async()=>{
  let calls=0;const c=createClient(config,async url=>{if(url.includes('token?'))return response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}});calls++;return response({},401);});
  await c.login('a','b');await assert.rejects(()=>c.stores(),e=>e.kind==='session');await assert.rejects(()=>c.stores(),e=>e.kind==='session');assert.equal(calls,1);
});
test('respuesta tardía de otra cuenta no devuelve datos ni cierra la nueva sesión',async()=>{
  let resolve,current='a',delay=true;
  const c=createClient(config,async(url,o)=>{
    if(url.includes('grant_type=password'))return response({access_token:current,refresh_token:'r-'+current,expires_in:3600,user:{id:current}});
    if(delay&&url.includes('/rest/')){delay=false;return new Promise(r=>{resolve=r;});}
    return response([{id:'store-b'}]);
  });
  await c.login('a','x');const pending=c.stores().then(()=>false,e=>e.kind==='stale');await new Promise(r=>setImmediate(r));
  current='b';await c.login('b','y');resolve(response({},401));assert.equal(await pending,true);assert.deepEqual(await c.stores(),[{id:'store-b'}]);
});
test('Auth user 403 descarta sesión persistente inválida como 401',async()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const fetcher=async url=>url.includes('grant_type=password')?response({access_token:'t',refresh_token:'r',expires_in:3600,user:{id:'u'}}):response({},403);
  await createClient(config,fetcher,{storage}).login('u','x');
  await assert.rejects(()=>createClient(config,fetcher,{storage}).restore(),e=>e.kind==='session');assert.equal(values.size,0);
});
for(const status of [429,503])test(`refresh temporal HTTP ${status} conserva sesión y permite reintentar`,async()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let down=true;
  const c=createClient(config,async url=>{
    if(url.includes('grant_type=password'))return response({access_token:'t',refresh_token:'r',expires_in:0,user:{id:'u'}});
    if(url.includes('grant_type=refresh_token'))return down?response({},status):response({access_token:'next',refresh_token:'next-r',expires_in:3600,user:{id:'u'}});
    return response([]);
  },{storage});
  await c.login('u','x');await assert.rejects(()=>c.stores(),e=>e.kind==='network');assert.equal(values.size,1);down=false;assert.deepEqual(await c.stores(),[]);
});
