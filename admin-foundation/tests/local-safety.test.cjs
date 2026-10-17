const {test}=require('node:test');
const assert=require('node:assert/strict');

test('credenciales de prueba requieren una carpeta absoluta explícita fuera del repositorio',async()=>{
  const {testReceiptPath}=await import('../scripts/local-api.mjs');
  assert.throws(()=>testReceiptPath({}),/carpeta/i);
  assert.throws(()=>testReceiptPath({PEDIDO_LISTO_TEST_STATE_DIR:'.local'}),/absoluta/i);
  const path=require('node:path');
  assert.throws(()=>testReceiptPath({PEDIDO_LISTO_TEST_STATE_DIR:path.resolve(__dirname,'../.local')}),/fuera/i);
  const state=path.join(require('node:os').tmpdir(),'pedido-test-private');
  assert.equal(testReceiptPath({PEDIDO_LISTO_TEST_STATE_DIR:state}),path.join(state,'test-users.json'));
});

test('preparación exige consentimiento de pruebas y URL local exacta antes de usar claves',async()=>{
  const {localConfig}=await import('../scripts/local-api.mjs');
  const env={PEDIDO_LISTO_LOCAL_TESTS:'1',SUPABASE_URL:'http://127.0.0.1:54321',SUPABASE_ANON_KEY:'local-anon',SUPABASE_SERVICE_ROLE_KEY:'local-service'};
  assert.equal(localConfig(env).url,'http://127.0.0.1:54321');
  for(const url of ['https://project.supabase.co','http://127.0.0.1:54321/remote','http://127.0.0.1:54322','http://127.0.0.1.evil.test:54321','http://secret@127.0.0.1:54321','http://127.0.0.1:54321/?x=1']) {
    assert.throws(()=>localConfig({...env,SUPABASE_URL:url}),/local/i);
  }
  assert.throws(()=>localConfig({...env,PEDIDO_LISTO_LOCAL_TESTS:''}),/habilitadas/i);
  assert.throws(()=>localConfig({...env,SUPABASE_SERVICE_ROLE_KEY:''}),/clave/i);
});
