const {test}=require('node:test');const assert=require('node:assert/strict');
const {createPanelServer}=require('../scripts/serve-panel.cjs');
test('servidor expone solo archivos permitidos y configuración pública, sin rutas privadas',async()=>{
  const server=createPanelServer({url:'http://127.0.0.1:54321',key:'sb_publishable_test'});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  try{
    const r=await fetch(base+'/config.json');assert.equal(r.status,200);assert.equal((await r.json()).key,'sb_publishable_test');assert.match(r.headers.get('content-security-policy'),/default-src 'self'/);
    for(const p of ['/.env','/scripts/seed-local.mjs','/.local/test-users.json','/supabase/config.toml','/unknown'])assert.equal((await fetch(base+p)).status,404);
    const hostile=await new Promise((resolve,reject)=>{const req=require('node:http').get(base+'/config.json',{headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);});
    assert.equal(hostile,403);
    assert.equal((await fetch(base+'/config.json',{method:'POST'})).status,405);
  }finally{await new Promise(r=>server.close(r));}
});
