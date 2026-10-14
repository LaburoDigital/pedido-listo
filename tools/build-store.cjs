/* Genera un sitio autónomo. No publica ni sobrescribe destinos. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../engine/core.js');
const ENGINE_FILES = ['core.js','media.js','sources.js','catalog.js','app.js'];
const validStoreId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
const readJSON = file => JSON.parse(fs.readFileSync(file,'utf8'));
const serialize = value => JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function validateStore(store, id) {
  if (!validStoreId(id) || store.id !== id || store.schemaVersion !== 1) throw new Error('Configuración de tienda inválida.');
  const c=store.config;
  if (!c || !c.businessName || typeof c.storageKey !== 'string' || !c.storageKey.startsWith('pedido:')) throw new Error('Falta identidad o clave de carrito.');
  if (!['ropa','clasico'].includes(c.presentation?.theme) || !['uniform','mixed'].includes(c.presentation?.cardLayout) || typeof c.presentation.mediaStyles !== 'boolean' || typeof c.behavior?.openCartAfterAdd !== 'boolean') throw new Error('Presentación o comportamiento inválido.');
  for (const key of ['primary','dark','soft']) if(!/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(c.theme?.[key])) throw new Error('Color de tema inválido.');
  for (const key of ['seo','hero','catalog','cta','whatsappMessage']) if(!c[key] || typeof c[key]!=='object') throw new Error(`Falta configuración: ${key}`);
  const strings = values => Array.isArray(values) && values.every(value=>typeof value==='string');
  if(c.trust!==undefined&&!strings(c.trust))throw new Error('Lista de confianza inválida.');
  if(c.infoCards!==undefined&&(!Array.isArray(c.infoCards)||c.infoCards.some(card=>!card||typeof card!=='object'||typeof card.title!=='string'||(card.items!==undefined&&!strings(card.items)))))throw new Error('Tarjetas informativas inválidas.');
  if (c.instagram && !/^https:\/\//.test(c.instagram)) throw new Error('Instagram debe usar HTTPS.');
  if (!['local','sheet'].includes(store.source?.mode)) throw new Error('Fuente inválida.');
  if (store.source.mode==='sheet' && !/^https:\/\//.test(store.source.csvUrl)) throw new Error('CSV debe usar HTTPS.');
  if (!Array.isArray(c.orderFields)) throw new Error('Formulario inválido.');
  const ids=new Set();
  for(const field of c.orderFields) {
    if(!/^[a-z][a-z0-9_-]*$/.test(field.id)||ids.has(field.id)||!['text','date','number','tel','email','textarea','select'].includes(field.type)||typeof field.label!=='string'||(field.type==='select'&&(!Array.isArray(field.options)||field.options.some(x=>typeof x!=='string')))) throw new Error('Campo de pedido inválido.');
    ids.add(field.id);
  }
  if(store.siteUrl && !/^https:\/\/[a-z0-9.-]+\/?$/i.test(store.siteUrl)) throw new Error('Dominio inválido.');
  return store;
}
function fileMap(directory) {
  const result={};
  function walk(dir,prefix='') {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name=prefix+entry.name, full=path.join(dir,entry.name);
      if(entry.isSymbolicLink()) throw new Error('No se permiten enlaces simbólicos en publicaciones.');
      if(entry.isDirectory())walk(full,name+'/');
      else result[name]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  }
  walk(directory);return result;
}
function artifactHash(directory) {
  return crypto.createHash('sha256').update(JSON.stringify(fileMap(directory))).digest('hex');
}
function buildStore(id, output, root=path.resolve(__dirname,'..')) {
  if(!validStoreId(id))throw new Error('ID de tienda inválido.');
  const folder=path.join(root,'stores',id);
  const store=validateStore(readJSON(path.join(folder,'store.json')),id);
  const aliases=readJSON(path.join(folder,'legacy-ids.json'));
  if(!Array.isArray(aliases)||aliases.some(a=>!a.id||!Array.isArray(a.names)||!Array.isArray(a.cartIds)))throw new Error('Mapa de compatibilidad inválido.');
  const products=store.source.mode==='local'?core.validateProducts(readJSON(path.join(folder,'products.json'))):[];
  const assets=path.join(folder,'assets');
  const assetFiles=fs.existsSync(assets)?Object.keys(fileMap(assets)):[];
  if(assetFiles.some(f=>! /\.(svg|png|jpe?g|webp|gif|avif|ico|woff2?)$/i.test(f))) throw new Error('Recurso no permitido. Solo imágenes y fuentes.');
  const destination=path.resolve(output||path.join(root,'dist',id));
  if(destination===root||root.startsWith(destination+path.sep)||destination.startsWith(folder+path.sep))throw new Error('Destino inválido.');
  if(fs.existsSync(destination))throw new Error('El destino ya existe; no se sobrescribió.');
  // Preparar y validar todo antes de crear la publicación.
  const files={};
  for(const file of ENGINE_FILES)files['engine/'+file]=fs.readFileSync(path.join(root,'engine',file));
  files['styles.css']=fs.readFileSync(path.join(root,'presentation/themes',store.config.presentation.theme+'.css'));
  const source={...store.source,legacyProducts:aliases};
  files['store.js']=`/* Configuración pública generada; editar stores/${id}/store.json. */\nconst APP_CONFIG=${serialize(store.config)};\nconst DATA_SOURCE=${serialize(source)};\nconst PRODUCTS=${serialize(products)};\nconst CART_ALIASES=DATA_SOURCE.legacyProducts;\nconst CATALOG=Catalog.createCatalog(CatalogSources.create(DATA_SOURCE,()=>PRODUCTS));\n`;
  const scripts=['engine/core.js','engine/media.js','engine/sources.js','engine/catalog.js','store.js','engine/app.js'];
  let html=fs.readFileSync(path.join(root,'presentation/index.template.html'),'utf8');
  html=html.replace('<!-- STORE_SCRIPTS -->',scripts.map(file=>`<script src="${file}"></script>`).join('\n  '));
  html=html.replace(/<title\b[^>]*>.*?<\/title>/,()=>`<title id="pageTitle">${escape(store.config.seo.title)}</title>`);
  html=html.replace(/(<meta[^>]+id="(?:pageDescription|ogDescription)"[^>]*content=")[^"]*(")/g,(_,a,b)=>a+escape(store.config.seo.description)+b);
  html=html.replace(/(<meta[^>]+id="ogTitle"[^>]*content=")[^"]*(")/g,(_,a,b)=>a+escape(store.config.seo.title)+b);
  html=html.replace(/(<meta[^>]+id="themeColor"[^>]*content=")[^"]*(")/g,(_,a,b)=>a+escape(store.config.theme.dark)+b);
  files['index.html']=html;
  files['_headers']='/*\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n';
  const url=store.siteUrl?.replace(/\/$/,'');
  files['robots.txt']=url?`User-agent: *\nAllow: /\nSitemap: ${url}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
  if(url)files['sitemap.xml']=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(url)}/</loc></url></urlset>`;
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.mkdirSync(destination);
  for(const [file,contents] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(destination,file)),{recursive:true});fs.writeFileSync(path.join(destination,file),contents,{flag:'wx'});}
  for(const file of assetFiles){const dest=path.join(destination,'assets',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(assets,file),dest,fs.constants.COPYFILE_EXCL);}
  return destination;
}
if(require.main===module){try{console.log(buildStore(process.argv[2],process.argv[3]));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildStore,validateStore,artifactHash,fileMap,validStoreId};
