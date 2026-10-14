const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('standalone export contains common runtime and refuses to overwrite existing files',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-listo-export-'));
  const output=path.join(temp,'catalog');
  const result=spawnSync(process.execPath,[path.join(root,'tools/export-catalog.cjs'),'demos/ropa',output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
  assert.match(html,/src="engine\/core.js"/);
  assert.ok(fs.existsSync(path.join(output,'engine/core.js')));
  assert.equal(fs.readFileSync(path.join(output,'engine/app.js'),'utf8'),fs.readFileSync(path.join(root,'engine/app.js'),'utf8'));
  const second=spawnSync(process.execPath,[path.join(root,'tools/export-catalog.cjs'),'demos/ropa',output],{encoding:'utf8'});
  assert.notEqual(second.status,0);
  assert.equal(fs.readFileSync(path.join(output,'index.html'),'utf8'),html);
});
