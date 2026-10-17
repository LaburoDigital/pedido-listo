// Local preview only. No simulated Google login, database or upload endpoint.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {build}=require('./build.cjs');
const directory=build();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let route;try{route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 // Explicit, credential-free source delivery for copying into the Google editor.
 // Do not serve arbitrary files or future local configuration/secrets.
 const setupFiles={'/setup/Code.gs':'Code.gs','/setup/Index.html':'Index.html','/setup/appsscript.json':'appsscript.json'};
 if(Object.hasOwn(setupFiles,route)){
  res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  return res.end(fs.readFileSync(path.join(directory,setupFiles[route])));
 }
 let file;if(route==='/panel')file=path.join(directory,'Index.html');else{
  const root=path.join(directory,'site');file=path.resolve(root,'.'+(route==='/'?'/index.html':route));
  if(!file.startsWith(root+path.sep)||route.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);return res.end();}
 }
 if(!types[path.extname(file)]){res.writeHead(404);return res.end();}
 try{let content=fs.readFileSync(file);if(route==='/panel')content=Buffer.from(content.toString().replace('/*PANEL_SCRIPT*/',''));
 res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(content);
 }catch{res.writeHead(404);res.end();}
});
const port=Number(process.env.PEDIDO_PILOT_PORT||4186);
server.listen(port,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:'+port+'/panel | store http://127.0.0.1:'+port+'/ | '+directory));
