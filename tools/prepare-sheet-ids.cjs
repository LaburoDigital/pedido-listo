/* Lectura y preparación local. No contiene operaciones de escritura a Google. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const core=require('../engine/core.js');
const {rowToProduct}=require('../engine/sources.js');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function migrationRows(csv){
  const raw=core.parseCSV(String(csv).replace(/^\uFEFF/,''));
  // El parser conserva un registro final vacío cuando el archivo termina en salto.
  if(/[\r\n]$/.test(csv)&&raw.at(-1).length===1&&raw.at(-1)[0]==='')raw.pop();
  if(raw.some(row=>row.every(cell=>!cell.trim())))throw new Error('Filas vacías: revisar la copia antes de generar referencias de fila.');
  if(raw[0].some(header=>!/[a-z0-9]/i.test(header.normalize('NFD'))))throw new Error('Encabezado vacío o no compatible: no se puede verificar sin perder columnas.');
  return core.csvToObjects(csv);
}
function planIds(csv,aliases,assignments=[]){
  const rows=migrationRows(csv),ids=new Set();
  const reserved=new Set(aliases.flatMap(a=>[a.id,...(a.cartIds||[])]));
  for(const assignment of assignments){
    if(reserved.has(assignment.id))throw new Error(`ID reservado por un producto anterior: ${assignment.id}.`);
    reserved.add(assignment.id);
  }
  const identities=[...aliases,...assignments.map(a=>({id:a.id,names:[a.name],cartIds:[]}))];
  const products=rows.map((row,index)=>{
    const name=String(row.nombre||row.producto||'').trim();
    const explicit=String(row.id??row.producto_id??row.sku??'').trim();
    const matches=identities.filter(a=>a.names.includes(name));
    if(matches.length>1)throw new Error(`Equivalencia ambigua: ${name}.`);
    const id=core.resolveId(row,identities);
    if(explicit&&matches.length===1&&matches[0].id!==id)throw new Error(`ID existente en conflicto: ${name}. Revisar manualmente.`);
    if(ids.has(id))throw new Error(`ID duplicado: ${id}.`);ids.add(id);
    const legacy=aliases.find(a=>a.id===id);
    return {rowAtSnapshot:index+2,name,id,previousId:explicit||null,needsWrite:!String(row.id||'').trim(),cartIds:legacy?.cartIds||[]};
  });
  // Las filas inactivas también deben tener identidad antes de migrar.
  core.validateProducts(rows.map((row,index)=>rowToProduct({...row,id:products[index].id},index,aliases)).filter(Boolean));
  return {requiresIdColumn:!rows.length?!/^id(?:,|\r?\n)/.test(csv):!Object.hasOwn(rows[0],'id'),products,unusedAliases:aliases.filter(a=>!ids.has(a.id)).map(a=>a.id)};
}
function verifyIds(before,after,aliases,assignments=[]){
  const plan=planIds(before,aliases,assignments),oldRows=migrationRows(before),newRows=migrationRows(after);
  if(newRows.length!==oldRows.length)throw new Error('Cambió la cantidad de productos.');
  const withoutId=row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='id').sort(([a],[b])=>a<b?-1:a>b?1:0));
  const expected=new Map(plan.products.map((p,i)=>[p.id,withoutId(oldRows[i])])),seen=new Set();
  for(const row of newRows){
    if(!row.id||!expected.has(row.id)||seen.has(row.id))throw new Error('ID faltante, inesperado o duplicado.');seen.add(row.id);
    if(JSON.stringify(withoutId(row))!==JSON.stringify(expected.get(row.id)))throw new Error(`Cambios fuera de id en ${row.id}.`);
  }
  planIds(after,aliases,assignments);
  return {ok:true,products:seen.size};
}
async function backupAndPlan(storeId,output,root=path.resolve(__dirname,'..')){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeId))throw new Error('Tienda inválida.');
  const store=JSON.parse(fs.readFileSync(path.join(root,'stores',storeId,'store.json')));
  const aliasBytes=fs.readFileSync(path.join(root,'stores',storeId,'legacy-ids.json'));
  if(store.source.mode!=='sheet')throw new Error('La tienda no usa Sheets.');
  const url=new URL(store.source.csvUrl);
  if(url.protocol!=='https:'||url.hostname!=='docs.google.com')throw new Error('Se requiere la URL publicada de Google Sheets.');
  if(!output||fs.existsSync(output))throw new Error('Indicá una carpeta nueva para el respaldo.');
  const response=await fetch(url,{method:'GET',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Google respondió ${response.status}.`);
  const bytes=Buffer.from(await response.arrayBuffer()),csv=bytes.toString('utf8');
  // Guardar la respuesta original aunque su contenido requiera revisión.
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'published-original.csv'),bytes,{flag:'wx'});
  fs.writeFileSync(path.join(output,'legacy-ids.json'),aliasBytes,{flag:'wx'});
  fs.writeFileSync(path.join(output,'backup.json'),JSON.stringify({storeId,capturedAt:new Date().toISOString(),url:url.href,scope:'Valores CSV de la pestaña publicada. No incluye fórmulas, formatos, historial ni otras hojas.',sha256:hash(bytes),aliasesSha256:hash(aliasBytes),contentType:response.headers.get('content-type')},null,2)+'\n',{flag:'wx'});
  const plan=planIds(csv,JSON.parse(aliasBytes));
  fs.writeFileSync(path.join(output,'migration-plan.json'),JSON.stringify({...plan,sourceSha256:hash(bytes),note:'No aplicar por número de fila si la hoja cambió. Regenerar el plan inmediatamente antes de la migración autorizada.'},null,2)+'\n',{flag:'wx'});
  return {output,products:plan.products.length,sha256:hash(bytes)};
}
async function main(){
  if(process.argv[2]==='verify'){
    const [, , , before,after,aliasFile,assignmentFile]=process.argv;
    console.log(verifyIds(fs.readFileSync(before,'utf8'),fs.readFileSync(after,'utf8'),JSON.parse(fs.readFileSync(aliasFile,'utf8')),assignmentFile?JSON.parse(fs.readFileSync(assignmentFile,'utf8')):[]));
  }else if(process.argv[2]==='plan'){
    const folder=process.argv[3],assignmentFile=process.argv[4],csv=fs.readFileSync(path.join(folder,'published-original.csv'),'utf8');
    const metadata=JSON.parse(fs.readFileSync(path.join(folder,'backup.json'),'utf8'));
    if(hash(Buffer.from(csv))!==metadata.sha256)throw new Error('La huella del respaldo no coincide.');
    const assignments=assignmentFile?JSON.parse(fs.readFileSync(assignmentFile,'utf8')):[];
    const plan=planIds(csv,JSON.parse(fs.readFileSync(path.join(folder,'legacy-ids.json'),'utf8')),assignments);
    fs.writeFileSync(path.join(folder,'migration-plan.json'),JSON.stringify({...plan,assignments,sourceSha256:metadata.sha256},null,2)+'\n',{flag:'wx'});
    console.log(plan);
  }else console.log(await backupAndPlan(process.argv[2],process.argv[3]));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={planIds,verifyIds,backupAndPlan};
