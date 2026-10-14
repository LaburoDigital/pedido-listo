/* Tienda generada en una carpeta temporal. Solo transporte local simulado. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {buildStore}=require('../../tools/build-store.cjs');
const {createSync}=require('./sync.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'pl-airtable-browser-'));
buildStore('casa-verde',path.join(root,'site'));
const site=path.join(root,'site');
let source,offline=false,expired=false,downloads=0,browser,server;
const initial=()=>({records:[{id:'recShirt',fields:{Producto:'Remera ficticia',Descripción:'Algodón — prueba local',Precio:890,Activo:true,Talles:['S','M'],Colores:['Negro','Blanco'],Fotos:[{id:'attPhoto',url:'https://attachments.invalid/temporary'}]}}]});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const sync=createSync({directory:site,storeId:'prueba',getPage:async()=>{if(offline)throw Error('Sincronización interrumpida. Reintentá.');return structuredClone(source)},getPhoto:async()=>{if(expired)throw Error('Enlace temporal vencido');downloads++;return png;}});
let config=fs.readFileSync(path.join(site,'store.js'),'utf8');
config=config.replace(/const CATALOG=.*;\n/,`const CATALOG=Catalog.createCatalog({async load(){const response=await fetch('/api/catalog',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);return data.products;}});\n`);
config+='\nAPP_CONFIG.businessName="Prueba local Airtable";APP_CONFIG.whatsapp="59899000000";APP_CONFIG.storageKey="pedido:airtable-simulacion";';
fs.writeFileSync(path.join(site,'store.js'),config);
async function main(){
 server=http.createServer(async(req,res)=>{
  if(req.url==='/api/catalog'){
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   try{const result=await sync.refresh();return res.end(JSON.stringify(result));}catch(e){res.statusCode=503;return res.end(JSON.stringify({error:e.message}));}
  }
  const file=path.resolve(site,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(site+path.sep)&&file!==site){res.statusCode=403;return res.end();}
  try{const p=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 for(const width of [1366,375]){
  source=initial();offline=false;expired=false;
  const page=await browser.newPage({viewport:{width,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.addInitScript(()=>{window.__opened=[];window.__alerts=[];window.open=url=>{window.__opened.push(url);return null};window.alert=x=>window.__alerts.push(x);});
  await page.goto(base);await page.waitForFunction(()=>catalogState.status==='ready');
  assert.equal(await page.locator('.product-card').count(),1);
  const photo=await page.locator('.product-card img').first().getAttribute('src');
  await page.waitForFunction(()=>{const i=document.querySelector('.product-card img');return i.complete&&i.naturalWidth>0});
  assert.equal(await page.locator('.product-card img').first().getAttribute('src'),photo,'must decode the copied photo, not a fallback');
  assert.match(photo,/^photos\//);
  expired=true;const count=downloads;await page.evaluate(()=>retryCatalog());assert.equal(downloads,count);
  assert.equal(await page.locator('.product-card img').first().getAttribute('src'),photo);
  await page.locator('.detail-link').click();await page.locator('[data-action="option"][data-option="M"]').click();
  await page.locator('[data-action="cart-add"]').click();
  await page.evaluate(()=>APP_CONFIG.orderFields.filter(f=>f.required).forEach(f=>document.getElementById('field-'+f.id).value='Prueba'));
  source.records[0].fields.Precio=990;
  await page.locator('[data-action="send-order"]').click();await page.waitForFunction(()=>window.__alerts.some(x=>x.includes('catálogo cambió')));
  assert.equal(await page.evaluate(()=>cart[0].price),990);assert.equal(await page.evaluate(()=>window.__opened.length),0);
  await page.locator('[data-action="send-order"]').click();await page.waitForFunction(()=>window.__opened.length===1);
  assert.match(await page.evaluate(()=>decodeURIComponent(window.__opened[0])),/Remera ficticia/);
  offline=true;await page.evaluate(()=>retryCatalog());assert.equal(await page.evaluate(()=>catalogState.status),'error');
  const opened=await page.evaluate(()=>window.__opened.length);await page.evaluate(()=>sendWhatsApp());assert.equal(await page.evaluate(()=>window.__opened.length),opened);
  offline=false;source.records[0].fields.Talles=['L'];source.records[0].fields.Producto='Remera renombrada';source.records[0].fields.Descripción='Descripción actualizada';
  await page.evaluate(()=>retryCatalog());assert.equal(await page.evaluate(()=>cart.length),0);
  assert.match(await page.locator('#productGrid').innerText(),/Remera renombrada/);
  source.records[0].fields.Activo=false;await page.evaluate(()=>retryCatalog());assert.equal(await page.locator('.product-card').count(),0);
  source.records[0].fields.Activo=true;await page.evaluate(()=>retryCatalog());assert.equal(await page.locator('.product-card').count(),1);
  source.records=[];await page.evaluate(()=>retryCatalog());assert.equal(await page.locator('.product-card').count(),0);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px: stable photos, price review, variants, activation, empty, sync error/recovery, intercepted WhatsApp`);
 }
 console.log('Generated isolated site: '+site);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
