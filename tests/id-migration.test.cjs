const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const moduleFile=path.resolve(__dirname,'../tools/prepare-sheet-ids.cjs');
const api=()=>fs.existsSync(moduleFile)?require(moduleFile):{};
const aliases=[{id:'ropa-001',names:['Remera oversize'],cartIds:['remera-oversize-1']},{id:'ropa-002',names:['Jean'],cartIds:['jean-2']}];
test('ID migration changes only identity and preserves legacy equivalences regardless of row order',()=>{
  const {planIds}=api();assert.equal(typeof planIds,'function','missing migration planner');
  const a=planIds('nombre,precio,activo\nJean,200,NO\nRemera oversize,100,SI',aliases);
  assert.deepEqual(a.products.map(p=>[p.name,p.id]),[['Jean','ropa-002'],['Remera oversize','ropa-001']]);
  assert.deepEqual(a.products[1].cartIds,['remera-oversize-1']);
  assert.equal(a.requiresIdColumn,true);
});
test('migration refuses unknown names, duplicate identities and conflicting explicit IDs',()=>{
  const {planIds}=api();assert.equal(typeof planIds,'function');
  for(const csv of ['nombre,precio\nUnknown,100','nombre,precio\nJean,100\nJean,200','id,nombre,precio\nother,Jean,100'])assert.throws(()=>planIds(csv,aliases));
  const ready=planIds('id,nombre,precio\nropa-001,Renamed,100',aliases);
  assert.equal(ready.products[0].id,'ropa-001');assert.equal(ready.products[0].needsWrite,false);
});
test('verification accepts added IDs and row reorder but rejects unintended product edits',()=>{
  const {verifyIds}=api();assert.equal(typeof verifyIds,'function');
  const before='nombre,precio\nJean,200\nRemera oversize,100';
  const after='id,nombre,precio\nropa-001,Remera oversize,100\nropa-002,Jean,200';
  assert.equal(verifyIds(before,after,aliases).ok,true);
  assert.throws(()=>verifyIds(before,after.replace('Jean,200','Jean,201'),aliases),/cambi/i);
  assert.throws(()=>verifyIds(before,'nombre,precio\nJean,200\nRemera oversize,100',aliases),/ID/);
});
test('unknown inactive row requires an explicit proposed ID, never generated from its name or position',()=>{
  const {planIds}=api();
  const csv='nombre,precio,activo\nHidden example,100,NO';
  assert.throws(()=>planIds(csv,aliases));
  const plan=planIds(csv,aliases,[{name:'Hidden example',id:'ropa-006'}]);
  assert.equal(plan.products[0].id,'ropa-006');
});
test('new assignments cannot reuse reserved historical IDs even if the old product is absent',()=>{
  assert.throws(()=>api().planIds('nombre,precio\nNew product,100',aliases,[{name:'New product',id:'ropa-001'}]),/reservado/i);
});
test('migration refuses unnamed columns rather than silently losing their data',()=>{
  assert.throws(()=>api().verifyIds('nombre,precio,\nJean,100,valuable notes','id,nombre,precio\nropa-002,Jean,100',aliases),/encabezado/i);
});
test('migration refuses blank records that would make snapshot row references incorrect',()=>{
  assert.throws(()=>api().planIds('nombre,precio\n,\nJean,100',aliases),/vac/i);
});
