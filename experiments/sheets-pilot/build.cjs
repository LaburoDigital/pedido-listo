// Generates only disposable artifacts under this experiment. Never deploys or reads credentials.
const fs=require('node:fs'),path=require('node:path');
const {buildStore}=require('../../tools/build-store.cjs');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shared=['engine/core.js','engine/media.js','admin-foundation/src/product-mapper.cjs','admin-foundation/panel/model.js'].map(read).join('\n;\n');
function build(){
 const output=path.join(__dirname,'build',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(output,{recursive:true});
 const server='const structuredClone = value => JSON.parse(JSON.stringify(value));\n'+shared+'\n'+read('experiments/sheets-pilot/domain.js')+'\n'+read('experiments/sheets-pilot/provider.js')+'\n'+read('experiments/sheets-pilot/apps-script/Server.gs');
 fs.writeFileSync(path.join(output,'Code.gs'),server);
 const html=read('experiments/sheets-pilot/apps-script/Index.html').replace('/*PANEL_STYLE*/',read('admin-foundation/panel/style.css')).replace('/*PANEL_SCRIPT*/',()=>shared+'\n'+read('experiments/sheets-pilot/photo.js')+'\n'+read('experiments/sheets-pilot/panel.js'));
 fs.writeFileSync(path.join(output,'Index.html'),html);
 fs.copyFileSync(path.join(__dirname,'apps-script/appsscript.json'),path.join(output,'appsscript.json'));
 const site=path.join(output,'site');buildStore('casa-verde',site);
 fs.copyFileSync(path.join(__dirname,'provider.js'),path.join(site,'pilot-provider.js'));
 let config=fs.readFileSync(path.join(site,'store.js'),'utf8');
 config=config.replace(/const CATALOG=.*;\n/,`const PILOT_PROVIDER=SheetsPilotProvider.createProvider(async()=>{const url=PILOT_CSV_URL;if(!url.startsWith('https://docs.google.com/spreadsheets/d/e/')||!url.includes('output=csv'))throw Error('Falta conectar el CSV público real del piloto.');const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('No se pudo leer el catálogo publicado.');return response.text();});\nconst CATALOG=Catalog.createCatalog(PILOT_PROVIDER);\n`);
 config+='\nAPP_CONFIG.businessName="Pedido Listo — Piloto ficticio";APP_CONFIG.whatsapp="";APP_CONFIG.storageKey="pedido:sheets-pilot";APP_CONFIG.seo.title="Pedido Listo — Piloto";APP_CONFIG.hero.title="Piloto de administración";APP_CONFIG.hero.text="Catálogo ficticio publicado desde Sheets. No se reciben pedidos.";';
 fs.writeFileSync(path.join(site,'store.js'),config);
 fs.writeFileSync(path.join(site,'pilot-config.js'),'// Public CSV URL only. NEVER add credentials here.\nconst PILOT_CSV_URL="";\n');
 let index=fs.readFileSync(path.join(site,'index.html'),'utf8');
 index=index.replace(/(<script[^>]+src="store.js"[^>]*>)/,'<script src="pilot-config.js"></script><script src="pilot-provider.js"></script>$1');
 if(!index.includes('pilot-provider.js'))throw Error('Cambió el punto de integración de la plantilla.');
 fs.writeFileSync(path.join(site,'index.html'),index);
 // Original builder manifest no longer describes this derived experiment; clearly label it.
 fs.writeFileSync(path.join(site,'PILOT-NOT-A-RELEASE.txt'),'Disposable experiment derived from the shared builder. Not a verified release. Original build-manifest hashes must not be used for distribution.');
 return output;
}
module.exports={build};if(require.main===module)console.log(build());
