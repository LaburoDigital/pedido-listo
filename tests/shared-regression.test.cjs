const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const catalogs = ['luna-urban', 'pasteleria-demo', 'catalogo-base', 'casa-verde'];
const {buildStore}=require('../tools/build-store.cjs');
const os=require('node:os');
const testRoot=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-regression-'));
for(const id of catalogs)buildStore(id,path.join(testRoot,id));
function app(folder = catalogs[0]) {
  const nodes = new Map(), storage = new Map(), opened = [], alerts = [];
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: '', textContent: '', value: '', disabled: false, hidden: false,
      style: { setProperty() {} }, classList: { add() {}, remove() {} },
      setAttribute() {}, addEventListener() {}, contains() { return false; },
      querySelector() { return null; }, scrollTo() {}, append() {}
    });
    return nodes.get(id);
  }
  const context = vm.createContext({
    console: { info() {}, warn() {}, error() {} }, AbortController, setTimeout, clearTimeout,
    fetch: async () => { throw new Error('offline'); },
    document: { addEventListener() {}, createElement: element, documentElement: element('html'),
      body: element('body'), getElementById: element, activeElement: null },
    requestAnimationFrame: fn => fn(),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, val) => storage.set(key, val) },
    window: { open: (...args) => opened.push(args), setTimeout: () => {} },
    alert: msg => alerts.push(msg)
  });
  for (const file of ['engine/core.js','engine/media.js','engine/sources.js','engine/catalog.js','store.js','engine/app.js']) {
    vm.runInContext(fs.readFileSync(path.join(testRoot, folder, file), 'utf8'), context);
  }
  vm.runInContext('const rowToProduct=(row,index)=>CatalogSources.rowToProduct(row,index,DATA_SOURCE.legacyProducts); const toNumber=CatalogCore.parsePrice; APP_CONFIG.whatsapp="59899000000";',context);
  return { run: code => vm.runInContext(code, context), context, nodes, storage, opened, alerts };
}
const plain = val => JSON.parse(JSON.stringify(val));

for (const folder of catalogs) {
  test(`${folder}: zero active products stays empty`, async () => {
    const a = app(folder);
    a.run(`DATA_SOURCE.mode='sheet'; DATA_SOURCE.csvUrl='https://example.test/catalog.csv';`);
    a.context.fetch = async () => ({ ok: true, text: async () => 'id,nombre,precio,activo\np1,Producto,100,NO' });
    await a.run('loadProducts()');
    assert.deepEqual(plain(a.run('catalogProducts')), []);
  });
  test(`${folder}: failed sheet never displays examples and can retry`, async () => {
    const a = app(folder);
    a.run(`DATA_SOURCE.mode='sheet'; DATA_SOURCE.csvUrl='https://example.test/catalog.csv';`);
    await a.run('loadProducts()'); a.run('renderProducts()');
    assert.deepEqual(plain(a.run('catalogProducts')), []);
    assert.match(a.nodes.get('productGrid').innerHTML, /reintentar/i);
    a.context.fetch = async () => ({ ok: true, text: async () => 'id,nombre,precio\np1,Producto,100' });
    await a.run('loadProducts()');
    assert.equal(a.run('catalogProducts[0].id'), 'p1');
  });
  test(`${folder}: rejects malformed prices rather than coercing them`, () => {
    const a = app(folder);
    assert.equal(a.run(`toNumber('890.50')`), 890.5);
    assert.equal(a.run(`toNumber('1.890,50')`), 1890.5);
    for (const price of ['-10', '', 'abc', '$100', '1,2,3', '12.3456']) {
      assert.throws(() => a.run(`rowToProduct({id:'p1',nombre:'Producto',precio:${JSON.stringify(price)}},0)`));
    }
  });
  test(`${folder}: explicit IDs survive rename and row reorder`, () => {
    const a = app(folder);
    assert.equal(a.run(`rowToProduct({id:'sku-42',nombre:'Antes',precio:'100'},0).id`), 'sku-42');
    assert.equal(a.run(`rowToProduct({id:'sku-42',nombre:'Después',precio:'100'},99).id`), 'sku-42');
    assert.throws(() => a.run(`rowToProduct({nombre:'Nuevo sin ID',precio:'100'},0)`));
  });
  test(`${folder}: malformed saved carts cannot crash startup`, () => {
    const a = app(folder);
    for (const value of ['{}', 'null', '"text"', '[null]', '[{"id":"p1","qty":-1,"options":{}}]']) {
      a.storage.set(a.run('cartKey()'), value); a.run('loadCart()');
      assert.deepEqual(plain(a.run('cart')), []);
    }
  });
  test(`${folder}: removed variants are removed from the cart`, () => {
    const a = app(folder);
    a.run(`if(typeof catalogState!=='undefined')catalogState.status='ready';catalogProducts=[{id:'p1',name:'Producto',price:100,image:'',optionGroups:[{id:'color',label:'Color',options:['Negro']}]}];cart=[{id:'p1',key:'old',name:'Producto',price:100,qty:1,options:{color:'Rojo'}}];syncCartWithCatalog();`);
    assert.deepEqual(plain(a.run('cart')), []);
  });
  test(`${folder}: checkout revalidates stale prices before opening WhatsApp`, async () => {
    const a = app(folder);
    a.run(`DATA_SOURCE.mode='local'; PRODUCTS.splice(0,PRODUCTS.length,{id:'p1',name:'Producto',price:200,image:'',optionGroups:[]});catalogProducts=PRODUCTS.slice();cart=[{id:'p1',key:'old',name:'Producto',price:100,qty:1,options:{}}];`);
    a.run(`APP_CONFIG.orderFields.filter(field=>field.required).forEach(field=>document.getElementById('field-'+field.id).value='Prueba')`);
    await a.run('sendWhatsApp()');
    assert.equal(a.opened.length, 0);
    assert.equal(a.run('cart[0].price'), 200);
    assert.ok(a.alerts.some(msg => /revis/i.test(msg)));
    await a.run('sendWhatsApp()');
    assert.equal(a.opened.length, 1);
    assert.match(decodeURIComponent(a.opened[0][0]), /200/);
  });
  test(`${folder}: unavailable sheet blocks checkout and preserves cart`, async () => {
    const a = app(folder);
    a.run(`DATA_SOURCE.mode='sheet';DATA_SOURCE.csvUrl='https://example.test/catalog.csv';cart=[{id:'p1',key:'old',name:'Producto',price:100,qty:1,options:{}}];catalogProducts=[{id:'p1',name:'Producto',price:100,image:'',optionGroups:[]}];`);
    a.run(`APP_CONFIG.orderFields.filter(field=>field.required).forEach(field=>document.getElementById('field-'+field.id).value='Prueba')`);
    await a.run('sendWhatsApp()');
    assert.equal(a.opened.length, 0);
    assert.equal(a.run('cart.length'), 1);
  });
  test(`${folder}: generated handlers never interpolate executable data`, () => {
    const source = fs.readFileSync(path.join(root, 'engine/app.js'), 'utf8');
    assert.doesNotMatch(source, /onclick\s*=/);
  });
  test(`${folder}: overlapping retry and checkout cannot consume price-change review`, async () => {
    const a=app(folder);let release;
    a.run(`DATA_SOURCE.mode='sheet';DATA_SOURCE.csvUrl='https://example.test/catalog.csv';cart=[{id:'p1',name:'Producto',price:100,qty:1,options:{}}];APP_CONFIG.orderFields.filter(f=>f.required).forEach(f=>document.getElementById('field-'+f.id).value='Prueba');`);
    a.context.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,text:async()=> 'id,nombre,precio\np1,Producto,200'})});
    const retry=a.run('retryCatalog()'),checkout=a.run('sendWhatsApp()');
    release();await Promise.all([retry,checkout]);
    assert.equal(a.opened.length,0);assert.equal(a.run('cart[0].price'),200);
    assert.ok(a.alerts.some(msg=>/revis/i.test(msg)));
  });
  test(`${folder}: checkout rejects removed products, obsolete variants and invalid quantities`, async () => {
    for(const change of ['removed','variant','quantity']){
      const a=app(folder);
      a.run(`DATA_SOURCE.mode='sheet';DATA_SOURCE.csvUrl='https://example.test/catalog.csv';cart=[{id:'p1',name:'Producto',price:100,qty:${change==='quantity'?'1.5':'1'},options:{color:'Rojo'}}];APP_CONFIG.orderFields.filter(f=>f.required).forEach(f=>document.getElementById('field-'+f.id).value='Prueba');`);
      a.context.fetch=async()=>({ok:true,text:async()=>change==='removed'?'id,nombre,precio\n':'id,nombre,precio,opciones_1_nombre,opciones_1_valores\np1,Producto,100,Color,Negro'});
      await a.run('sendWhatsApp()');
      assert.equal(a.opened.length,0,change);assert.equal(a.run('cart.length'),0,change);
    }
  });
  test(`${folder}: invalid catalog does not destroy the saved valid cart`, async()=>{
    const a=app(folder);a.run(`DATA_SOURCE.mode='sheet';DATA_SOURCE.csvUrl='https://example.test/catalog.csv';cart=[{id:'p1',name:'Producto',price:100,qty:1,options:{}}];saveCart();`);
    const original=a.storage.get(a.run('cartKey()'));
    a.context.fetch=async()=>({ok:true,text:async()=> 'id,nombre,precio\np1,Producto,-100'});
    await a.run('retryCatalog()');assert.equal(a.run('cart.length'),1);assert.equal(a.storage.get(a.run('cartKey()')),original);
  });
}
