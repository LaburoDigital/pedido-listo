// Local boundary tests only. These doubles DO NOT prove Google auth, Sheets persistence or LockService concurrency.
const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function runtime(active='owner@example.invalid'){
 let data={version:0,rows:[]},locked=false,writes=0;
 const props={OWNER_EMAIL:'owner@example.invalid',PRIVATE_SHEET_ID:'private',PUBLIC_SHEET_ID:'public'};
 const context={SheetsPilot:require('../domain.js'),Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=>props.OWNER_EMAIL})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},Utilities:{getUuid:()=> 'generated-1'},SpreadsheetApp:{openById:id=>({getSheets:()=>[{getRange:()=>({getValue:()=>JSON.stringify(data),setValue:value=>{assert.ok(locked,'write escaped lock');data=JSON.parse(value);writes++;}})}]}),flush:()=>{}},LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},releaseLock:()=>{locked=false;}})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Server.gs'),'utf8'),context);
 return {context,state:()=>data,writes:()=>writes};
}
const input={name:'Prueba',price:'100',oldPrice:'',category:'',short:'',description:'',state:'active',groups:[]};
test('editor setup entry rejects other identities and existing installations',()=>{
 for(const email of ['stranger@example.invalid','']){
  const r=runtime(email);assert.throws(()=>r.context.setupPilot(),/cuenta dueña/);assert.equal(r.writes(),0);
 }
 const r=runtime();assert.throws(()=>r.context.setupPilot(),/no se reemplazarán/);assert.equal(r.writes(),0);
});
test('server denies foreign or unavailable identity before accessing private data',()=>{
 for(const email of ['stranger@example.invalid','']){const r=runtime(email);assert.throws(()=>r.context.listProducts(),/Acceso/);assert.throws(()=>r.context.saveProduct({input}),/Acceso/);assert.equal(r.writes(),0);}
});
test('server resolves permanent identity itself and stale writer cannot change storage',()=>{
 const r=runtime();const first=r.context.saveProduct({input});
 assert.equal(first.row.id,'generated-1');assert.equal(r.writes(),1);
 const second=r.context.saveProduct({id:first.row.id,revision:1,input:{...input,price:'200'}});
 assert.equal(second.row.price,200);
 assert.throws(()=>r.context.saveProduct({id:first.row.id,revision:1,input:{...input,price:'300'}}),/CONFLICT/);
 assert.equal(r.state().rows[0].price,200);assert.equal(r.writes(),2);
 assert.throws(()=>r.context.saveProduct({id:'unknown',revision:1,input}),/Producto/);
});
test('stale catalog publication and incomplete photos fail before changing public data',()=>{
 const r=runtime();r.context.saveProduct({input});
 assert.throws(()=>r.context.publishCatalog(0),/CONFLICT/);
 assert.throws(()=>r.context.publishCatalog(1),/fotograf/);
 assert.equal(r.writes(),1);
});
