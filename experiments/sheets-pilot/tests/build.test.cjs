const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {build}=require('../build.cjs');
test('generated Apps Script and public store execute with reused modules and fail closed before configuration',async()=>{
 const directory=build(),site=path.join(directory,'site');
 const server=vm.createContext({});
 vm.runInContext(fs.readFileSync(path.join(directory,'Code.gs'),'utf8'),server);
 assert.equal(typeof server.SheetsPilot.save,'function');assert.equal(typeof server.uploadPhoto,'function');
 const browser=vm.createContext({});
 for(const file of ['engine/core.js','engine/media.js','engine/catalog.js','pilot-config.js','pilot-provider.js','store.js'])vm.runInContext(fs.readFileSync(path.join(site,file),'utf8'),browser);
 await assert.rejects(()=>vm.runInContext('CATALOG.load()',browser),/Falta conectar/);
 assert.equal(vm.runInContext('APP_CONFIG.whatsapp',browser),'');
});
