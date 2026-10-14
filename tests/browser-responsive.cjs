/* Reproduce la cascada real: no asume que una media query escrita sea la ganadora. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {buildStore}=require('../tools/build-store.cjs');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-responsive-'));
const captures=path.join(root,'work/first-delivery-responsive');fs.mkdirSync(captures,{recursive:true});
const stores=fs.readdirSync(path.join(root,'stores'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
for(const id of stores)buildStore(id,path.join(temp,id));
let browser,server;
async function main(){
  server=http.createServer((req,res)=>{
    const file=path.resolve(temp,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!file.startsWith(temp+path.sep)){res.writeHead(403);return res.end();}
    try{const p=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(p));}
    catch{res.writeHead(404);res.end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const measurements=[];
  for(const id of stores){
    const config=JSON.parse(fs.readFileSync(path.join(root,'stores',id,'store.json')));
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      const url=route.request().url();if(url.startsWith(base))return route.continue();
      if(url.startsWith('https://docs.google.com/'))return route.fulfill({contentType:'text/csv',body:'id,nombre,precio,activo\nropa-001,Remera oversize,890,SI'});
      if(/^https:\/\/images\./.test(url))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#dedede"/></svg>'});
      return route.abort();
    });
    for(const width of [320,375,390,640,641,768,1366,1500]){
      await page.setViewportSize({width,height:800});await page.goto(base+'/'+id+'/');await page.waitForFunction(()=>catalogState.status==='ready');
      const result=await page.evaluate(()=>{
        const grid=document.getElementById('productGrid'),g=grid.getBoundingClientRect();
        return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gridWidth:g.width,
          cards:[...grid.querySelectorAll('.product-card')].map(c=>{const b=c.getBoundingClientRect();return {width:b.width,left:b.left,right:b.right,featured:c.classList.contains('featured')};})};
      });
      measurements.push({id,width,...result});
      assert.ok(result.cards.length,`${id} ${width}: empty fixture`);
      if(config.config.presentation.theme==='clasico'){
        assert.equal(result.columns,width<=640?2:12,`${id} ${width}: correct responsive column count`);
        for(const c of result.cards){
          assert.ok(c.width>=130,`${id} ${width}: compressed card (${c.width}px)`);
          if(width<=640&&c.featured)assert.ok(Math.abs(c.width-result.gridWidth)<1,'featured fills both columns');
          assert.ok(c.left>=-1&&c.right<=width+1,`${id}: card stays in viewport`);
        }
      }
      if(result.scrollWidth>width)console.log('OVERFLOW',id,width,result.scrollWidth,await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>!e.children.length&&e.textContent.trim()&&!e.closest('[aria-hidden="true"]')).map(e=>{const r=document.createRange();r.selectNodeContents(e);return {tag:e.tagName,class:e.className,text:e.textContent.slice(0,45),right:r.getBoundingClientRect().right};}).filter(e=>e.right>innerWidth+1).slice(0,15)));
      assert.ok(result.scrollWidth<=width,`${id} ${width}: horizontal overflow`);
      await page.locator('.detail-link').first().click();
      await page.locator('[data-action="cart-add"]').click();assert.equal(await page.evaluate(()=>cart.length),1);
      if(width===375||width===1366){
        await page.goto(base+'/'+id+'/');await page.waitForFunction(()=>catalogState.status==='ready');
        await page.locator('#productGrid').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(captures,`${id}-${width}.png`),animations:'disabled'});
      }
    }
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${id}: 8 widths, grid geometry, no overflow, add to cart`);
  }
  fs.writeFileSync(path.join(captures,'measurements.json'),JSON.stringify(measurements,null,2));
  console.log(`PASS ${measurements.length} responsive scenarios`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
