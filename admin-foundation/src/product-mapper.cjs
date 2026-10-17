(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory(require('../../engine/core.js'),require('../../engine/media.js'));
  else root.ProductMapper=factory(root.CatalogCore,root.CatalogMedia);
})(globalThis,function(core,media){
'use strict';
const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const validId=v=>typeof v==='string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(v);
const stringList=v=>Array.isArray(v) && v.every(s=>typeof s==='string' && s.trim());
const textFields=['category','short','description','pricePrefix','image','mediaMode','imagePosition','imageFit','badge','layout'];
const lists=['gallery','images','imageLabels','tags'];
const flags=['featured','offer'];
const allowed=new Set([...textFields,...lists,...flags,'order']);

// Postgres numeric is returned as a JSON number (or canonical decimal text).
// Regional human input belongs in the future editor, never in this adapter.
function price(value,optional=false) {
  if(optional && (value===null || value===undefined)) return null;
  if((typeof value!=='number' && typeof value!=='string') ||
      (typeof value==='string' && !/^\d+(\.\d{1,2})?$/.test(value))) throw Error('Precio de base inválido.');
  const amount=core.parsePrice(value);
  if(amount>=10000000) throw Error('Precio fuera del rango admitido.');
  return amount;
}
function validateMetadata(data) {
  if(!object(data) || Object.keys(data).some(k=>!allowed.has(k))) throw Error('Metadatos de catálogo inválidos.');
  for(const key of textFields) if(key in data && typeof data[key]!=='string') throw Error(`Campo inválido: ${key}.`);
  for(const key of lists) if(key in data && !stringList(data[key])) throw Error(`Lista inválida: ${key}.`);
  for(const key of flags) if(key in data && typeof data[key]!=='boolean') throw Error(`Indicador inválido: ${key}.`);
  if('order' in data && !Number.isSafeInteger(data.order)) throw Error('Orden inválido.');
  for(const [key,values] of Object.entries({mediaMode:['auto','galeria','color','color_galeria'],imageFit:['auto','cover','contain'],layout:['','featured','compact']})) {
    if(key in data && !values.includes(data[key])) throw Error(`Valor inválido: ${key}.`);
  }
  if('imagePosition' in data && !/^[a-z0-9% .-]*$/i.test(data.imagePosition)) throw Error('Posición de imagen inválida.');
  for(const url of [data.image,...(data.gallery||[]),...(data.images||[])].filter(Boolean)) {
    // References only: this phase neither fetches nor uploads images.
    if(!/^https:\/\/[^\s]+$/i.test(url) && !/^assets\/[a-zA-Z0-9_./-]+$/.test(url)) throw Error('Referencia de imagen inválida.');
    if(url.split('/').includes('..')) throw Error('Referencia de imagen inválida.');
  }
}
function toProduct(row) {
  if(!object(row) || !validId(row.id)) throw Error('ID permanente inválido.');
  if(typeof row.is_draft!=='boolean' || typeof row.available!=='boolean') throw Error('Estado de producto inválido.');
  if(row.is_draft) throw Error('Un borrador no es un producto vendible.');
  validateMetadata(row.catalog_data);
  if(!Array.isArray(row.option_groups) || row.option_groups.some(g=>!object(g) || typeof g.label!=='string' || !g.label.trim())) throw Error('Opciones inválidas.');
  const candidate={...structuredClone(row.catalog_data),id:row.id,name:row.name,
    price:price(row.price),oldPrice:price(row.old_price,true),available:true,
    optionGroups:structuredClone(row.option_groups)};
  // Validate even an inactive, complete product: core otherwise filters it out.
  const product=core.validateProducts([candidate])[0];
  product.available=row.available;
  const colors=media.getRawColorGroup(product)?.options || [];
  if(new Set(colors.map(c=>c.trim().toLowerCase())).size!==colors.length) throw Error('Colores duplicados para el selector de fotografías.');
  const images=media.allProductImages(product);
  if(product.mediaMode==='color' && (!colors.length || images.length!==colors.length)) {
    throw Error('Debe haber exactamente una fotografía diferente por color.');
  }
  if(product.mediaMode==='color_galeria') {
    const views=product.imageLabels || [];
    if(!colors.length || !images.length || (views.length ? images.length!==colors.length*views.length : images.length%colors.length!==0)) {
      throw Error('Galería por color incompleta: revisá el orden y las vistas de cada color.');
    }
  }
  return product;
}
function scopedRows(rows,storeId) {
  if(typeof storeId!=='string' || !storeId || !Array.isArray(rows)) throw Error('Catálogo o comercio inválido.');
  const ids=new Set();
  for(const row of rows) {
    if(!object(row) || row.store_id!==storeId) throw Error('El catálogo contiene datos de otro comercio.');
    if(!validId(row.id) || ids.has(row.id)) throw Error('ID inválido o duplicado.');
    ids.add(row.id);
    if(typeof row.is_draft!=='boolean' || typeof row.available!=='boolean') throw Error('Estado de producto inválido.');
  }
  return rows;
}
function mapCatalog(rows,storeId) {
  return scopedRows(rows,storeId).filter(r=>!r.is_draft && r.available).map(toProduct);
}
function legacyProducts(rows,storeId) {
  const scoped=scopedRows(rows,storeId), aliases=new Map(scoped.map(r=>[r.id,r.id]));
  return scoped.map(row=>{
    const cartIds=row.legacy_cart_ids??[], names=row.legacy_names??[];
    if(!Array.isArray(cartIds) || !cartIds.every(validId) || !stringList(names)) throw Error('Equivalencias antiguas inválidas.');
    for(const alias of cartIds) {
      if(aliases.has(alias) && aliases.get(alias)!==row.id) throw Error('Equivalencia antigua ambigua.');
      aliases.set(alias,row.id);
    }
    return {id:row.id,names:[...names],cartIds:[...cartIds]};
  });
}
function createProvider(readRows,storeId) {
  if(typeof readRows!=='function') throw Error('Lector de catálogo inválido.');
  return {async load(){return mapCatalog(await readRows(storeId),storeId);}};
}
return {toProduct,mapCatalog,legacyProducts,createProvider};
});
