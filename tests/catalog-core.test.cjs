const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../engine/core.js');
const product = overrides => ({ id: 'p1', name: 'Producto', price: 100, image: '',
  optionGroups: [{ id: 'color', label: 'Color', options: ['Negro'] }], ...overrides });
const item = overrides => ({ id: 'p1', name: 'Producto', price: 100, qty: 1, options: { color: 'Negro' }, ...overrides });

test('CSV accepts quotes, commas, escaped quotes, BOM and multiline descriptions', () => {
  const rows = Core.csvToObjects('\uFEFFid,nombre,precio,descripcion_larga\r\np1,"Producto, \"\"especial\"\"",100,"Primera\nsegunda"\r\n');
  assert.equal(rows[0].nombre, 'Producto, "especial"');
  assert.equal(rows[0].descripcion_larga, 'Primera\nsegunda');
});
test('header-only catalog is empty, invalid headers and malformed CSV fail clearly', () => {
  assert.deepEqual(Core.csvToObjects('id,nombre,precio\n'), []);
  for (const csv of ['', '<html>Error</html>', 'id,nombre\np1,X', 'id,nombre,precio,precio\np1,X,100,200', 'id,nombre,precio\np1,"Sin cierre,100', 'id,nombre,precio\np1,X,100,extra']) {
    assert.throws(() => Core.csvToObjects(csv));
  }
});
test('price parsing accepts specified formats only and never strips signs or currency', () => {
  for (const [input, expected] of [[0,0], [890.5,890.5], ['890.50',890.5], ['890,50',890.5], ['1.890',1890], ['1.890,50',1890.5]]) assert.equal(Core.parsePrice(input), expected);
  for (const input of [null, undefined, '', ' ', -1, '-1', NaN, Infinity, '$100', 'abc', '1e3', '1,234', '1.2.3', 1.234, {}, [], '999999999999999999999']) assert.throws(() => Core.parsePrice(input));
});
test('duplicate IDs and duplicate variant groups block an ambiguous catalog', () => {
  assert.throws(() => Core.validateProducts([product(), product()]));
  assert.throws(() => Core.validateProducts([product({optionGroups:[{id:'color',options:['Negro']},{id:'color',options:['Blanco']}]})]));
});
test('cart rejects fractions, unsafe quantities, unknown groups and removed options', () => {
  for (const qty of [0,-1,1.5,'2',Number.MAX_SAFE_INTEGER+1]) assert.equal(Core.validateStoredCart([item({qty})]).items.length, 0);
  for (const options of [{}, {color:'Rojo'}, {color:'Negro',extra:'x'}]) assert.equal(Core.reconcileCart([item({options})],[product()]).items.length, 0);
});
test('cart merges identical combinations safely, revalidates prices, preserves distinct variants', () => {
  const p=product({optionGroups:[{id:'color',options:['Negro','Blanco']}]});
  const result=Core.reconcileCart([item(),item({qty:2}),item({options:{color:'Blanco'}})],[p]);
  assert.equal(result.items.length,2);assert.equal(result.items[0].qty,3);
  const changed=Core.reconcileCart([item()],[product({price:200})]);
  assert.equal(changed.items[0].price,200);assert.equal(changed.updated,true);
});
test('legacy identity is explicit, independent of row order; unknown names are not guessed', () => {
  const legacy=[{id:'ropa-001',names:['Antes'],cartIds:['antes-1']}];
  assert.equal(Core.resolveId({nombre:'Antes'},legacy),'ropa-001');
  assert.equal(Core.resolveId({id:'ropa-001',nombre:'Después'},legacy),'ropa-001');
  assert.throws(()=>Core.resolveId({nombre:'Después'},legacy));
  const migrated=Core.reconcileCart([item({id:'antes-1'})],[product({id:'ropa-001'})],{legacyProducts:legacy});
  assert.equal(migrated.items[0].id,'ropa-001');
  assert.equal(Core.reconcileCart([item({id:'antes-2'})],[product({id:'ropa-001'})],{legacyProducts:legacy}).items.length,0);
});
test('fetch timeouts abort and reject even when the transport hangs', async () => {
  let signal;await assert.rejects(Core.fetchCsv('https://example.test/csv',(_url,options)=>{signal=options.signal;return new Promise(()=>{});},10),/demasiado/);
  assert.equal(signal.aborted,true);
});
test('actions pass hostile-looking text as data, without executing it', () => {
  const listeners={};let received;
  Core.bindActions({addEventListener:(name,handler)=>listeners[name]=handler},{option:data=>received=data.option});
  const value="Niño's');globalThis.attack=1;//";
  listeners.click({target:{closest:()=>({dataset:{action:'option',option:value}})}});
  assert.equal(received,value);assert.equal(globalThis.attack,undefined);
});
