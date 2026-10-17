/* Local-only product administration. All dynamic content is assigned with textContent. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),model=PanelModel;
  let client,stores=[],store=null,rows=[],original=null,filter='all',dirty=false,busy=false,uncertain=false,groups=[],viewEpoch=0;
  const names={active:'Activo',inactive:'Inactivo',draft:'Borrador'};
  const money=new Intl.NumberFormat('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2});
  function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
  function message(id,text){$(id).textContent=text;$(id).hidden=!text;}
  function lock(value){busy=value;for(const e of document.querySelectorAll('#workspace button,#store-picker'))e.disabled=value;for(const e of $('editor-form').querySelectorAll('input,textarea,select'))e.disabled=value;applyPhotoLock();$('save').disabled=value||uncertain;}
  function applyPhotoLock(){for(const box of $('variants').children){const linked=box.dataset.locked==='true';for(const input of box.querySelectorAll('input,textarea,button'))input.disabled=busy||linked;}}
  function clearWorkspace(){viewEpoch++;stores=[];store=null;rows=[];original=null;groups=[];dirty=false;uncertain=false;$('products').replaceChildren();$('variants').replaceChildren();$('store-picker').replaceChildren();$('editor-form').reset();$('store-name').textContent='';$('account-name').textContent='';$('workspace').hidden=true;$('login-view').hidden=false;message('save-error','');message('save-status','');message('list-status','');$('list-foot').textContent='';$('search').value='';for(const id of ['count-all','count-active','count-draft'])$(id).textContent='—';$('reload-product').hidden=true;lock(false);}
  function error(e,target){if(e.kind==='stale')return;if(e.kind==='session'){clearWorkspace();message('login-error',e.message);$('password').focus();return;}message(target,e.message||'Ocurrió un error. Intentá otra vez.');$(target).focus();}
  function changed(){dirty=true;message('save-status','Cambios sin guardar.');if(!uncertain)message('save-error','');$('editor-badge').textContent=names[$('product-state').value];$('editor-badge').className='badge '+$('product-state').value;}
  function mayLeave(){return !dirty||confirm('Tenés cambios sin guardar. ¿Querés salir de la edición?');}
  async function setup(){
    $('login-button').disabled=true;message('login-error','');$('config-retry').hidden=true;
    try{client?.dispose();const res=await fetch('/config.json',{cache:'no-store'});if(!res.ok)throw Error('No se pudo cargar la configuración.');client=PanelClient.createClient(await res.json(),undefined,{onChange(){clearWorkspace();message('login-error','La sesión cambió en otra pestaña. Volvé a ingresar para continuar.');}});const user=await client.restore();if(user)await enter(user);}
    catch(e){error(e,'login-error');$('config-retry').hidden=false;}
    finally{$('login-button').textContent='Ingresar';$('login-button').disabled=false;}
  }
  async function enter(user){
    const ticket=viewEpoch,available=await client.stores();if(ticket!==viewEpoch)return;
    if(!available.length){await client.logout();throw Error('Tu cuenta no tiene un comercio asignado. Consultá a quien preparó tu tienda.');}
    stores=available;store=stores[0];$('store-picker').replaceChildren();for(const s of stores){const o=element('option',s.name);o.value=s.id;$('store-picker').append(o);}
    $('store-picker-wrap').hidden=stores.length<2;$('account-name').textContent=user.email||'';$('login-view').hidden=true;$('workspace').hidden=false;$('editor-view').hidden=true;$('catalog-view').hidden=false;filter='all';$('search').value='';await load();
  }
  $('config-retry').addEventListener('click',setup);
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault();$('login-button').disabled=true;$('login-button').textContent='Ingresando…';message('login-error','');
    try{
      clearWorkspace();const user=await client.login($('email').value.trim(),$('password').value);$('password').value='';await enter(user);
    }catch(e){error(e,'login-error');}
    finally{$('password').value='';$('login-button').textContent='Ingresar';$('login-button').disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{
    if(busy||!mayLeave())return;clearWorkspace();$('login-button').disabled=true;let failure;
    try{await client.logout();}catch(e){failure=e;}finally{$('login-button').disabled=false;}
    if(failure)message('login-error','Saliste de este panel. No pudimos confirmar el cierre de la sesión en Supabase; mantené cerrada esta pestaña si compartís la computadora.');
  });
  async function load(){
    if(!store)return;const ticket=viewEpoch;lock(true);rows=[];$('products').replaceChildren();$('list-foot').textContent='';$('list-retry').hidden=true;message('list-status','Cargando productos…');$('products').setAttribute('aria-busy','true');$('store-name').textContent=store.name;
    for(const id of ['count-all','count-active','count-draft'])$(id).textContent='—';
    try{const loaded=await client.products(store.id);if(ticket!==viewEpoch)return;rows=loaded;render();}
    catch(e){if(ticket!==viewEpoch)return;error(e,'list-status');if(!['session','stale'].includes(e.kind))$('list-retry').hidden=false;}
    finally{if(ticket===viewEpoch){$('products').setAttribute('aria-busy','false');lock(false);}}
  }
  function render(){
    $('count-all').textContent=rows.length;$('count-active').textContent=rows.filter(r=>model.state(r)==='active').length;$('count-draft').textContent=rows.filter(r=>r.is_draft).length;
    for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
    const visible=model.filter(rows,$('search').value,filter);$('products').replaceChildren();
    message('list-status',visible.length?'':rows.length?'No encontramos productos':'Todavía no hay productos. Creá el primero.');
    $('list-foot').textContent=`${visible.length} de ${rows.length} productos · Guardados en administración, sin publicación.`;
    for(const row of visible){
      const line=element('article',undefined,'product-row');const info=element('div',undefined,'product-info');info.append(element('div',row.name||'Producto sin nombre','product-name'),element('div',row.catalog_data.category||'Sin categoría','product-category'));
      line.append(info,element('div',row.price===null?'Sin precio':money.format(row.price),'product-price'),element('span',names[model.state(row)],'badge '+model.state(row)));
      const edit=element('button','Editar','quiet');edit.type='button';edit.setAttribute('aria-label','Editar '+(row.name||'Producto sin nombre'));edit.addEventListener('click',()=>open(row));line.append(edit);$('products').append(line);
    }
  }
  function renderGroups(){
    $('variants').replaceChildren();const linked=model.photoLinked(original);const color=original?CatalogMedia.getRawColorGroup({optionGroups:original.option_groups}):null;
    groups.forEach((g,index)=>{
      const box=element('fieldset',undefined,'variant');box.dataset.groupId=g.id;box.dataset.locked=String(linked&&color?.id===g.id);box.append(element('legend','Variante '+(index+1)));
      for(const [key,label,value]of [['label','Nombre de variante ',g.label]]){
        const id=`variant-${index}-${key}`,l=element('label',label+(index+1)),input=element('input');l.htmlFor=id;input.id=id;input.value=value;input.dataset.field=key;input.maxLength=key==='label'?100:1500;input.addEventListener('input',changed);box.append(l,input);
      }
      const options=element('div',undefined,'variant-options');
      (g.options.length?g.options:['']).forEach((value,optionIndex)=>{
        const label=element('label',`Opción ${optionIndex+1}`),input=element('textarea');
        input.rows=1;input.value=value;input.dataset.option='true';input.id=`variant-${index}-option-${optionIndex}`;
        input.setAttribute('aria-label',`Opción ${optionIndex+1} de variante ${index+1}`);label.htmlFor=input.id;input.addEventListener('input',changed);
        const removeOption=element('button','Quitar opción','quiet remove-variant');removeOption.type='button';removeOption.setAttribute('aria-label',`Quitar opción ${optionIndex+1} de variante ${index+1}`);
        removeOption.addEventListener('click',()=>{groups=readGroups();groups[index].options.splice(optionIndex,1);renderGroups();changed();});
        options.append(label,input,removeOption);
      });box.append(options);
      const addOption=element('button','Agregar opción','secondary');addOption.type='button';addOption.setAttribute('aria-label',`Agregar opción a variante ${index+1}`);
      addOption.addEventListener('click',()=>{groups=readGroups();groups[index].options.push('');renderGroups();changed();$('variants').children[index].querySelectorAll('[data-option]')[groups[index].options.length-1].focus();});box.append(addOption);
      const remove=element('button','Quitar variante','quiet remove-variant');remove.type='button';remove.setAttribute('aria-label','Quitar variante '+(index+1));remove.addEventListener('click',()=>{groups=readGroups();groups.splice(index,1);renderGroups();changed();});box.append(remove);$('variants').append(box);
    });$('photo-lock').hidden=!linked;applyPhotoLock();
  }
  function readGroups(){return [...$('variants').children].map(box=>({id:box.dataset.groupId,label:box.querySelector('[data-field="label"]').value,options:[...box.querySelectorAll('[data-option]')].map(input=>input.value)}));}
  function open(row){
    original=row?structuredClone(row):null;const f=model.form(original);uncertain=false;dirty=false;groups=f.groups;$('reload-product').hidden=true;
    for(const [id,key]of [['product-name','name'],['price','price'],['old-price','oldPrice'],['category','category'],['short','short'],['description','description'],['product-state','state']])$(id).value=f[key];
    $('editor-title').textContent=row?'Editar producto':'Nuevo producto';$('editor-badge').textContent=names[f.state];$('editor-badge').className='badge '+f.state;message('save-status',row?'Datos guardados en administración.':'Completá los datos o guardá un borrador.');message('save-error','');
    renderGroups();$('catalog-view').hidden=true;$('editor-view').hidden=false;$('store-picker-wrap').hidden=true;lock(false);window.scrollTo(0,0);$('product-name').focus({preventScroll:true});
  }
  $('new-product').addEventListener('click',()=>open(null));
  $('add-variant').addEventListener('click',()=>{groups=readGroups();groups.push({id:'var-'+crypto.randomUUID(),label:'',options:[]});renderGroups();changed();$('variants').lastElementChild.querySelector('input').focus();});
  $('editor-form').addEventListener('input',changed);$('product-state').addEventListener('change',changed);
  $('editor-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||uncertain)return;message('save-error','');
    let payload;try{payload=model.prepare({name:$('product-name').value,price:$('price').value,oldPrice:$('old-price').value,category:$('category').value,short:$('short').value,description:$('description').value,state:$('product-state').value,groups:readGroups()},original);}catch(e){error(e,'save-error');return;}
    const ticket=viewEpoch;lock(true);$('save').textContent='Guardando…';message('save-status','Guardando cambios…');
    try{const saved=await client.save(store.id,original,payload);if(ticket!==viewEpoch)return;original=saved;dirty=false;$('editor-title').textContent='Editar producto';message('save-status','Cambios guardados en administración. No se publicaron en la tienda.');}
    catch(e){if(ticket!==viewEpoch)return;if(e.kind==='uncertain'||e.kind==='conflict')uncertain=true;$('reload-product').hidden=e.kind!=='conflict';message('save-status','No se confirmó el guardado.');error(e,'save-error');}
    finally{if(ticket===viewEpoch){lock(false);$('save').textContent='Guardar cambios';}}
  });
  $('reload-product').addEventListener('click',async()=>{
    if(busy||!original)return;
    if(dirty&&!confirm('Recargar reemplazará tus cambios sin guardar por la versión actual. ¿Querés continuar?'))return;
    const ticket=viewEpoch;lock(true);
    try{const current=await client.product(store.id,original.id);if(ticket===viewEpoch)open(current);}
    catch(e){if(ticket===viewEpoch)error(e,'save-error');}
    finally{if(ticket===viewEpoch)lock(false);}
  });
  $('back').addEventListener('click',async()=>{if(busy||!mayLeave())return;dirty=false;uncertain=false;original=null;$('editor-view').hidden=true;$('catalog-view').hidden=false;$('store-picker-wrap').hidden=stores.length<2;await load();});
  for(const id of ['refresh','list-retry'])$(id).addEventListener('click',load);
  $('search').addEventListener('input',render);for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;render();});
  $('store-picker').addEventListener('change',async()=>{store=stores.find(s=>s.id===$('store-picker').value);filter='all';$('search').value='';await load();});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  setup();
})();
