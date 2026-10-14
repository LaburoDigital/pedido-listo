const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const moduleAt = file => fs.existsSync(path.join(root, file)) ? require('../' + file) : {};

test('catalog contract accepts a non-Sheets provider and rejects invalid prices', async () => {
  const {createCatalog} = moduleAt('engine/catalog.js');
  assert.equal(typeof createCatalog, 'function', 'catalog provider interface is missing');
  let products = [{id:'custom-1', name:'Custom', price:12.5, optionGroups:[]}];
  const catalog = createCatalog({load: async () => products});
  assert.equal((await catalog.load())[0].price,12.5);
  products=[]; assert.deepEqual(await catalog.load(),[]);
  products=[{id:'bad',name:'Bad',price:-1}];
  await assert.rejects(catalog.load(),/Precio/);
});
test('catalog contract preserves source failure and permits recovery', async () => {
  const {createCatalog} = moduleAt('engine/catalog.js');
  assert.equal(typeof createCatalog,'function');
  let fail=true;
  const catalog=createCatalog({load:async()=>{if(fail)throw new Error('offline');return [];}});
  await assert.rejects(catalog.load(),/offline/);fail=false;
  assert.deepEqual(await catalog.load(),[]);
});
test('builder produces independent stores and refuses overwrite or path traversal', () => {
  const {buildStore}=moduleAt('tools/build-store.cjs');
  assert.equal(typeof buildStore,'function','generic builder is missing');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-architecture-'));
  for(const id of ['luna-urban','pasteleria-demo','catalogo-base','casa-verde']) {
    const out=path.join(temporary,id);buildStore(id,out);
    assert.ok(fs.existsSync(path.join(out,'engine/app.js')));
    assert.ok(fs.existsSync(path.join(out,'engine/catalog.js')));
    assert.ok(!fs.existsSync(path.join(out,'stores')));
    assert.ok(!fs.existsSync(path.join(out,'.git')));
    const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
    assert.doesNotMatch(html,/\.\.\//);
    if(id==='casa-verde')assert.match(html,/<title[^>]*>Casa Verde \| Demo<\/title>/);
    assert.throws(()=>buildStore(id,out),/existe/);
  }
  assert.throws(()=>buildStore('../luna-urban',path.join(temporary,'bad')),/tienda/i);
});
test('shared media preserves all three gallery modes and excludes visual views from orders',()=>{
  const media=require('../engine/media.js');
  const product={image:'a',gallery:['b','c','d'],imageLabels:['Frente','Atrás'],optionGroups:[{id:'color',label:'Color',options:['Negro','Blanco']},{id:'vista',label:'Vista',options:['Frente','Atrás']}]};
  assert.equal(media.productImageForOptions({...product,mediaMode:'color'},{color:'Blanco'}),'b');
  assert.deepEqual(media.visibleProductImages({...product,mediaMode:'color_galeria'},{color:'Blanco'}),['c','d']);
  assert.equal(media.productImageForOptions({...product,mediaMode:'galeria'},{color:'Blanco'}),'a');
  assert.deepEqual(media.purchaseOptionGroups({...product,mediaMode:'color_galeria'}).map(g=>g.id),['color']);
});
test('Sheets adapter preserves twelve images, stable aliases and legacy single image',()=>{
  const {rowToProduct}=require('../engine/sources.js');
  const row={id:'p1',nombre:'Producto',precio:'100',modo_imagenes:'color + galeria'};
  for(let i=1;i<=12;i++)row['imagen_'+i]='image-'+i;
  const p=rowToProduct(row,0);assert.equal(p.images.length,12);assert.equal(p.mediaMode,'color_galeria');
  assert.equal(rowToProduct({nombre:'Antes',precio:'100',imagen:'old-image'},9,[{id:'stable',names:['Antes']}]).id,'stable');
  assert.equal(rowToProduct({id:'p2',nombre:'Producto',precio:'100',imagen:'old-image'},0).image,'old-image');
});
test('invalid client configuration is rejected before creating any output',()=>{
  const {buildStore}=require('../tools/build-store.cjs');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-config-'));
  fs.cpSync(path.join(root,'stores/casa-verde'),path.join(temporary,'stores/casa-verde'),{recursive:true});
  const file=path.join(temporary,'stores/casa-verde/store.json'),s=JSON.parse(fs.readFileSync(file));
  s.config.presentation.theme='../ropa';fs.writeFileSync(file,JSON.stringify(s));
  const out=path.join(temporary,'site');assert.throws(()=>buildStore('casa-verde',out,temporary),/Presentación/);assert.ok(!fs.existsSync(out));
});
