/* Comparación visual de fase 1 y fase 2. Nunca accede a servicios reales. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const {buildStore}=require('../tools/build-store.cjs');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-parity-'));
const baseline=path.join(temp,'before');fs.mkdirSync(baseline);
// Referencia histórica fija, también disponible después de retirar las copias.
const revision='4e1786d';
const list=spawnSync('git',['ls-tree','-r','--name-only',revision,'--','demos','template','shared'],{cwd:root,encoding:'utf8'});
assert.equal(list.status,0,list.stderr);
for(const file of list.stdout.trim().split('\n')) {
  const out=spawnSync('git',['show',revision+':'+file],{cwd:root,maxBuffer:5e6});assert.equal(out.status,0);
  fs.mkdirSync(path.dirname(path.join(baseline,file)),{recursive:true});fs.writeFileSync(path.join(baseline,file),out.stdout);
}
const outRoot=path.join(root,'work/phase2-visual');fs.mkdirSync(outRoot,{recursive:true});
const image='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#dedede"/></svg>';
const csv='id,nombre,precio,activo,categoria,imagen_1,imagen_2,opciones_1_nombre,opciones_1_valores,opciones_2_nombre,opciones_2_valores\nropa-001,Remera oversize,890,SI,Remeras,https://images.test/1.svg,https://images.test/2.svg,Talle,S;M,Color,Negro;Blanco';
let server,browser;
async function main(){
  server=http.createServer((req,res)=>{
    const file=path.resolve(temp,'.'+req.url.split('?')[0]);
    if(!file.startsWith(temp+path.sep)){res.writeHead(403);return res.end();}
    try{const p=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
      res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const base=`http://127.0.0.1:${server.address().port}`;
  let comparisons=0;
  for(const [id,old] of [['luna-urban','demos/ropa'],['pasteleria-demo','demos/pasteleria'],['catalogo-base','template/catalogo-base']]){
    buildStore(id,path.join(temp,'after',id));
    for(const width of [1366,375]){
      const shots=[];
      for(const [label,url] of [['before',base+'/before/'+old+'/'],['after',base+'/after/'+id+'/']]){
        const context=await browser.newContext({viewport:{width,height:width===375?667:768},reducedMotion:'reduce'});
        const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/*',route=>{
          const u=route.request().url();if(u.startsWith(base))return route.continue();
          if(u.includes('docs.google.com'))return route.fulfill({contentType:'text/csv',body:csv});
          if(u.includes('images.'))return route.fulfill({contentType:'image/svg+xml',body:image});
          return route.abort();
        });
        await page.goto(url);await page.waitForFunction(()=>catalogState.status==='ready');await page.evaluate(()=>document.fonts.ready);
        await page.addStyleTag({content:'*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}'});
        const states={};
        const capture=async name=>{
          await page.evaluate(async()=>{window.scrollTo({top:0,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
          await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
          await page.screenshot({fullPage:true,animations:'disabled'}); // Componer imágenes y filtros antes de comparar.
          states[name]=await page.screenshot({fullPage:true,animations:'disabled',path:path.join(outRoot,`${id}-${width}-${name}-${label}.png`)});
        };
        await capture('catalog');
        await page.locator('.detail-link').first().click();await capture('detail');
        await page.locator('[data-action="cart-add"]').click();
        if(id!=='luna-urban')await page.waitForFunction(()=>document.getElementById('cartDrawer').classList.contains('open'));
        else await page.locator('[data-action="cart-open"]').first().click();
        await capture('cart');assert.deepEqual(errors,[]);shots.push(states);await context.close();
      }
      for(const state of ['catalog','detail','cart']){
        if(Buffer.compare(shots[0][state],shots[1][state])!==0){
          // Chromium puede variar unos niveles de color al componer transparencias.
          // Comparar píxeles, no PNG comprimido; no tolerar cambios de geometría.
          const comparison=await browser.newPage();
          const maxDifference=await comparison.evaluate(async ([a,b])=>{
            const decode=async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};};
            const first=await decode(a),second=await decode(b);if(first.width!==second.width||first.height!==second.height)return 255;
            let max=0;for(let i=0;i<first.data.length;i++)max=Math.max(max,Math.abs(first.data[i]-second.data[i]));return max;
          },[shots[0][state].toString('base64'),shots[1][state].toString('base64')]);
          await comparison.close();assert.ok(maxDifference<=4,`${id} ${width} ${state}: visual changed (maximum channel delta ${maxDifference})`);
        }
        comparisons++;
      }
      console.log(`PASS visual parity ${id} ${width}px: catalog, detail, cart`);
    }
  }
  console.log(`PASS ${comparisons} screenshot comparisons against phase 1 (color tolerance 4/255)`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
