(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./session.js'):root.PanelSession);if(typeof module==='object'&&module.exports)module.exports=api;else root.PanelClient=api;})(globalThis,function(Session){
  'use strict';
  class PanelError extends Error{constructor(message,kind='error'){super(message);this.kind=kind;}}
  function validateConfig(config){
    if(config?.url!=='http://127.0.0.1:54321')throw Error('El panel solo admite Supabase local.');
    let publicKey=typeof config.key==='string'&&/^sb_publishable_[\w-]+$/.test(config.key);
    if(!publicKey){try{publicKey=JSON.parse(atob(config.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}}
    if(!publicKey)throw Error('Se requiere una clave pública; nunca una clave privada.');
    return {url:config.url,key:config.key};
  }
  function createClient(rawConfig,fetcher=globalThis.fetch.bind(globalThis),options={}){
    const config=validateConfig(rawConfig),session=Session.createSession(raw,options);
    async function raw(path,{method='GET',body,token,headers={}}={}){
      let r;try{r=await fetcher(config.url+path,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{apikey:config.key,'Content-Type':'application/json',Prefer:'return=representation',...headers,...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
      catch{throw new PanelError(method!=='GET'&&path.startsWith('/rest/')?'No pudimos confirmar el guardado. Revisá el catálogo antes de volver a crear o guardar el producto.':'No se pudo conectar. Comprobá que Supabase local siga encendido e intentá otra vez.',method!=='GET'&&path.startsWith('/rest/')?'uncertain':'network');}
      const data=r.status===204?null:await r.json().catch(()=>null);
      if(!r.ok){
        if(token&&(r.status===401||(r.status===403&&path==='/auth/v1/user')))throw new PanelError('Tu sesión venció. Volvé a ingresar.','session');
        if(data?.code==='PT409'||data?.code==='PT428')throw new PanelError('Este producto fue modificado desde que lo abriste. Tus cambios siguen en el formulario. Recargá los datos actuales antes de guardar.','conflict');
        if(path.includes('grant_type=password'))throw new PanelError(r.status===429?'Demasiados intentos. Esperá un momento.':'No pudimos ingresar. Revisá tu correo y contraseña.');
        if(path.startsWith('/auth/')&&(r.status===429||r.status>=500))throw new PanelError('El servicio de acceso no está disponible por el momento. Tus cambios siguen en el formulario. Esperá un momento y volvé a intentar.','network');
        if(r.status===403)throw new PanelError('No tenés permiso para realizar este cambio.','permission');
        if(r.status>=500)throw new PanelError(method==='GET'?'El catálogo no está disponible. Intentá otra vez.':'No pudimos confirmar el guardado. Revisá el catálogo antes de repetirlo.',method==='GET'?'network':'uncertain');
        throw new PanelError('No se pudo guardar. Revisá los precios, las variantes y el estado del producto.');
      }
      return data;
    }
    async function request(path,options={}){const ticket=session.ticket(),token=await session.token();session.check(ticket);try{const result=await raw(path,{...options,token});session.check(ticket);return result;}catch(e){session.check(ticket);if(e.kind==='session')session.clear();throw e;}}
    const where=(store,id)=>'store_id=eq.'+encodeURIComponent(store)+(id===undefined?'':'&id=eq.'+encodeURIComponent(id));
    return {
      login:session.login,logout:session.logout,restore:session.restore,dispose:session.dispose,
      stores(){return request('/rest/v1/stores?select=id,name&order=name.asc');},
      async product(store,id){const rows=await request('/rest/v1/products?'+where(store,id));if(rows?.length!==1||rows[0].store_id!==store||rows[0].id!==id)throw new PanelError('El producto ya no está disponible para esta cuenta.','conflict');return rows[0];},
      async products(store){let rows=[];for(let offset=0;;offset+=200){const page=await request('/rest/v1/products?'+where(store)+'&order=id.asc&limit=200&offset='+offset);if(!Array.isArray(page)||page.some(p=>p.store_id!==store))throw new PanelError('La respuesta del catálogo no corresponde al comercio.');rows.push(...page);if(page.length<200)return rows;}},
      async save(store,original,payload){
        const allowed=['name','price','old_price','is_draft','available','option_groups','catalog_data'];
        if(Object.keys(payload).some(k=>!allowed.includes(k)))throw new PanelError('No se permite modificar la identidad del producto.');
        let path='/rest/v1/products',method='POST',body={...payload,store_id:store},headers={};
        if(original){
          if(original.store_id!==store)throw new PanelError('El producto no corresponde al comercio.');
          path+='?'+where(store,original.id);
          if(!original.revision)throw new PanelError('Recargá el producto antes de editarlo.','conflict');
          method='PATCH';body=payload;headers={'If-Match':original.revision};
        }
        const rows=await request(path,{method,body,headers});
        if(original&&Array.isArray(rows)&&rows.length===0)throw new PanelError('El producto ya no está disponible para esta cuenta.','conflict');
        if(!Array.isArray(rows)||rows.length!==1||rows[0].store_id!==store||(original&&rows[0].id!==original.id))throw new PanelError('No pudimos confirmar el guardado. Actualizá el catálogo antes de repetirlo.','uncertain');
        return rows[0];
      }
    };
  }
  return {createClient,validateConfig,PanelError};
});
