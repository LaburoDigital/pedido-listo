const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {toProduct, mapCatalog, legacyProducts, createProvider}=require('../src/product-mapper.cjs');
const core=require('../../engine/core.js');
const media=require('../../engine/media.js');
const {createCatalog}=require('../../engine/catalog.js');
const fixture=require('../fixtures/catalogs.json');
const store=fixture.stores[0].id;
const row=()=>structuredClone(fixture.products[0]);

test('conserva ID y metadatos comerciales sin filtrar columnas privadas al motor',()=>{
  const source=row(); source.internal_note='privado';
  const p=toProduct(source);
  assert.equal(p.id,'ropa-001'); assert.equal(p.price,890.5); assert.equal(p.oldPrice,990);
  for(const [key,value] of Object.entries(source.catalog_data)) assert.deepEqual(p[key],value);
  assert.equal(p.internal_note,undefined); assert.equal(p.store_id,undefined);
  p.optionGroups[0].options.push('XL'); assert.deepEqual(source.option_groups[0].options,['S','M']);
  assert.equal(toProduct({...source,name:'Renombrado',catalog_data:{order:99}}).id,'ropa-001');
});
test('las galerías por color conservan asociación, vistas y encuadre reales del motor',()=>{
  const p=toProduct(row());
  assert.deepEqual(media.visibleProductImages(p,{color:'Blanco'}),[
    'https://catalog.example.test/blanco-frente.webp','https://catalog.example.test/blanco-atras.webp']);
  assert.equal(media.productImageForOptions(p,{color:'Negro'}),'https://catalog.example.test/negro-frente.webp');
  assert.deepEqual(media.purchaseOptionGroups(p).map(g=>g.id),['talle','color']);
  assert.equal(media.imagePositionFor(p),'center top'); assert.equal(media.productImageFit(p),'contain');
  assert.equal(media.thumbnailLabel(p,1),'Ver Atrás');
});
test('rechaza matrices por color incompletas o colapsadas por URLs repetidas',()=>{
  const p=row(); p.catalog_data.gallery.pop(); assert.throws(()=>toProduct(p),/galería/i);
  p.catalog_data.gallery.push(p.catalog_data.image); assert.throws(()=>toProduct(p),/galería/i);
});
test('una foto por color no puede reutilizar la foto del primer color al faltar otra',()=>{
  const source=structuredClone(fixture.products[1]); source.catalog_data.gallery=[];
  assert.throws(()=>toProduct(source),/color/i);
});
test('colores equivalentes para el selector del motor no pueden apuntar a fotos distintas',()=>{
  const source=row(); source.option_groups[1].options=['Negro',' negro '];
  assert.throws(()=>toProduct(source),/color/i);
});
test('el rango monetario evita magnitudes que el motor rechaza por precisión binaria',()=>{
  // Example of a formally 2-decimal amount incompatible with the unchanged core.
  assert.throws(()=>core.parsePrice(9999999999.97));
  assert.equal(toProduct({...row(),price:'9999999.99'}).price,9999999.99);
  assert.throws(()=>toProduct({...row(),price:10000000}),/rango/i);
  assert.throws(()=>toProduct({...row(),old_price:10000000}),/rango/i);
});
test('catálogo vacío válido y borradores o desactivados nunca son productos vendibles',()=>{
  assert.deepEqual(mapCatalog([],store),[]);
  assert.deepEqual(mapCatalog([fixture.products[2],{...row(),available:false}],store),[]);
  assert.throws(()=>toProduct(fixture.products[2]),/borrador/i);
});
test('rechaza filas de otro comercio incluso si están ocultas y exige IDs únicos por catálogo',()=>{
  assert.throws(()=>mapCatalog([fixture.products[1]],store),/comercio/i);
  assert.throws(()=>mapCatalog([{...fixture.products[1],available:false}],store),/comercio/i);
  assert.throws(()=>mapCatalog([row(),row()],store),/duplicado/i);
});
test('precios de la base no usan el parser regional ni redondean valores incorrectos',()=>{
  for(const price of ['',null,-1,'-1','1,25','1.234','1e2',' 2 ',NaN,Infinity,10000000000]) {
    assert.throws(()=>toProduct({...row(),price}),/precio/i,String(price));
  }
  assert.equal(toProduct({...row(),price:'0.00'}).price,0);
  assert.equal(toProduct({...row(),price:1.23}).price,1.23);
});
test('rechaza opciones y metadatos mal formados sin corregirlos silenciosamente',()=>{
  for(const change of [
    {option_groups:[{id:'color',label:'Color',options:['Azul','Azul']}]},
    {option_groups:{}}, {available:'true'}, {is_draft:null}, {id:'nombre con espacios'},
    {catalog_data:{price:1}}, {catalog_data:{gallery:'foto'}}, {catalog_data:{featured:'sí'}},
    {catalog_data:{mediaMode:'desconocido'}}, {catalog_data:{image:'javascript:alert(1)'}}
  ]) assert.throws(()=>toProduct({...row(),...change}));
});
test('proveedor respeta contrato: datos, vacío y propagación de errores',async()=>{
  const catalog=createCatalog(createProvider(async()=>[row()],store));
  assert.equal((await catalog.load())[0].id,'ropa-001');
  assert.deepEqual(await createCatalog(createProvider(async()=>[],store)).load(),[]);
  await assert.rejects(createCatalog(createProvider(async()=>{throw Error('sin conexión');},store)).load(),/sin conexión/);
  await assert.rejects(createCatalog(createProvider(async()=>({}),store)).load());
});
test('conserva aliases de carrito y revalida variantes y precios con el motor existente',()=>{
  const p=toProduct(row());
  const cart=[{id:'remera-oversize-1',name:'Anterior',price:800,qty:2,options:{talle:'M',color:'Blanco'}}];
  const result=core.reconcileCart(cart,[p],{groupsFor:media.purchaseOptionGroups,legacyProducts:legacyProducts([row()],store)});
  assert.equal(result.items[0].id,'ropa-001'); assert.equal(result.items[0].price,890.5); assert.equal(result.updated,true);
  cart[0].options.talle='XXL'; assert.equal(core.reconcileCart(cart,[p],{legacyProducts:legacyProducts([row()],store)}).items.length,0);
});
test('los cuatro catálogos locales actuales conservan su representación comercial',()=>{
  for(const folder of ['luna-urban','pasteleria-demo','catalogo-base','casa-verde']) {
    const products=JSON.parse(fs.readFileSync(path.join(__dirname,'../../stores',folder,'products.json'),'utf8'));
    for(const original of core.validateProducts(products)) {
      const {id,name,price,oldPrice,available=true,optionGroups=[],...catalog_data}=original;
      const p=toProduct({store_id:store,id,name,price,old_price:oldPrice,is_draft:false,available,option_groups:optionGroups,catalog_data});
      assert.deepEqual(p,{...catalog_data,id,name,price,oldPrice,available,optionGroups});
      for(const group of optionGroups) for(const option of group.options) {
        assert.deepEqual(media.visibleProductImages(p,{[group.id]:option}),media.visibleProductImages(original,{[group.id]:option}));
      }
    }
  }
});
