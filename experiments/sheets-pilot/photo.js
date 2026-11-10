/* Preparación de fotos en el navegador: decodifica, reduce y convierte a JPEG antes de enviar.
   Sin librerías. La orientación la aplica el propio navegador al decodificar (no se rota a mano). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PilotPhoto=api;})(globalThis,function(){
 'use strict';
 const LIMITS=Object.freeze({
  maxInputBytes:25*1024*1024,   // límite de entrada: no garantiza que el equipo pueda decodificarla
  // Tope de píxeles. Se aplica en dos lugares: (1) ANTES de decodificar, leyendo el tamaño en la cabecera
  // de JPEG/PNG, si aparece en los primeros headerBytes; (2) después de cargar la imagen y antes de dibujarla.
  // El chequeo (2) NO evita la memoria que el navegador ya usó al cargarla: solo evita el canvas grande.
  maxPixels:60*1000*1000,
  headerBytes:512*1024,          // cuánto del archivo se lee para buscar las dimensiones
  maxSide:1600,                 // lado largo final
  fallbackSide:1200,            // segundo intento si no entra en el peso
  maxOutputBytes:1.5*1024*1024, // por debajo del límite del servidor (2 MB)
  qualities:[0.85,0.78,0.7,0.62,0.55] // intentos acotados: nunca bucles abiertos
 });
 const MESSAGES=Object.freeze({
  noFile:'Elegí o sacá una foto.',
  tooLarge:'La foto pesa más de 25 MB. Elegí otra o sacala de nuevo.',
  undecodable:'Este navegador no puede abrir esa foto (por ejemplo, algunas HEIC). Probá elegirla desde la galería, sacarla de nuevo o usar otro navegador. No se subió nada.',
  tooManyPixels:'La foto es demasiado grande para procesarla en este equipo. Elegí otra. No se subió nada.',
  canvas:'El navegador no pudo procesar la foto. Probá de nuevo o con otra foto. No se subió nada.',
  heavy:'No se pudo achicar la foto lo suficiente sin perder demasiada calidad. Elegí otra. No se subió nada.'
 });
 function targetSize(width,height,maxSide){
  if(!(width>0&&height>0))throw Error(MESSAGES.undecodable);
  const scale=Math.min(1,maxSide/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
 }
 function checkInput(file){
  if(!file||typeof file.size!=='number')throw Error(MESSAGES.noFile);
  if(file.size>LIMITS.maxInputBytes)throw Error(MESSAGES.tooLarge);
  if(file.size<16)throw Error(MESSAGES.undecodable);
 }
 function checkPixels(width,height){if(width*height>LIMITS.maxPixels)throw Error(MESSAGES.tooManyPixels);}
 // Lee ancho y alto de la cabecera sin decodificar. Devuelve null si no lo reconoce (HEIC, WebP, archivos raros):
 // en ese caso no se bloquea y queda el chequeo posterior.
 function headerSize(bytes){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(b.length>=24&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71){ // PNG: IHDR en posición fija
   const v=new DataView(b.buffer,b.byteOffset,b.byteLength);return {width:v.getUint32(16),height:v.getUint32(20)};
  }
  if(b.length>=4&&b[0]===255&&b[1]===216){ // JPEG: recorrer marcadores hasta un SOF
   let i=2;
   while(i+9<b.length){
    if(b[i]!==255){i++;continue;}
    const m=b[i+1];
    if(m===255){i++;continue;}
    if(m===216||m===1||(m>=208&&m<=215)){i+=2;continue;}
    const len=(b[i+2]<<8)|b[i+3];if(len<2)return null;
    if(m>=192&&m<=207&&m!==196&&m!==200&&m!==204)return {height:(b[i+5]<<8)|b[i+6],width:(b[i+7]<<8)|b[i+8]};
    if(m===218)return null; // empezó la imagen sin SOF previo
    i+=2+len;
   }
  }
  return null;
 }
 async function checkHeader(file){
  if(typeof file.slice!=='function')return null;
  let buffer;try{buffer=await file.slice(0,LIMITS.headerBytes).arrayBuffer();}catch(_){return null;}
  const size=headerSize(buffer);if(size&&size.width>0&&size.height>0)checkPixels(size.width,size.height);
  return size;
 }
 // Base64 sin prefijo data:, con verificación de tamaño ANTES de convertir.
 function base64Length(bytes){return Math.ceil(bytes/3)*4;}
 // --- Solo navegador ---
 function decode(file,doc){
  return new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(file),img=doc.createElement('img');
   const done=()=>URL.revokeObjectURL(url);
   img.decoding='async';
   img.onload=()=>{done();resolve(img);};
   img.onerror=()=>{done();reject(Error(MESSAGES.undecodable));};
   img.src=url;
  });
 }
 function toBlob(canvas,quality){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));}
 async function render(img,side,doc){
  const size=targetSize(img.naturalWidth,img.naturalHeight,side);
  const canvas=doc.createElement('canvas');
  try{
   canvas.width=size.width;canvas.height=size.height;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error(MESSAGES.canvas);
   ctx.fillStyle='#fff';ctx.fillRect(0,0,size.width,size.height); // PNG con transparencia → fondo blanco
   ctx.drawImage(img,0,0,size.width,size.height);
   for(const quality of LIMITS.qualities){
    const blob=await toBlob(canvas,quality);
    if(!blob)throw Error(MESSAGES.canvas);
    if(blob.size<=LIMITS.maxOutputBytes)return {blob,width:size.width,height:size.height,quality};
   }
   return null;
  }finally{canvas.width=0;canvas.height=0;} // liberar memoria también ante errores
 }
 function readBase64(blob){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const s=String(r.result),i=s.indexOf(',');resolve(i>=0?s.slice(i+1):'');};r.onerror=()=>reject(Error(MESSAGES.canvas));r.readAsDataURL(blob);});
 }
 async function prepare(file,doc=globalThis.document){
  checkInput(file);
  await checkHeader(file);            // tope de píxeles ANTES de decodificar (JPEG/PNG)
  const img=await decode(file,doc);
  try{
   checkPixels(img.naturalWidth,img.naturalHeight); // resto de formatos: después de cargar, antes del canvas
   const result=await render(img,LIMITS.maxSide,doc)||await render(img,LIMITS.fallbackSide,doc);
   if(!result)throw Error(MESSAGES.heavy);
   if(result.blob.size>LIMITS.maxOutputBytes)throw Error(MESSAGES.heavy);
   const data=await readBase64(result.blob);
   if(!data||data.length>base64Length(LIMITS.maxOutputBytes))throw Error(MESSAGES.heavy);
   return {data,bytes:result.blob.size,width:result.width,height:result.height,quality:result.quality,original:{width:img.naturalWidth,height:img.naturalHeight,bytes:file.size,type:file.type||'desconocido'}};
  }finally{img.src='';}
 }
 return {LIMITS,MESSAGES,targetSize,checkInput,checkPixels,headerSize,checkHeader,base64Length,prepare,_render:render};
});
