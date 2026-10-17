const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseSnapshot,createProvider}=require('../provider.js');
const {createCatalog}=require('../../../engine/catalog.js');
const envelope={schema:1,version:'v1',products:[{id:'permanent-1',name:'Ficticio',price:100,available:true,optionGroups:[{id:'color',label:'Color',options:['Rojo; vino','Azul']}],image:'https://ik.imagekit.io/pilot/red.jpg',gallery:['https://ik.imagekit.io/pilot/blue.jpg'],mediaMode:'color'}]};
const csv=value=>'"'+JSON.stringify(value).replaceAll('"','""')+'"\r\n';
test('published Sheets CSV round-trips JSON and semicolon options through the real engine',async()=>{
 const provider=createProvider(async()=>csv(envelope));
 const products=await createCatalog(provider).load();
 assert.equal(products[0].id,'permanent-1');assert.equal(products[0].optionGroups[0].options[0],'Rojo; vino');
 assert.equal(provider.version(),'v1');
});
test('no example fallback on unreadable, invalid or unavailable public catalog',async()=>{
 for(const text of ['<html>Login</html>','',csv({...envelope,schema:2}),csv({...envelope,version:''}),csv({...envelope,products:[{...envelope.products[0],price:-1}]})]) assert.throws(()=>parseSnapshot(text));
 const provider=createProvider(async()=>{throw Error('offline');});
 await assert.rejects(()=>createCatalog(provider).load(),/offline/);assert.equal(provider.version(),null);
});
test('zero active products remain a valid empty public snapshot',()=>assert.deepEqual(parseSnapshot(csv({schema:1,version:'empty',products:[]})).products,[]));
