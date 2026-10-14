/* Contrato: provider.load(): Promise<Product[]>; [] válido; fallo => excepción. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.Catalog=factory(root.CatalogCore);})(globalThis,function(core){
function createCatalog(provider){
  if(!provider||typeof provider.load!=='function')throw new Error('Proveedor de catálogo inválido.');
  return {async load(){return core.validateProducts(await provider.load());}};
}
return {createCatalog};
});
