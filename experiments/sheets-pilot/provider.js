(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../engine/core.js'));else root.SheetsPilotProvider=factory(root.CatalogCore);})(globalThis,function(core){
 function parseSnapshot(text){
  if(typeof text!=='string'||text.length>100000)throw Error('Catálogo público inválido.');
  const cells=core.parseCSV(text.replace(/^\uFEFF/,'' )).filter(r=>r.some(s=>s.trim()));
  if(cells.length!==1||cells[0].length!==1)throw Error('Se esperaba una instantánea completa.');
  const data=JSON.parse(cells[0][0]);
  if(data.schema!==1||typeof data.version!=='string'||!data.version||!Array.isArray(data.products)||data.products.length>10)throw Error('Versión pública inválida.');
  return {schema:1,version:data.version,products:core.validateProducts(data.products)};
 }
 function createProvider(readText){
  let current=null;
  return {version:()=>current,async load(){current=null;const data=parseSnapshot(await readText());current=data.version;return data.products;}};
 }
 return {parseSnapshot,createProvider};
});
