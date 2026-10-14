/* Compatibilidad de la orden de fase 1; sin lógica duplicada. */
const {buildStore}=require('./build-store.cjs');
function exportCatalog(catalog,output){
  const id=({'demos/ropa':'luna-urban','demos/pasteleria':'pasteleria-demo','template/catalogo-base':'catalogo-base'})[catalog]||catalog;
  return buildStore(id,output);
}
if(require.main===module){try{console.log(exportCatalog(process.argv[2],process.argv[3]));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={exportCatalog};
