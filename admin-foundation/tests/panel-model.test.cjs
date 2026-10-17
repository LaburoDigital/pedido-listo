const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../panel/model.js');
const fixtures=require('../fixtures/catalogs.json');
const fresh=()=>({name:'Camisa',price:'120,50',oldPrice:'',category:'Ropa',short:'',description:'Algodón',state:'active',groups:[{id:'color',label:'Color',options:['Azul','Rojo']}]});
test('precio regional explícito, sin miles, negativos ni redondeos',()=>{
  assert.equal(model.amount('120,50'),120.5); assert.equal(model.amount('0'),0);
  for(const s of ['','-1','1.000,50','1,234','1e3','NaN','10000000']) assert.throws(()=>model.amount(s));
});
test('alta excluye identidad y conserva variantes compatibles',()=>{
  const value=model.prepare(fresh());
  assert.equal(value.price,120.5); assert.equal(value.available,true); assert.equal(value.is_draft,false);
  assert.equal('id' in value,false); assert.equal('store_id' in value,false); assert.equal('legacy_cart_ids' in value,false);
  assert.deepEqual(value.option_groups,fresh().groups);
});
test('edición preserva galerías, ofertas y metadatos no editados',()=>{
  const row=structuredClone(fixtures.products[0]); const before=structuredClone(row);
  const value=model.prepare({...model.form(row),price:'1000,25',description:'Nuevo texto'},row);
  assert.equal(value.price,1000.25); assert.equal(value.catalog_data.description,'Nuevo texto');
  for(const key of ['image','gallery','images','mediaMode','imageLabels','featured','offer','order']) assert.deepEqual(value.catalog_data[key],row.catalog_data[key]);
  assert.deepEqual(row,before);
});
test('colores con fotos asociadas no se renombran, reordenan ni borran',()=>{
  const row=fixtures.products[0]; const f=model.form(row); f.groups[1].options.reverse();
  assert.throws(()=>model.prepare(f,row),/fotografías/);
  f.groups.splice(1,1); assert.throws(()=>model.prepare(f,row),/fotografías/);
});
test('borrador incompleto permitido; activo/inactivo requieren nombre y precio',()=>{
  const f={...fresh(),name:'',price:'',state:'draft'}; const p=model.prepare(f);
  assert.equal(p.price,null);assert.equal(p.available,false);assert.equal(p.is_draft,true);
  for(const state of ['active','inactive']) assert.throws(()=>model.prepare({...f,state}));
  assert.throws(()=>model.prepare({...fresh(),state:'published'}));
});
test('rechaza variantes vacías, duplicadas o colores equivalentes',()=>{
  for(const options of [[],[''],['Azul','azul'],['S','S']]) assert.throws(()=>model.prepare({...fresh(),groups:[{id:'color',label:'Color',options}]}));
});
test('búsqueda y filtros locales no confunden activo con publicado',()=>{
  const rows=fixtures.products;
  assert.equal(model.filter(rows,'remera','active').length,1);
  assert.equal(model.filter(rows,'','draft').length,1);
  assert.equal(model.filter(rows,'bolso','inactive').length,0);
  assert.equal(model.state(rows[0]),'active');
});
test('agregar colores no puede reinterpretar fotos de una galería automática',()=>{
  const row={...structuredClone(fixtures.products[1]),option_groups:[],catalog_data:{mediaMode:'auto',image:'https://catalog.example.test/front.webp',gallery:['https://catalog.example.test/back.webp']}};
  const f=model.form(row);f.groups=[{id:'color',label:'Color',options:['Rojo','Azul']}];
  assert.throws(()=>model.prepare(f,row),/fotografías/);
});
