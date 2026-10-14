/* Reconstruye una publicación verificada desde su commit exacto. No despliega. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {artifactHash,validStoreId}=require('./build-store.cjs');
function git(repo,args,encoding='utf8'){
  const r=spawnSync('git',args,{cwd:repo,encoding,maxBuffer:16*1024*1024});
  if(r.status!==0)throw new Error(`Git: ${String(r.stderr).trim()}`);return r.stdout;
}
function snapshot(repo,revision,destination){
  const entries=git(repo,['ls-tree','-r','-z',revision,'--','engine','presentation','stores','tools/build-store.cjs']).split('\0').filter(Boolean);
  if(!entries.length)throw new Error('No se encontró la revisión de la publicación.');
  for(const entry of entries){
    const [info,file]=entry.split('\t');
    if(!info.startsWith('100644 ')&&!info.startsWith('100755 '))throw new Error('Tipo de archivo no permitido en publicación.');
    const target=path.resolve(destination,file);
    if(!target.startsWith(path.resolve(destination)+path.sep))throw new Error('Ruta inválida en revisión.');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,git(repo,['show',`${revision}:${file}`],null));
  }
}
function buildRelease(id,output,repo=path.resolve(__dirname,'..')){
  if(!validStoreId(id))throw new Error('ID de tienda inválido.');
  let manifest;
  try{manifest=JSON.parse(fs.readFileSync(path.join(repo,'releases',id+'.json'),'utf8'));}catch{throw new Error('Falta un manifiesto de publicación válido. Ejecutá prepare-release.');}
  if(manifest.schemaVersion!==1||manifest.storeId!==id||! /^[a-f0-9]{40}$/.test(manifest.revision)||! /^[a-f0-9]{64}$/.test(manifest.artifactHash)||!['unit','browser','visual'].every(key=>manifest.verification?.[key]===true))throw new Error('Manifiesto sin verificación completa.');
  const destination=path.resolve(output||path.join(repo,'dist',id));
  if(fs.existsSync(destination))throw new Error('El destino ya existe.');
  if(destination===repo||repo.startsWith(destination+path.sep)||destination.startsWith(path.join(repo,'stores')+path.sep)||destination.startsWith(path.join(repo,'.git')+path.sep))throw new Error('Destino inválido.');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-pinned-'));
  const source=path.join(temporary,'source');snapshot(repo,manifest.revision,source);
  const candidate=path.join(temporary,'site');
  const build=spawnSync(process.execPath,[path.join(source,'tools/build-store.cjs'),id,candidate],{cwd:source,encoding:'utf8'});
  if(build.status!==0)throw new Error(`No se pudo reconstruir: ${build.stderr}`);
  if(artifactHash(candidate)!==manifest.artifactHash)throw new Error('La huella de la publicación no coincide. No se preparó el destino.');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.mkdirSync(destination);
  fs.cpSync(candidate,destination,{recursive:true,errorOnExist:true,force:false});
  return destination;
}
if(require.main===module){try{console.log(buildRelease(process.argv[2],process.argv[3]));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildRelease,snapshot,git};
