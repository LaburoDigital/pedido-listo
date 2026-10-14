const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {buildStore,artifactHash}=require('../tools/build-store.cjs');
test('pinned releases ignore unverified engine/store changes and reject altered manifests',()=>{
  const file=path.join(root,'tools/build-release.cjs');
  assert.ok(fs.existsSync(file),'controlled release builder is missing');
  const {buildRelease}=require(file);
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'pedido-releases-'));
  for(const folder of ['engine','presentation','stores'])fs.cpSync(path.join(root,folder),path.join(repo,folder),{recursive:true});
  fs.mkdirSync(path.join(repo,'tools'));fs.copyFileSync(path.join(root,'tools/build-store.cjs'),path.join(repo,'tools/build-store.cjs'));
  function git(args){const r=spawnSync('git',args,{cwd:repo,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
  git(['init']);git(['add','.']);git(['-c','user.name=Local test','-c','user.email=test@example.invalid','commit','-m','verified fixture']);
  const revision=git(['rev-parse','HEAD']);fs.mkdirSync(path.join(repo,'releases'));
  for(const id of ['luna-urban','casa-verde']){
    const out=path.join(repo,'before-'+id);buildStore(id,out,repo);
    fs.writeFileSync(path.join(repo,'releases',id+'.json'),JSON.stringify({schemaVersion:1,storeId:id,revision,artifactHash:artifactHash(out),verification:{unit:true,browser:true,visual:true}}));
  }
  fs.appendFileSync(path.join(repo,'engine/app.js'),'\nthrow new Error("unverified");');
  const s=path.join(repo,'stores/casa-verde/store.json');fs.writeFileSync(s,fs.readFileSync(s,'utf8').replace('Casa Verde','Unverified store'));
  git(['add','engine','stores','releases']);git(['-c','user.name=Local test','-c','user.email=test@example.invalid','commit','-m','later unverified engine and store']);
  const before=git(['rev-parse','HEAD']);
  for(const id of ['luna-urban','casa-verde']){
    const result=buildRelease(id,path.join(repo,'after-'+id),repo);
    assert.equal(artifactHash(result),artifactHash(path.join(repo,'before-'+id)));
    assert.doesNotMatch(fs.readFileSync(path.join(result,'engine/app.js'),'utf8'),/unverified/);
  }
  assert.throws(()=>buildRelease('pasteleria-demo',path.join(repo,'missing'),repo),/manifiesto/i);
  const manifest=path.join(repo,'releases/luna-urban.json');const m=JSON.parse(fs.readFileSync(manifest));m.artifactHash='0'.repeat(64);fs.writeFileSync(manifest,JSON.stringify(m));
  assert.throws(()=>buildRelease('luna-urban',path.join(repo,'tampered'),repo),/huella/i);
  assert.ok(!fs.existsSync(path.join(repo,'tampered')));
  git(['add','releases/luna-urban.json']);git(['-c','user.name=Local test','-c','user.email=test@example.invalid','commit','-m','only one manifest changes']);
  const after=git(['rev-parse','HEAD']);
  for(const [id,expected] of [['luna-urban',1],['casa-verde',0]]){
    const result=spawnSync(process.execPath,[path.join(root,'tools/ignore-build.cjs'),id],{cwd:repo,env:{...process.env,CACHED_COMMIT_REF:before,COMMIT_REF:after}});
    assert.equal(result.status,expected,`${id}: only its own manifest should trigger a build`);
  }
});
