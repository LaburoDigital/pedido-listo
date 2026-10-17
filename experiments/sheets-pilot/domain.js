(function(root,factory){
 if(typeof module==='object'&&module.exports) module.exports=factory(require('../../admin-foundation/panel/model.js'),require('../../admin-foundation/src/product-mapper.cjs'));
 else root.SheetsPilot=factory(root.PanelModel,root.ProductMapper);
})(globalThis,function(model,mapper){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const colors=row=>(row.option_groups.find(g=>g.id==='color')||{options:[]}).options;
 function keys(value,allowed){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))) throw Error('Campos no permitidos.');
 }
 function revision(row,expected){if(!Number.isSafeInteger(expected)||row.revision!==expected) throw Error('CONFLICT: otro guardado cambió este producto. Recargá sus datos.');}
 function save(original,command,newId){
  keys(command,['id','revision','input']);
  keys(command.input,['name','price','oldPrice','category','short','description','state','groups']);
  if(original){if(command.id!==original.id) throw Error('ID inmutable.');revision(original,command.revision);}
  else if(command.id!=null||command.revision!=null) throw Error('El servidor asigna el ID.');
  const input=command.input;
  for(const field of ['name','price','oldPrice','category','short','description','state']) if(typeof input[field]!=='string'||input[field].length>2000) throw Error('Campo inválido o demasiado largo.');
  if(!Array.isArray(input.groups)||input.groups.length>2||input.groups.some(g=>!['color','talle'].includes(g.id)||g.options?.length>8)) throw Error('Piloto: máximo color y talle, ocho opciones por grupo.');
  // Photos live in a separate server-controlled association list. Never accept URLs from a product form.
  const payload=model.prepare(input,original);
  const row={...payload,id:original?.id||newId,store_id:'sheets-pilot',revision:(original?.revision||0)+1,photos:clone(original?.photos||[])};
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(row.id)) throw Error('ID inválido.');
  if(original?.photos.length&&JSON.stringify(colors(original))!==JSON.stringify(colors(row))) throw Error('Conservá los colores mientras tengan fotografías asociadas en este piloto.');
  encode(row);return row;
 }
 function attach(original,expected,asset){
  revision(original,expected);
  keys(asset,['id','productId','color','url']);
  if(asset.productId!==original.id||typeof asset.id!=='string'||!asset.id||!/^https:\/\/ik\.imagekit\.io\/[^\s]+$/.test(asset.url)) throw Error('Fotografía inválida.');
  if(colors(original).length?!colors(original).includes(asset.color):asset.color!=='') throw Error('Color desconocido.');
  const row=clone(original);
  // One view per color is the intentional minimum probe; existing full-gallery mapper is retained.
  row.photos=row.photos.filter(p=>p.color!==asset.color);row.photos.push(clone(asset));row.revision++;
  encode(row);return row;
 }
 function snapshot(rows,version){
  if(typeof version!=='string'||!version||version.length>80||!Array.isArray(rows)||rows.length>10) throw Error('Publicación inválida o fuera del límite del piloto.');
  const products=rows.filter(r=>!r.is_draft&&r.available).map(row=>{
   const ordered=colors(row).length?colors(row).map(color=>row.photos.find(p=>p.color===color)):row.photos;
   if(!ordered.length||ordered.some(p=>!p)) throw Error('Faltan fotografías: agregá una por color antes de publicar.');
   return mapper.toProduct({...row,catalog_data:{...row.catalog_data,mediaMode:colors(row).length?'color':'galeria',image:ordered[0].url,gallery:ordered.slice(1).map(p=>p.url)}});
  });
  const result={schema:1,version,products};encode(result);return result;
 }
 function encode(value){const json=JSON.stringify(value);if(json.length>45000) throw Error('Límite de tamaño del piloto alcanzado.');return json;}
 return {save,attach,snapshot,encode,revision};
});
