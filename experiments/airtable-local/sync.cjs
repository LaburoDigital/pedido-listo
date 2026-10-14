/* Experimento local. Transporte inyectado: no contiene credenciales ni llamadas a Airtable. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const core=require('../../engine/core.js');
function createSync({directory,storeId,getPage,getPhoto}){
  if(!/^[a-z0-9-]{1,30}$/.test(storeId))throw Error('Comercio inválido');
  fs.mkdirSync(path.join(directory,'photos'),{recursive:true});
  let snapshot=null,error='Todavía no se sincronizó el catálogo.',running=false;
  const cached=new Map();
  async function refresh(){
    if(running)throw Error('Ya hay una sincronización en curso.');
    running=true;
    try{
      const records=[],offsets=new Set();let offset;
      do{
        if(offsets.size>=10||offsets.has(offset))throw Error('Paginación inválida o demasiado extensa.');
        offsets.add(offset);const page=await getPage(offset);
        if(!page||!Array.isArray(page.records))throw Error('Respuesta de catálogo inválida.');
        records.push(...page.records);offset=page.offset;
        if(offset!==undefined&&(typeof offset!=='string'||!offset))throw Error('Paginación inválida.');
      }while(offset);
      const ids=new Set(),products=[];
      for(const record of records){
        if(!record||!/^rec[A-Za-z0-9]+$/.test(record.id)||ids.has(record.id))throw Error('Registro inválido o duplicado.');
        ids.add(record.id);const f=record.fields;
        if(!f||typeof f!=='object'||Array.isArray(f))throw Error('Faltan campos del producto.');
        // Airtable omite las casillas no marcadas: se interpretan como borrador.
        if(f.Activo!==undefined&&typeof f.Activo!=='boolean')throw Error('Activo debe ser una casilla.');
        if(f.Activo!==true)continue;
        try{
          const groups=[];
          for(const [field,id] of [['Talles','talle'],['Colores','color']]){
            const options=f[field]??[];
            if(!Array.isArray(options))throw Error(`${field}: seleccioná opciones de la lista.`);
            if(options.length)groups.push({id,label:field==='Talles'?'Talle':'Color',options});
          }
          const product=core.validateProducts([{id:storeId+':'+record.id,name:f.Producto,price:f.Precio,description:f.Descripción||'',short:f.Descripción||'',category:f.Categoría||'Productos',available:true,optionGroups:groups}])[0];
          if(!Array.isArray(f.Fotos)||!f.Fotos.length||f.Fotos.length>12)throw Error('Agregá entre 1 y 12 fotos.');
          const images=[];
          for(const attachment of f.Fotos){
            if(!attachment||!/^att[A-Za-z0-9]+$/.test(attachment.id)||!/^https:\/\//.test(attachment.url))throw Error('Adjunto de foto inválido.');
            let image=cached.get(attachment.id);
            if(!image||!fs.existsSync(path.join(directory,image))){
              const bytes=await getPhoto(attachment);
              if(!Buffer.isBuffer(bytes)||bytes.length>5*1024*1024||bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('La foto debe ser PNG válido de hasta 5 MB en esta prueba.');
              image='photos/'+crypto.createHash('sha256').update(storeId).update(bytes).digest('hex')+'.png';
              if(!fs.existsSync(path.join(directory,image)))fs.writeFileSync(path.join(directory,image),bytes,{flag:'wx'});
              cached.set(attachment.id,image);
            }
            images.push(image);
          }
          products.push({...product,image:images[0],images,gallery:images.slice(1),mediaMode:'galeria'});
        }catch(e){throw Error(`${f.Producto||record.id}: ${e.message}`);}
      }
      const validated=core.validateProducts(products);
      const next={syncedAt:new Date().toISOString(),products:validated};
      fs.writeFileSync(path.join(directory,'catalog.next.json'),JSON.stringify(next,null,2));
      fs.renameSync(path.join(directory,'catalog.next.json'),path.join(directory,'catalog.json'));
      snapshot=next;error='';return structuredClone(next);
    }catch(e){error=e.message;throw e;}finally{running=false;}
  }
  return {refresh,load(){if(error)throw Error(error);return structuredClone(snapshot.products);},state(){return {ready:!error,error,syncedAt:snapshot?.syncedAt||null};}};
}
module.exports={createSync};
