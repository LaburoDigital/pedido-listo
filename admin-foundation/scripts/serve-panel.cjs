'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {validateConfig}=require('../panel/client.js');
const root=path.resolve(__dirname,'..');
const files={
  '/':['panel/index.html','text/html; charset=utf-8'],
  '/app.js':['panel/app.js','text/javascript; charset=utf-8'],
  '/style.css':['panel/style.css','text/css; charset=utf-8'],
  '/model.js':['panel/model.js','text/javascript; charset=utf-8'],
  '/session.js':['panel/session.js','text/javascript; charset=utf-8'],
  '/client.js':['panel/client.js','text/javascript; charset=utf-8'],
  '/mapper.js':['src/product-mapper.cjs','text/javascript; charset=utf-8'],
  '/core.js':['../engine/core.js','text/javascript; charset=utf-8'],
  '/media.js':['../engine/media.js','text/javascript; charset=utf-8']
};
function createPanelServer(config){
  const publicConfig=validateConfig(config);
  return http.createServer((req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self' http://127.0.0.1:54321; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){res.writeHead(403);return res.end('Acceso local únicamente.');}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/config.json'){res.setHeader('Content-Type','application/json');return res.end(req.method==='HEAD'?undefined:JSON.stringify(publicConfig));}
    const entry=files[url.pathname];if(!entry){res.writeHead(404);return res.end('No encontrado.');}
    try{const data=fs.readFileSync(path.join(root,entry[0]));res.setHeader('Content-Type',entry[1]);res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(500);res.end('No se pudo cargar el panel.');}
  });
}
if(require.main===module){
  try{const server=createPanelServer({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLIC_KEY});
    server.on('error',()=>{console.error('No se pudo abrir el panel: revisá si el puerto 4175 está ocupado.');process.exitCode=1;});
    server.listen(4175,'127.0.0.1',()=>console.log('Panel local: http://127.0.0.1:4175'));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={createPanelServer};
