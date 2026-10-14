/* Verifica HEAD y autoriza reconstrucciones LOCALES solo para las tiendas indicadas. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {buildStore,artifactHash,validStoreId}=require('./build-store.cjs');
const {git}=require('./build-release.cjs');
const root=path.resolve(__dirname,'..');
function prepare(ids){
  if(!ids.length||ids.some(id=>!validStoreId(id)||!fs.existsSync(path.join(root,'stores',id,'store.json'))))throw new Error('Indicá una o más tiendas existentes.');
  if(git(root,['status','--porcelain']).trim())throw new Error('Guardá los cambios en Git antes de verificar una publicación.');
  const revision=git(root,['rev-parse','HEAD']).trim();
  const unit=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);
  for(const args of [['--test',...unit],['tests/browser-shared.cjs'],['tests/browser-parity.cjs'],['tests/browser-responsive.cjs']]){
    const run=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});
    if(run.status!==0)throw new Error('Verificación fallida; no se actualizaron manifiestos.');
  }
  if(git(root,['rev-parse','HEAD']).trim()!==revision||git(root,['status','--porcelain']).trim())throw new Error('El código cambió durante las pruebas; repetí la verificación.');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-verified-'));
  const manifests=ids.map(id=>{
    const out=buildStore(id,path.join(temporary,id));
    return [id,{schemaVersion:1,storeId:id,revision,artifactHash:artifactHash(out),verification:{unit:true,browser:true,visual:true}}];
  });
  fs.mkdirSync(path.join(root,'releases'),{recursive:true});
  for(const [id,manifest] of manifests)fs.writeFileSync(path.join(root,'releases',id+'.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Verificado localmente: '+ids.join(', ')+'. No se publicó nada.');
}
if(require.main===module){try{prepare(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={prepare};
