const {test}=require('node:test'),assert=require('node:assert/strict');
const {createSession}=require('../panel/session.js');
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const auth=(id='a',expires=3600)=>({access_token:'token-'+id,refresh_token:'refresh-'+id,expires_in:expires,user:{id,email:id+'@example.test'}});
test('restaurar valida usuario en Auth; no guarda contraseña',async()=>{
  const store=storage(),calls=[];const raw=async(p)=>{calls.push(p);return p.includes('/user')?{id:'a',email:'a@example.test'}:auth();};
  const a=createSession(raw,{storage:store});await a.login('a','private-password');
  const b=createSession(raw,{storage:store});assert.equal((await b.restore()).id,'a');assert.ok(calls.includes('/auth/v1/user'));assert.ok(!store.getItem(b.key).includes('private-password'));
  await b.logout();assert.equal(await createSession(raw,{storage:store}).restore(),null);
});
test('sesión almacenada inválida se descarta y no muestra datos',async()=>{
  const s=storage(),client=createSession(async()=>{throw Error('no debe consultar');},{storage:s});s.setItem(client.key,'{"token":42}');assert.equal(await client.restore(),null);assert.equal(s.getItem(client.key),null);
});
test('refresh concurrente serializado; logout vence a una respuesta tardía',async()=>{
  let resolve,refresh=0;const s=storage();const c=createSession(async p=>{if(p.includes('refresh_token')){refresh++;return new Promise(r=>{resolve=r;});}return auth('a',0);},{storage:s});await c.login('a','x');
  const result=c.token().then(()=>false,e=>e.kind==='stale');await new Promise(r=>setImmediate(r));await c.logout();resolve(auth());assert.equal(await result,true);assert.equal(s.getItem(c.key),null);assert.equal(refresh,1);
});
test('token rechazado al restaurar elimina persistencia',async()=>{
  const s=storage();let fail=false;const c=createSession(async p=>{if(fail&&p.endsWith('/user')){const e=Error('revoked');e.kind='session';throw e;}return auth();},{storage:s});await c.login('a','x');fail=true;await assert.rejects(()=>createSession(async()=>{const e=Error('invalid');e.kind='session';throw e;},{storage:s}).restore());assert.equal(s.getItem(c.key),null);
});
test('dos pestañas comparten renovación bajo un bloqueo y no rotan dos veces',async()=>{
  let tail=Promise.resolve(),refresh=0;const locks={request(_key,fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}};
  const s=storage(),raw=async p=>{if(p.endsWith('/user'))return auth().user;if(p.includes('refresh_token')){refresh++;return auth();}return auth('a',0);};
  const a=createSession(raw,{storage:s,locks});await a.login('a','x');const b=createSession(raw,{storage:s,locks});
  await Promise.all([a.token(),b.restore()]);assert.equal(refresh,1);assert.equal(await b.token(),'token-a');
});
test('fallo de red al restaurar no elimina sesión ni expone catálogo',async()=>{
  const s=storage(),a=createSession(async()=>auth(),{storage:s});await a.login('a','x');
  const b=createSession(async()=>{throw Object.assign(Error('offline'),{kind:'network'});},{storage:s});await assert.rejects(()=>b.restore(),e=>e.kind==='network');assert.ok(s.getItem(b.key));
});
test('refresh rechazado durante restauración informa sesión vencida y borra persistencia',async()=>{
  const s=storage(),a=createSession(async()=>auth('a',0),{storage:s});await a.login('a','x');
  const b=createSession(async()=>{throw Error('invalid refresh');},{storage:s});
  await assert.rejects(()=>b.restore(),e=>e.kind==='session');assert.equal(s.getItem(b.key),null);
});
