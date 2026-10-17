'use strict';
// Reads LOCAL CLI status privately. Only the public key reaches the static server.
const path=require('node:path'),{execFileSync}=require('node:child_process');
const {createPanelServer}=require('./serve-panel.cjs');
try{
  const root=path.resolve(__dirname,'..');
  const output=execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),'status','-o','json'],{cwd:root,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
  const status=JSON.parse(output);
  const server=createPanelServer({url:status.API_URL,key:status.PUBLISHABLE_KEY||status.ANON_KEY});
  server.on('error',()=>{console.error('El puerto 4175 está ocupado. Revisá si el panel ya está abierto.');process.exitCode=1;});
  server.listen(4175,'127.0.0.1',()=>console.log('Panel local disponible en http://127.0.0.1:4175'));
}catch{console.error('No se pudo abrir el panel. Verificá Docker y Supabase local. No se instalaron herramientas ni se inició otro entorno.');process.exitCode=1;}
