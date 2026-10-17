(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory(require('../src/product-mapper.cjs'),require('../../engine/media.js'));
  else root.PanelModel=factory(root.ProductMapper,root.CatalogMedia);
})(globalThis,function(mapper,media){
  'use strict';
  function amount(value){
    const text=String(value).trim();
    if(!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw Error('Usá un precio como 890,50, sin separadores de miles ni símbolos.');
    const number=Number(text.replace(',','.'));
    if(number>=10000000) throw Error('El precio debe ser menor a 10.000.000.');
    return number;
  }
  const state=row=>row.is_draft?'draft':row.available?'active':'inactive';
  function form(row){return {
    name:row?.name||'',price:row?.price==null?'':String(row.price),oldPrice:row?.old_price==null?'':String(row.old_price),
    category:row?.catalog_data?.category||'',short:row?.catalog_data?.short||'',description:row?.catalog_data?.description||'',
    state:row?state(row):'draft',groups:structuredClone(row?.option_groups||[])
  };}
  const asProduct=row=>({...row?.catalog_data,optionGroups:row?.option_groups||[]});
  function photoLinked(row){
    if(!row) return false;
    const p=asProduct(row),mode=media.imageMode(p);
    return media.allProductImages(p).length>0 && ['color','color_galeria'].includes(mode);
  }
  function prepare(input,original){
    if(!['draft','active','inactive'].includes(input.state)) throw Error('Elegí un estado válido.');
    const draft=input.state==='draft',name=input.name.trim();
    if(!draft && !name) throw Error('Escribí el nombre del producto.');
    let price,oldPrice;
    try{price=draft && !input.price.trim()?null:amount(input.price);}catch(e){throw Error('Precio: '+e.message);}
    try{oldPrice=input.oldPrice.trim()?amount(input.oldPrice):null;}catch(e){throw Error('Precio anterior: '+e.message);}
    const groups=structuredClone(input.groups);
    if(!Array.isArray(groups)) throw Error('Revisá las variantes.');
    const ids=new Set();
    for(const g of groups){
      if(!g || typeof g.id!=='string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(g.id) || ids.has(g.id)) throw Error('Hay grupos de variantes repetidos o inválidos.');
      ids.add(g.id);
      if(typeof g.label!=='string'||!g.label.trim()||!Array.isArray(g.options)||!g.options.length||g.options.some(o=>typeof o!=='string'||!o.trim())) throw Error('Cada variante necesita un nombre y al menos una opción.');
      g.label=g.label.trim(); g.options=g.options.map(o=>o.trim());
      if(new Set(g.options.map(o=>o.toLocaleLowerCase('es'))).size!==g.options.length) throw Error('No repitas opciones dentro de una variante.');
    }
    const colors=media.getRawColorGroup({optionGroups:groups});
    if(original && media.allProductImages(asProduct(original)).length && media.imageMode(asProduct(original))!==media.imageMode({...asProduct(original),optionGroups:groups})) throw Error('Las nuevas variantes cambiarían la asociación de fotografías. Conservá la galería actual hasta habilitar la gestión de fotos.');
    if(photoLinked(original) && JSON.stringify(colors)!==JSON.stringify(media.getRawColorGroup(asProduct(original)))) throw Error('Estos colores tienen fotografías asociadas. Conservá sus nombres y orden hasta habilitar la gestión de fotos.');
    const catalog_data={...structuredClone(original?.catalog_data||{}),category:input.category.trim(),short:input.short.trim(),description:input.description.trim()};
    const payload={name,price,old_price:oldPrice,is_draft:draft,available:input.state==='active',option_groups:groups,catalog_data};
    // Reuse the actual commercial validator even for incomplete drafts using temporary values.
    mapper.toProduct({...payload,id:original?.id||'validation-only',is_draft:false,name:name||'Borrador',price:price??0});
    return payload;
  }
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  function filter(rows,query,status){const q=normalize(query.trim());return rows.filter(row=>(!status||status==='all'||state(row)===status)&&normalize((row.name||'')+' '+(row.catalog_data?.category||'')).includes(q));}
  return {amount,state,form,prepare,filter,photoLinked};
});
