/* Netlify: 0 omite, 1 construye. Solo promocionar el manifiesto de esta tienda. */
const {spawnSync}=require('node:child_process');
const {validStoreId}=require('./build-store.cjs');
const id=process.argv[2];
if(!validStoreId(id)){console.error('Tienda inválida');process.exit(0);}
const before=process.env.CACHED_COMMIT_REF,after=process.env.COMMIT_REF;
if(!before||!after)process.exit(1); // Primera publicación: build-release exige manifiesto.
const result=spawnSync('git',['diff','--quiet',before,after,'--',`releases/${id}.json`]);
process.exit(result.status===0?0:1); // Ante error, reconstrucción fijada y verificada.
