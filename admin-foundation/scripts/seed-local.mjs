import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {localConfig,api,expectStatus,testReceiptPath} from './local-api.mjs';

// Explicit operation, only after a human authorizes local Supabase startup.
// No automatic reset, retry/upsert, deletion, tooling install, or Docker commands.
const config=localConfig();
const request=api(config);
const admin={key:config.serviceKey,token:config.serviceKey};
const receiptPath=testReceiptPath();
try { await access(receiptPath); throw Error('Ya existe un recibo de preparación. No se sobrescribe; usá un entorno local vacío y revisá README.'); }
catch(error) { if(error.code!=='ENOENT') throw error; }
const stores=expectStatus(await request('/rest/v1/stores?select=id&limit=1',admin),[200],'Comprobar migraciones');
const auth=expectStatus(await request('/auth/v1/admin/users?page=1&per_page=1',admin),[200],'Comprobar Auth');
if(!Array.isArray(stores) || stores.length || !Array.isArray(auth.users) || auth.users.length) throw Error('La base o Auth no están vacíos. No se modifica un entorno preexistente.');
const fixture=JSON.parse(await readFile(new URL('../fixtures/catalogs.json',import.meta.url),'utf8'));
const receipt={state:'preparing',url:config.url,users:fixture.users.map(user=>({...user,password:randomBytes(24).toString('base64url')}))};
await mkdir(path.dirname(receiptPath),{recursive:true});
// Save before writes so a partial failure cannot lose track of created users.
await writeFile(receiptPath,JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
for(const user of receipt.users) {
  const created=expectStatus(await request('/auth/v1/admin/users',{...admin,method:'POST',body:{email:user.email,password:user.password,email_confirm:true}}),[200,201],'Crear usuario ficticio');
  if(typeof created.id!=='string') throw Error('Auth no devolvió el identificador del usuario.');
  user.user_id=created.id;
  await writeFile(receiptPath,JSON.stringify(receipt,null,2),{mode:0o600});
}
for(const [table,rows] of [
  ['stores',fixture.stores],
  ['store_memberships',receipt.users.map(u=>({store_id:u.store_id,user_id:u.user_id}))],
  ['products',fixture.products]
]) expectStatus(await request(`/rest/v1/${table}`,{...admin,method:'POST',body:rows}),[201],`Preparar ${table}`);
receipt.state='ready';
await writeFile(receiptPath,JSON.stringify(receipt,null,2),{mode:0o600});
console.log('Preparados 2 comercios, 2 usuarios y 3 filas de productos ficticios. Credenciales guardadas en la carpeta privada de pruebas.');
