(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PanelSession=api;})(globalThis,function(){
  'use strict';
  const failure=(message,kind)=>Object.assign(new Error(message),{kind});
  function createSession(raw,options={}){
    const key='pedido-listo.local.auth.v1';
    // Web Locks serialize refresh-token rotation between tabs of this origin.
    const storage=options.storage??globalThis.localStorage;
    const locks=options.locks??globalThis.navigator?.locks;
    let session=null,epoch=0,refreshing=null;
    const stale=()=>failure('La sesión cambió. Volvé a ingresar.','stale');
    const locked=fn=>locks?locks.request(key,fn):fn();
    function valid(s){return s&&typeof s.token==='string'&&s.token&&typeof s.refresh==='string'&&s.refresh&&Number.isFinite(s.expires)&&typeof s.user?.id==='string'&&s.user.id;}
    function read(){if(!storage)return session;try{const value=JSON.parse(storage.getItem(key));if(valid(value))return value;storage.removeItem(key);return null;}catch{storage.removeItem(key);return null;}}
    function write(value){if(storage){if(value)storage.setItem(key,JSON.stringify(value));else storage.removeItem(key);}session=value;}
    function clear(){epoch++;write(null);}
    function accept(data){const value={token:data.access_token,refresh:data.refresh_token,expires:Date.now()+Number(data.expires_in??3600)*1000,user:{id:data.user?.id,email:data.user?.email}};if(!valid(value))throw failure('Respuesta de acceso inválida.','session');write(value);return value.user;}
    function check(ticket){if(ticket!==epoch)throw stale();}
    function sync(){const saved=read();if(saved?.user.id!==session?.user.id){session=null;epoch++;throw stale();}if(saved)session=saved;}
    async function token(){
      sync();if(!session)throw failure('Iniciá sesión para continuar.','session');
      if(session.expires<Date.now()+30000){
        if(!refreshing){const ticket=epoch;refreshing=locked(async()=>{
          check(ticket);sync();if(session.expires>=Date.now()+30000)return;
          const before=session.refresh;
          try{const data=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:before}});check(ticket);if(read()?.refresh!==before)throw stale();accept(data);}
          catch(e){check(ticket);if(e.kind!=='network'&&e.kind!=='stale'){clear();throw failure('Tu sesión venció. Volvé a ingresar.','session');}throw e;}
        }).finally(()=>{refreshing=null;});}await refreshing;
      }
      return session.token;
    }
    async function restore(){
      session=read();if(!session)return null;const ticket=epoch,access=await token();check(ticket);
      try{const user=await raw('/auth/v1/user',{token:access});check(ticket);sync();if(user?.id!==session.user.id)throw failure('La sesión no es válida. Volvé a ingresar.','session');return {id:user.id,email:user.email};}
      catch(e){check(ticket);if(e.kind==='session')clear();throw e;}
    }
    async function login(email,password){clear();const ticket=epoch;return locked(async()=>{check(ticket);const data=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});check(ticket);return accept(data);});}
    async function logout(){const old=session;clear();if(old)await raw('/auth/v1/logout?scope=local',{method:'POST',token:old.token});}
    const listener=e=>{if(e.key!==key&&e.key!==null)return;const saved=read();if(saved?.user.id===session?.user.id&&saved){session=saved;return;}session=null;epoch++;options.onChange?.();};
    globalThis.addEventListener?.('storage',listener);
    return {key,login,logout,restore,token,clear,ticket:()=>epoch,check:ticket=>{check(ticket);sync();},dispose:()=>globalThis.removeEventListener?.('storage',listener)};
  }
  return {createSession};
});
