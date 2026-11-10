// Pruebas locales de fotos. Los dobles NO prueban ImageKit ni Google reales; eso se valida en la implementación v2.
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const photo=require('../photo.js');
const JPEG=Buffer.concat([Buffer.from([255,216,255,224]),Buffer.alloc(60,7)]);
const PNG=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(60,1)]);
function runtime({who={active:'owner@example.invalid'},upload=()=>({code:200,body:{url:'https://ik.imagekit.io/demo/p/x.jpg',fileId:'f1'}}),beforeAssociate}={}){
 let data={version:1,rows:[]},locked=false,writes=0;const calls=[];
 const props={OWNER_EMAIL:'owner@example.invalid',PRIVATE_SHEET_ID:'private',PUBLIC_SHEET_ID:'public',IMAGEKIT_URL_ENDPOINT:'https://ik.imagekit.io/demo',IMAGEKIT_PRIVATE_KEY:'test-only'};
 let reads=0;
 const context={SheetsPilot:require('../domain.js'),
  Session:{getActiveUser:()=>({getEmail:()=>who.active}),getEffectiveUser:()=>({getEmail:()=>props.OWNER_EMAIL})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},
  Utilities:{getUuid:()=> 'generated-1',base64Encode:s=>Buffer.from(String(s)).toString('base64'),base64Decode:s=>{if(!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('bad');return [...Buffer.from(s,'base64')].map(b=>b>127?b-256:b);},newBlob:(bytes,mime,name)=>({bytes,mime,name})},
  UrlFetchApp:{fetch:(url,options)=>{calls.push(options.payload);if(beforeAssociate)beforeAssociate(data);const r=upload(options);return {getResponseCode:()=>r.code,getContentText:()=>JSON.stringify(r.body)};}},
  SpreadsheetApp:{openById:()=>({getSheets:()=>[{getRange:()=>({getValue:()=>{reads++;return JSON.stringify(data);},setValue:v=>{assert.ok(locked,'write escaped lock');data=JSON.parse(v);writes++;}})}]}),flush:()=>{}},
  LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},releaseLock:()=>{locked=false;}})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Server.gs'),'utf8'),context);
 const input={name:'Remera',price:'100',oldPrice:'',category:'',short:'',description:'',state:'active',groups:[{id:'color',label:'Color',options:['Negro','Blanco']}]};
 const saved=context.saveProduct({input});
 return {context,row:saved.row,state:()=>data,writes:()=>writes,calls};
}
const b64=buf=>buf.toString('base64');
test('dimensiones: lado largo a 1600 px, vertical y horizontal, sin agrandar',()=>{
 assert.deepEqual(photo.targetSize(4032,3024,1600),{width:1600,height:1200});
 assert.deepEqual(photo.targetSize(3024,4032,1600),{width:1200,height:1600});
 assert.deepEqual(photo.targetSize(800,600,1600),{width:800,height:600});
 assert.throws(()=>photo.targetSize(0,10,1600));
});
test('entrada: rechaza vacío, >25 MB y el tope de píxeles (función de chequeo)',()=>{
 assert.throws(()=>photo.checkInput(null),/Elegí/);
 assert.throws(()=>photo.checkInput({size:26*1024*1024}),/25 MB/);
 assert.throws(()=>photo.checkPixels(10000,10000),/demasiado grande/);
 photo.checkPixels(4032,3024);photo.checkInput({size:5*1024*1024});
});
test('servidor: base64 inválido, demasiado largo o firma incorrecta no guardan ni llaman a ImageKit',()=>{
 const r=runtime(),base={productId:r.row.id,revision:r.row.revision,color:'Negro'};const w=r.writes();
 for(const data of ['no-es-base64!!!!!!!!!!!!!','A'.repeat(Math.ceil(2*1024*1024/3)*4+4),b64(Buffer.from('GIF89a'+'x'.repeat(40))),b64(Buffer.alloc(40,0)),123,undefined])
  assert.throws(()=>r.context.uploadPhotoData({...base,data}),/No se guardó nada/);
 assert.throws(()=>r.context.uploadPhotoData(null),/No se guardó nada/);
 assert.equal(r.calls.length,0);assert.equal(r.writes(),w);
});
test('servidor: ignora el tipo declarado y decide por la firma (JPEG y PNG)',()=>{
 const r=runtime();
 const a=r.context.uploadPhotoData({productId:r.row.id,revision:r.row.revision,color:'Negro',data:b64(JPEG),mime:'image/heic'});
 assert.equal(r.calls[0].file.mime,'image/jpeg');assert.equal(a.row.photos[0].color,'Negro');
 const b=r.context.uploadPhotoData({productId:r.row.id,revision:a.row.revision,color:'Blanco',data:b64(PNG),mime:'image/jpeg'});
 assert.equal(r.calls[1].file.mime,'image/png');assert.deepEqual(b.row.photos.map(p=>p.color),['Negro','Blanco']);
});
test('servidor: identidad ajena y revisión vieja fallan antes de subir',()=>{
 const owner=runtime();const stale={productId:owner.row.id,revision:owner.row.revision+5,color:'Negro',data:b64(JPEG)};
 assert.throws(()=>owner.context.uploadPhotoData(stale),/CONFLICT/);assert.equal(owner.calls.length,0);
 const who={active:'owner@example.invalid'};const r=runtime({who});
 who.active='stranger@example.invalid'; // otra cuenta intenta subir sobre un producto existente
 assert.throws(()=>r.context.uploadPhotoData({productId:r.row.id,revision:r.row.revision,color:'Negro',data:b64(JPEG)}),/Acceso/);assert.equal(r.calls.length,0);
});
test('servidor: color inexistente no sube',()=>{
 const r=runtime();assert.throws(()=>r.context.uploadPhotoData({productId:r.row.id,revision:r.row.revision,color:'Rojo',data:b64(JPEG)}));assert.equal(r.calls.length,0);
});
test('servidor: fallo de ImageKit no asocia nada',()=>{
 const r=runtime({upload:()=>({code:500,body:{}})});const w=r.writes();
 assert.throws(()=>r.context.uploadPhotoData({productId:r.row.id,revision:r.row.revision,color:'Negro',data:b64(JPEG)}),/No se asoció/);
 assert.equal(r.writes(),w);assert.equal(r.state().rows[0].photos?.length||0,0);
});
test('servidor: si otro guardado cambia la revisión durante la subida, no asocia y avisa del huérfano',()=>{
 const r=runtime({beforeAssociate:data=>{data.rows[0].revision++;}});const w=r.writes();
 assert.throws(()=>r.context.uploadPhotoData({productId:r.row.id,revision:r.row.revision,color:'Negro',data:b64(JPEG)}),/NO se asoció.*CONFLICT.*huérfano/);
 assert.equal(r.writes(),w);
});
test('servidor: la ruta original por formulario sigue funcionando (compatibilidad v1)',()=>{
 const r=runtime();const res=r.context.uploadPhoto({productId:r.row.id,revision:String(r.row.revision),color:'Negro',photo:{getBytes:()=>[...JPEG].map(b=>b>127?b-256:b)}});
 assert.equal(res.row.photos[0].color,'Negro');
});

// --- Revisión de ChatGPT sobre a4cda99 ---
function fakeDoc(toBlobResult,{noContext=false}={}){
 const created=[];
 return {created,createElement:()=>{const c={width:0,height:0,
  getContext:()=>noContext?null:{fillRect(){},drawImage(){},set fillStyle(_){}} ,
  toBlob:cb=>cb(typeof toBlobResult==='function'?toBlobResult():toBlobResult)};created.push(c);return c;}};
}
const img={naturalWidth:4000,naturalHeight:3000};
test('render libera el canvas cuando toBlob devuelve null',async()=>{
 const doc=fakeDoc(null);
 await assert.rejects(()=>photo._render(img,1600,doc),/no pudo procesar/);
 assert.equal(doc.created.length,1);assert.equal(doc.created[0].width,0);assert.equal(doc.created[0].height,0);
});
test('render libera el canvas cuando no hay contexto 2D',async()=>{
 const doc=fakeDoc({size:10},{noContext:true});
 await assert.rejects(()=>photo._render(img,1600,doc),/no pudo procesar/);
 assert.equal(doc.created[0].width,0);assert.equal(doc.created[0].height,0);
});
test('render libera el canvas al terminar bien y cuando no entra en el peso',async()=>{
 const ok=fakeDoc({size:1000});const r=await photo._render(img,1600,ok);
 assert.equal(r.width,1600);assert.equal(ok.created[0].width,0);
 const heavy=fakeDoc({size:5*1024*1024});assert.equal(await photo._render(img,1600,heavy),null);
 assert.equal(heavy.created[0].width,0);assert.equal(heavy.created[0].height,0);
});
function png(w,h){const b=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;}
function jpeg(w,h,app1=0){const parts=[Buffer.from([255,216])];
 if(app1){const seg=Buffer.alloc(4+app1);seg[0]=255;seg[1]=225;seg.writeUInt16BE(app1+2,2);parts.push(seg);} // APP1 (EXIF) grande antes del SOF
 const sof=Buffer.from([255,192,0,17,8,0,0,0,0,3,1,17,0,2,17,1,3,17,1]);sof.writeUInt16BE(h,5);sof.writeUInt16BE(w,7);parts.push(sof,Buffer.from([255,218,0,2]));return Buffer.concat(parts);}
test('cabecera: lee tamaño de PNG y JPEG (con EXIF antes del SOF) sin decodificar',()=>{
 assert.deepEqual(photo.headerSize(png(8000,8000)),{width:8000,height:8000});
 assert.deepEqual(photo.headerSize(jpeg(4032,3024)),{width:4032,height:3024});
 assert.deepEqual(photo.headerSize(jpeg(4032,3024,60000)),{width:4032,height:3024});
 assert.equal(photo.headerSize(Buffer.from('....ftypheic....')),null); // HEIC: no se reconoce, no bloquea
 assert.equal(photo.headerSize(Buffer.from([255,216,255,218,0,2])),null);
});
test('cabecera: rechaza >60 MP ANTES de decodificar y deja pasar lo desconocido',async()=>{
 const file=buf=>({size:buf.length,slice:(a,b)=>({arrayBuffer:async()=>buf.subarray(a,b).buffer.slice(buf.byteOffset+a,buf.byteOffset+Math.min(b,buf.length))})});
 await assert.rejects(()=>photo.checkHeader(file(png(8000,8000))),/demasiado grande/);
 await assert.rejects(()=>photo.checkHeader(file(jpeg(9000,9000,1000))),/demasiado grande/);
 assert.deepEqual(await photo.checkHeader(file(jpeg(4032,3024))),{width:4032,height:3024});
 assert.equal(await photo.checkHeader(file(Buffer.from('....ftypheic....'))),null);
});
test('prepare: un JPEG de 81 MP se rechaza sin llegar a decodificar',async()=>{
 const buf=jpeg(9000,9000);let decoded=false;
 const doc={createElement:()=>{decoded=true;return {};}};
 const file={size:buf.length,slice:(a,b)=>({arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset+a,buf.byteOffset+Math.min(b,buf.length))})};
 await assert.rejects(()=>photo.prepare(file,doc),/demasiado grande/);assert.equal(decoded,false);
});
