// Prueba de navegador REAL del procesamiento de fotos (Chromium). google.script.run se reemplaza por un doble:
// NO prueba Apps Script ni ImageKit. Uso: python3 tests/photo-fixtures.py <dir> ; node tests/photo-browser.cjs <Index.html del build> <dir>
const path=require('path');const assert=require('assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('playwright-core'));}
const INDEX=path.resolve(process.argv[2]||'Index.html'),DIR=path.resolve(process.argv[3]||'.');const F=n=>path.join(DIR,n);
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  const row={id:'p-1',store_id:'s',name:'Remera',price:100,old_price:null,is_draft:false,available:true,revision:2,
   option_groups:[{id:'color',label:'Color',options:['Negro','Blanco']},{id:'talle',label:'Talle',options:['S']}],catalog_data:{description:''},photos:[]};
  window.__calls=[];window.__mode='ok';window.__state={version:1,rows:[row]};
  const handlers={
   listProducts:()=>window.__state,
   uploadPhotoData:a=>{window.__calls.push({...a,dataLen:a.data.length});
     if(window.__mode==='fail')throw Error('ImageKit rechazó la carga. Revisá la cuenta y su cuota. No se asoció ninguna foto.');
     const r=window.__state.rows[0];const next={...r,revision:r.revision+1,photos:[...r.photos,{id:'f',productId:r.id,color:a.color,url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='}]};
     window.__state={version:window.__state.version+1,rows:[next]};return {row:next,version:window.__state.version};}
  };
  function runner(ok,fail){return new Proxy({},{get:(_,k)=>{
   if(k==='withSuccessHandler')return f=>runner(f,fail);
   if(k==='withFailureHandler')return f=>runner(ok,f);
   return arg=>setTimeout(()=>{try{ok(handlers[k](arg));}catch(e){fail(e);}},900);}});}
  window.google={script:{run:runner(()=>{},()=>{})}};
 });
 await page.goto('file://'+INDEX);
 await page.waitForFunction(()=>document.getElementById('message').textContent.includes('cargado'));
 const res={};
 // A. procesamiento directo
 for(const f of ['paisaje-grande.jpg','vertical-exif6.jpg','png-grande.png','transparente.png','png-26mb.png','foto.heic','64mp.jpg']){
  await page.setInputFiles('#photo',F(f));
  res[f]=await page.evaluate(async()=>{const file=document.getElementById('photo').files[0];const t=performance.now();
   try{const r=await PilotPhoto.prepare(file);
    const img=new Image();await new Promise(ok=>{img.onload=ok;img.src='data:image/jpeg;base64,'+r.data;});
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);
    const px=(a,b)=>[...x.getImageData(a,b,1,1).data].slice(0,3);
    return {ok:true,w:r.width,h:r.height,kb:Math.round(r.bytes/1024),q:r.quality,sig:atob(r.data.slice(0,4)).charCodeAt(0)===255,
     topLeft:px(5,5),topRight:px(c.width-5,5),ms:Math.round(performance.now()-t)};}
   catch(e){return {ok:false,error:e.message,ms:Math.round(performance.now()-t)};}});
 }
 // B. flujo UI: abrir producto, elegir Blanco, subir, doble clic y cambio de color durante la subida
 await page.click('#products button');
 await page.selectOption('#photo-color','Blanco');
 await page.setInputFiles('#photo',F('paisaje-grande.jpg'));
 await page.click('#photo-form button[type=submit]');
 const during=await page.evaluate(()=>({save:document.querySelector('#editor button[type=submit]').disabled,upload:document.querySelector('#photo-form button[type=submit]').disabled,colorSel:document.getElementById('photo-color').disabled,msg:document.getElementById('message').textContent}));
 await page.evaluate(()=>{document.querySelector('#photo-form').dispatchEvent(new Event('submit',{cancelable:true}));document.getElementById('photo-color').value='Negro';});
 await page.waitForFunction(()=>document.getElementById('message').textContent.includes('Foto guardada'),{timeout:15000});
 res.flujo={during,calls:await page.evaluate(()=>window.__calls.map(c=>({productId:c.productId,revision:c.revision,color:c.color,kb:Math.round(c.dataLen*3/4/1024)}))),
  msg:await page.textContent('#message'),photosShown:await page.$$eval('#photos figure',f=>f.length),revisionText:await page.textContent('#revision')};
 // C. fallo de servidor: conserva archivo y reactiva botones
 await page.evaluate(()=>{window.__mode='fail';});
 await page.selectOption('#photo-color','Negro');
 await page.setInputFiles('#photo',F('vertical-exif6.jpg'));
 await page.click('#photo-form button[type=submit]');
 await page.waitForFunction(()=>document.getElementById('error').textContent.length>0,{timeout:15000});
 res.fallo={error:await page.textContent('#error'),msg:await page.textContent('#message'),fileKept:await page.evaluate(()=>document.getElementById('photo').files.length),buttonsEnabled:await page.evaluate(()=>!document.querySelector('#photo-form button[type=submit]').disabled),calls:await page.evaluate(()=>window.__calls.length),photosStill:await page.evaluate(()=>window.__state.rows[0].photos.length)};
 // D. HEIC indecodificable: mensaje y sin llamada
 await page.evaluate(()=>{window.__mode='ok';});const before=await page.evaluate(()=>window.__calls.length);
 await page.setInputFiles('#photo',F('foto.heic'));await page.click('#photo-form button[type=submit]');
 await page.waitForFunction(()=>document.getElementById('error').textContent.includes('no puede abrir'),{timeout:15000});
 res.heic={error:await page.textContent('#error'),newCalls:(await page.evaluate(()=>window.__calls.length))-before};
 // E. móvil: sin scroll horizontal
 res.movil=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth}));
 res.pageErrors=errors;
 console.log(JSON.stringify(res,null,1));
 const A=res;
 assert.deepEqual([A['paisaje-grande.jpg'].w,A['paisaje-grande.jpg'].h],[1600,1200]);
 assert.deepEqual([A['vertical-exif6.jpg'].w,A['vertical-exif6.jpg'].h],[1200,1600]);
 assert.ok(A['vertical-exif6.jpg'].topRight[0]>200&&A['vertical-exif6.jpg'].topRight[1]<60,'orientación EXIF no aplicada');
 for(const f of ['paisaje-grande.jpg','vertical-exif6.jpg','png-grande.png','transparente.png'])assert.ok(A[f].ok&&A[f].sig&&A[f].kb<=1536,f);
 assert.deepEqual(A['transparente.png'].topLeft,[255,255,255]);
 for(const f of ['png-26mb.png','foto.heic','64mp.jpg'])assert.equal(A[f].ok,false,f);
 assert.ok(A.flujo.during.save&&A.flujo.during.upload&&A.flujo.during.colorSel);
 assert.equal(A.flujo.calls.length,1);assert.equal(A.flujo.calls[0].color,'Blanco');assert.equal(A.flujo.calls[0].revision,2);
 assert.ok(A.fallo.fileKept===1&&A.fallo.buttonsEnabled&&A.fallo.photosStill===1);
 assert.equal(A.heic.newCalls,0);assert.equal(A.movil.scrollW,A.movil.clientW);assert.deepEqual(A.pageErrors,[]);
 console.log('PASS fotos en navegador real: 7 archivos + flujo + fallo + HEIC + móvil');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
