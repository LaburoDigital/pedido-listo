/* Ejecutar con Playwright disponible. No usa perfiles personales ni envía pedidos. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#dedede"/></svg>';
const columns = ['id','nombre','precio','activo','categoria','opciones_1_nombre','opciones_1_valores','opciones_2_nombre','opciones_2_valores','modo_imagenes','imagenes_labels','imagen_1','imagen_2','imagen_3','imagen_4'];
const row = overrides => ({id:'p1',nombre:'Producto',precio:'890.50',activo:'SI',categoria:"Niño's",opciones_1_nombre:'Talle',opciones_1_valores:'S;M',opciones_2_nombre:'Color',opciones_2_valores:'Negro;Blanco',modo_imagenes:'color_galeria',imagenes_labels:'Frente;Atrás',imagen_1:'https://images.test/a.svg',imagen_2:'https://images.test/b.svg',imagen_3:'https://images.test/c.svg',imagen_4:'https://images.test/d.svg',...overrides});
function csv(rows) { return [columns,...rows.map(r=>columns.map(key=>r[key]??''))].map(r=>r.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(',')).join('\n'); }
let server, browser, passed=0, servingRoot=root;
async function main() {
  server = http.createServer((req,res)=>{
    const file = path.resolve(servingRoot, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (file !== servingRoot && !file.startsWith(servingRoot+path.sep)) { res.writeHead(403);return res.end(); }
    try { const p=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
      res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));
    } catch {res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const folder of ['demos/ropa','demos/pasteleria','template/catalogo-base']) {
    const context=await browser.newContext({viewport:{width:1366,height:768}});
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    let body=csv([row()]),fail=false,delay=0;
    await page.route('**/data-source.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,folder,'data-source.js'),'utf8')+'\nDATA_SOURCE.mode="sheet";DATA_SOURCE.csvUrl="https://example.test/catalog.csv";'}));
    await page.route('https://example.test/catalog.csv',async route=>{
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      if(fail)return route.abort('failed');
      return route.fulfill({contentType:'text/csv',body});
    });
    await page.route(/https:\/\/(?:images\.test|images\.unsplash\.com)\//,route=>route.fulfill({contentType:'image/svg+xml',body:svg}));
    await page.addInitScript(()=>{window.__opened=[];window.__alerts=[];window.open=(url)=>{window.__opened.push(url);return null;};window.alert=msg=>window.__alerts.push(msg);});
    const navigate=async()=>{await page.goto(base+'/'+folder+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>['ready','error'].includes(catalogState.status));};
    await navigate();assert.equal(await page.locator('.product-card').count(),1);
    await page.getByRole('button',{name:"Niño's",exact:true}).click();assert.equal(await page.locator('.product-card').count(),1);
    await page.locator('.detail-link').click();
    await page.locator('[data-action="option"][data-option="M"]').click();
    await page.locator('[data-action="option"][data-option="Blanco"]').click();
    if(folder==='demos/ropa'){assert.equal(await page.locator('#detailThumbs button').count(),2);await page.locator('#detailThumbs button').last().click();}
    await page.locator('[data-action="cart-add"]').click();
    assert.equal(await page.evaluate(()=>cart[0].options.color),'Blanco');
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>catalogState.status==='ready');
    assert.equal(await page.evaluate(()=>cart[0].qty),1);
    await page.locator('[data-action="cart-open"]').first().click();
    await page.locator('[data-action="cart-qty"][data-delta="1"]').click();assert.equal(await page.evaluate(()=>cart[0].qty),2);
    await page.evaluate(()=>APP_CONFIG.orderFields.filter(f=>f.required).forEach(f=>document.getElementById('field-'+f.id).value=f.type==='date'?'2026-10-15':'Prueba'));
    body=csv([row({precio:'999'})]);await page.locator('[data-action="send-order"]').click();
    await page.waitForFunction(()=>window.__alerts.some(m=>m.includes('catálogo cambió')));
    assert.equal(await page.evaluate(()=>window.__opened.length),0);assert.equal(await page.evaluate(()=>cart[0].price),999);
    await page.locator('[data-action="send-order"]').click();await page.waitForFunction(()=>window.__opened.length===1);
    assert.match(await page.evaluate(()=>decodeURIComponent(window.__opened[0])),/Color: Blanco/);
    assert.match(await page.locator('#cartStatus').innerText(),/abrilo aquí/);
    await page.getByRole('button',{name:'Cerrar pedido',exact:true}).click();
    body=csv([row({activo:'NO'})]);await page.evaluate(()=>retryCatalog());
    assert.equal(await page.locator('.product-card').count(),0);assert.match(await page.locator('#productGrid').innerText(),/No hay productos/);
    fail=true;await page.evaluate(()=>retryCatalog());assert.equal(await page.locator('.product-card').count(),0);
    assert.equal(await page.getByRole('button',{name:'Reintentar',exact:true}).count(),1);
    fail=false;body=csv([row()]);await page.getByRole('button',{name:'Reintentar',exact:true}).click();await page.waitForFunction(()=>catalogState.status==='ready');
    assert.equal(await page.locator('.product-card').count(),1);
    const hostile="Negro')||window.__attack=1//";
    body=csv([row({categoria:"Niño's <script>bad</script>",opciones_2_valores:hostile+';Blanco'})]);await page.evaluate(()=>retryCatalog());
    await page.getByRole('button',{name:"Niño's <script>bad</script>",exact:true}).click();
    await page.locator('.detail-link').click();await page.getByRole('button',{name:hostile,exact:true}).click();
    assert.equal(await page.evaluate(()=>selectedOptions.color),hostile);assert.equal(await page.evaluate(()=>window.__attack),undefined);
    await page.locator('[data-action="cart-add"]').click();
    if(folder!=='demos/ropa'){
      await page.waitForFunction(()=>document.getElementById('cartDrawer').classList.contains('open'));
      await page.getByRole('button',{name:'Cerrar pedido',exact:true}).click();
    }
    await page.setViewportSize({width:375,height:667});await page.locator('.detail-link').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(folder==='demos/ropa'){
      const box=await page.locator('[data-action="cart-add"]').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=667);
      // Migration of the five known sheet products; no real sheet is modified.
      body=csv([row({id:'',nombre:'Remera oversize',precio:'1890'})]);
      await page.evaluate(()=>{localStorage.setItem(cartKey(),JSON.stringify([{id:'remera-oversize-1',name:'Remera oversize',price:1890,qty:2,options:{talle:'M',color:'Blanco'}}]))});
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>catalogState.status==='ready');
      assert.equal(await page.evaluate(()=>cart[0].id),'ropa-001');assert.equal(await page.evaluate(()=>cart[0].qty),2);
      body=csv([row({id:'',nombre:'Remera oversize',precio:'1890'}),row({id:'p2',nombre:'Otro'})].reverse());
      await page.evaluate(()=>retryCatalog());assert.equal(await page.evaluate(()=>cart[0].id),'ropa-001');
    }
    assert.deepEqual(errors,[]);passed++;console.log(`PASS ${folder}: UI, variants, persistence, refresh, empty/error/retry, hostile text, mobile`);
    await context.close();
  }
  const os=require('node:os');const {exportCatalog}=require('../tools/export-catalog.cjs');
  const target=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'pedido-listo-browser-')),'catalog');
  exportCatalog('demos/ropa',target);servingRoot=target;
  const packaged=await browser.newPage();const packagedErrors=[];
  packaged.on('pageerror',error=>packagedErrors.push(error.message));
  await packaged.route(/https:\/\/docs.google.com\/spreadsheets\//,route=>route.fulfill({contentType:'text/csv',body:csv([row()])}));
  await packaged.route(/https:\/\/(?:images\.test|images\.unsplash\.com)\//,route=>route.fulfill({contentType:'image/svg+xml',body:svg}));
  await packaged.goto(base+'/',{waitUntil:'domcontentloaded'});await packaged.waitForFunction(()=>catalogState.status==='ready');
  assert.equal(await packaged.locator('.product-card').count(),1);assert.deepEqual(packagedErrors,[]);await packaged.close();
  console.log('PASS standalone export served from its own root');
  if(process.argv.includes('--live')){
    servingRoot=root;
    const live=await browser.newPage();await live.route('https://images.unsplash.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:svg}));
    await live.goto(base+'/demos/ropa/',{waitUntil:'domcontentloaded'});await live.waitForFunction(()=>['ready','error'].includes(catalogState.status));
    const result=await live.evaluate(()=>({state:catalogState,count:catalogProducts.length,ids:catalogProducts.map(p=>p.id)}));
    console.log('LIVE read-only Google Sheets:',JSON.stringify(result));assert.equal(result.state.status,'ready');assert.ok(result.ids.every(id=>id.startsWith('ropa-')));await live.close();
  }
  console.log(`Browser scenarios passed: ${passed}/3 + standalone (no real WhatsApp requests)`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
