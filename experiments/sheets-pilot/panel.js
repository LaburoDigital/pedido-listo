'use strict';
const $=id=>document.getElementById(id);
let selected=null,version=null,dirty=false,busy=false;
const fields=['name','price','description','colors','sizes','state'];
const call=(name,arg)=>new Promise((resolve,reject)=>{
 if(typeof google==='undefined'||!google.script?.run)return reject(Error('Vista previa local: falta abrir el panel instalado en Google Apps Script. No se guardó ni publicó nada.'));
 google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](arg);
});
function message(text){$('message').textContent=text;}
async function run(operation){
 if(busy)return;busy=true;$('error').textContent='';document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await operation();}catch(error){message('Operación no confirmada.');$('error').textContent=error.message||'La operación no respondió. Recargá antes de repetirla.';if(String(error.message).includes('CONFLICT'))$('reload').hidden=!selected;}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
function discard(){return !dirty||confirm('Tenés cambios sin guardar. ¿Querés descartarlos y recargar?');}
function openRow(row){
 selected=row;dirty=false;const f=PanelModel.form(row);
 $('name').value=f.name;$('price').value=f.price;$('description').value=f.description;$('state').value=f.state;
 $('colors').value=(f.groups.find(g=>g.id==='color')?.options||[]).join('\n');$('sizes').value=(f.groups.find(g=>g.id==='talle')?.options||[]).join('\n');
 $('editor-title').textContent=row?'Editar '+row.name:'Nuevo producto';$('revision').textContent=row?'ID permanente: '+row.id+' · Revisión '+row.revision:'';
 $('reload').hidden=true;$('photo-form').hidden=!row;
 const form=$('photo-form');form.elements.productId.value=row?.id||'';form.elements.revision.value=row?.revision||'';
 $('photo-color').replaceChildren();for(const color of f.groups.find(g=>g.id==='color')?.options||['']){const option=document.createElement('option');option.value=color;option.textContent=color||'Foto general';$('photo-color').append(option);}
 $('photos').replaceChildren();for(const photo of row?.photos||[]){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.className='photo';img.src=photo.url;img.alt=photo.color||'Foto general';caption.textContent=photo.color||'Foto general';img.addEventListener('error',()=>{caption.textContent+=' — la imagen no carga';});figure.append(img,caption);$('photos').append(figure);}
}
function renderRows(rows){
 $('products').replaceChildren();for(const row of rows){const button=document.createElement('button');button.type='button';button.textContent=(row.name||'Borrador')+' · '+PanelModel.state(row);button.addEventListener('click',()=>{if(!busy&&discard())openRow(row);});$('products').append(button);}
}
async function refresh(preserveId){const data=await call('listProducts');version=data.version;renderRows(data.rows);openRow(data.rows.find(r=>r.id===preserveId)||null);message('Catálogo privado cargado. Versión '+version+'.');}
fields.forEach(id=>$(id).addEventListener('input',()=>{dirty=true;}));
$('new').addEventListener('click',()=>{if(discard())openRow(null);});
$('refresh').addEventListener('click',()=>{if(discard())run(()=>refresh(selected?.id));});
$('reload').addEventListener('click',()=>{if(discard())run(()=>refresh(selected?.id));});
$('editor').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 const groups=[];for(const [id,label,field]of [['color','Color','colors'],['talle','Talle','sizes']]){const options=$(field).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(options.length)groups.push({id,label,options});}
 const input={...PanelModel.form(selected),name:$('name').value,price:$('price').value,description:$('description').value,state:$('state').value,groups};
 PanelModel.prepare(input,selected);const command={input};if(selected){command.id=selected.id;command.revision=selected.revision;}
 const result=await call('saveProduct',command);await refresh(result.row.id);message('Guardado. Todavía no publicado.');
});});
$('photo-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 if(dirty)throw Error('Guardá los cambios del producto antes de subir la fotografía.');
 const file=$('photo').files[0];if(!file||!['image/jpeg','image/png'].includes(file.type)||file.size>2*1024*1024)throw Error('Elegí JPG o PNG de hasta 2 MB. HEIC y archivos mayores quedan fuera del piloto.');
 message('Subiendo fotografía…');const result=await call('uploadPhoto',$('photo-form'));$('photo').value='';await refresh(result.row.id);message('Fotografía guardada y asociada. Todavía no publicada.');
});});
$('publish').addEventListener('click',()=>run(async()=>{
 if(dirty)throw Error('Guardá o descartá los cambios antes de publicar.');
 if(version===null)throw Error('Primero cargá el catálogo.');
 const result=await call('publishCatalog',version);message('Guardado para publicación: '+result.version+'. Pendiente de comprobar el catálogo público.');
}));
$('verify').addEventListener('click',()=>run(async()=>{const result=await call('verifyPublication');message((result.status==='published'?'Publicado y comprobado: ':'Publicación pendiente. Versión visible: ')+result.version+(result.hasUnpublishedChanges?' · Hay cambios privados aún sin publicar.':''));}));
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
run(()=>refresh());
