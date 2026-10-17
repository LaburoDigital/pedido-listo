// Node built-ins only. Never contacts Supabase Cloud or installs anything.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function testReceiptPath(env=process.env) {
  const directory=env.PEDIDO_LISTO_TEST_STATE_DIR;
  if(!directory) throw Error('Falta definir la carpeta privada de pruebas PEDIDO_LISTO_TEST_STATE_DIR.');
  if(!path.isAbsolute(directory)) throw Error('La carpeta de pruebas debe ser absoluta.');
  const repo=fileURLToPath(new URL('../../',import.meta.url));
  const relative=path.relative(repo,path.resolve(directory));
  if(!relative || (!relative.startsWith(`..${path.sep}`) && relative!=='..' && !path.isAbsolute(relative))) throw Error('La carpeta privada debe estar fuera del repositorio.');
  return path.join(directory,'test-users.json');
}
export function localConfig(env=process.env) {
  if(env.PEDIDO_LISTO_LOCAL_TESTS!=='1') throw Error('Pruebas locales no habilitadas: PEDIDO_LISTO_LOCAL_TESTS=1.');
  if(env.SUPABASE_URL!=='http://127.0.0.1:54321') throw Error('Solo se admite la URL local http://127.0.0.1:54321.');
  if(!env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Falta una clave del entorno local.');
  return {url:env.SUPABASE_URL,anonKey:env.SUPABASE_ANON_KEY,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY};
}
export function api(config) {
  return async function request(path,{method='GET',token,key=config.anonKey,body,prefer='return=representation',headers={}}={}) {
    if(!path.startsWith('/auth/v1/') && !path.startsWith('/rest/v1/')) throw Error('Ruta local no permitida.');
    const response=await fetch(config.url+path,{
      method,redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',Prefer:prefer,...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    const text=await response.text();
    return {status:response.status,data:text?JSON.parse(text):null};
  };
}
export function expectStatus(result,allowed,operation) {
  if(!allowed.includes(result.status)) throw Error(`${operation}: HTTP ${result.status}. Revisá el entorno local; no se muestran claves ni respuestas de autenticación.`);
  return result.data;
}
