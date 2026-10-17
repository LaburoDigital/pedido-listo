const {test}=require('node:test');
const assert=require('node:assert/strict');
const pilot=require('../domain.js');
const media=require('../../../engine/media.js');
const {createCatalog}=require('../../../engine/catalog.js');
const input=()=>({name:'Remera ficticia',price:'890,50',oldPrice:'',category:'Prueba',short:'',description:'No se vende',state:'active',groups:[{id:'color',label:'Color',options:['Rojo; vino','Azul']},{id:'talle',label:'Talle',options:['S','M']}]});
const asset=(id,color)=>({id,productId:'p-1',color,url:`https://ik.imagekit.io/piloto/${id}.jpg`});
test('create ignores no IDs: server supplies identity; caller cannot inject protected fields',()=>{
 const row=pilot.save(null,{input:input()},'p-1');
 assert.equal(row.id,'p-1');assert.equal(row.revision,1);assert.equal(row.price,890.5);
 assert.throws(()=>pilot.save(null,{input:input(),store_id:'foreign'},'p-1'));
 assert.throws(()=>pilot.save(null,{input:{...input(),id:'foreign'}},'p-1'));
});
test('stale revision rejects without overwriting current product',()=>{
 const original=pilot.save(null,{input:input()},'p-1');
 const saved=pilot.save(original,{id:'p-1',revision:1,input:{...input(),price:'920'}},'unused');
 assert.equal(saved.revision,2);assert.equal(saved.id,'p-1');assert.equal(saved.price,920);
 assert.throws(()=>pilot.save(saved,{id:'p-1',revision:1,input:input()},'unused'),/CONFLICT/);
 assert.equal(saved.price,920);
 assert.throws(()=>pilot.save(saved,{id:'other',revision:2,input:input()},'unused'));
});
test('invalid prices are rejected at the shared commercial boundary',()=>{
 for(const price of ['','-1','12.345','1.234,50','abc']) assert.throws(()=>pilot.save(null,{input:{...input(),price}},'p-1'));
});
test('photo associations survive semicolons and map to actual engine color selection',async()=>{
 let row=pilot.save(null,{input:input()},'p-1');
 row=pilot.attach(row,1,asset('red','Rojo; vino'));
 row=pilot.attach(row,2,asset('blue','Azul'));
 const snapshot=pilot.snapshot([row],'v1');
 const products=await createCatalog({load:async()=>snapshot.products}).load();
 assert.equal(products[0].id,'p-1');assert.equal(products[0].price,890.5);
 assert.deepEqual(products[0].optionGroups[0].options,['Rojo; vino','Azul']);
 assert.equal(media.productImageForOptions(products[0],{color:'Rojo; vino'}),'https://ik.imagekit.io/piloto/red.jpg');
 assert.equal(media.productImageForOptions(products[0],{color:'Azul'}),'https://ik.imagekit.io/piloto/blue.jpg');
 assert.ok(!JSON.stringify(snapshot).includes('productId'));
 assert.ok(!JSON.stringify(snapshot).includes('store_id'));
});
test('photos cannot move across products or unknown colors; stale upload is rejected',()=>{
 const row=pilot.save(null,{input:input()},'p-1');
 assert.throws(()=>pilot.attach(row,1,{...asset('red','Rojo; vino'),productId:'p-2'}));
 assert.throws(()=>pilot.attach(row,1,asset('red','Verde')));
 assert.throws(()=>pilot.attach(row,0,asset('red','Rojo; vino')),/CONFLICT/);
 assert.throws(()=>pilot.attach(row,1,{...asset('red','Azul'),url:'javascript:alert(1)'}));
});
test('partial galleries cannot be published; color changes cannot silently relink images',()=>{
 const row=pilot.attach(pilot.save(null,{input:input()},'p-1'),1,asset('red','Rojo; vino'));
 assert.throws(()=>pilot.snapshot([row],'v1'),/fotograf/);
 const changed=input();changed.groups[0].options=['Azul','Rojo; vino'];
 assert.throws(()=>pilot.save(row,{id:'p-1',revision:2,input:changed},'unused'),/colores/);
});
test('inactive and draft products are excluded, including valid empty catalog',()=>{
 const row=pilot.save(null,{input:{...input(),state:'inactive'}},'p-1');
 assert.deepEqual(pilot.snapshot([row],'v1').products,[]);
 assert.deepEqual(pilot.snapshot([],'v2').products,[]);
});
test('invalid publication version and snapshot above pilot capacity are rejected',()=>{
 assert.throws(()=>pilot.snapshot([],''));
 assert.throws(()=>pilot.encode({large:'a'.repeat(45001)}));
});
