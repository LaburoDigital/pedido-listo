// Real local Auth/database; failure injection is limited to explicitly named network cases.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const {createPanelServer}=require('../scripts/serve-panel.cjs');
async function main(){
  const {localConfig,api,expectStatus,testReceiptPath}=await import('../scripts/local-api.mjs');
  const config=localConfig(),request=api(config),receipt=JSON.parse(await fs.readFile(testReceiptPath(),'utf8'));
  const admin={key:config.serviceKey,token:config.serviceKey},created=[],output=process.env.PEDIDO_LISTO_PANEL_EVIDENCE;
  await fs.mkdir(output,{recursive:true});
  const server=createPanelServer({url:config.url,key:process.env.SUPABASE_PUBLIC_KEY||config.anonKey});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const key='pedido-listo.local.auth.v1',errors=[];
  const check=r=>expectStatus(r,[200,201,204],'Fixture de estabilización');
  const account=(page,user)=>page.waitForFunction(email=>document.getElementById('account-name').textContent===email&&!document.getElementById('workspace').hidden,user.email);
  const login=async(page,user)=>{await page.getByLabel('Correo electrónico').fill(user.email);await page.getByLabel('Contraseña',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await account(page,user);};
  const button=(page,name)=>page.getByRole('button',{name,exact:true});
  const saved=page=>page.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
  const loggedOut=page=>page.waitForFunction(()=>document.getElementById('workspace').hidden&&!document.getElementById('login-view').hidden);
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const context=await browser.newContext({viewport});const a=await context.newPage(),b=await context.newPage();
      for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message));
      const row=check(await request('/rest/v1/products',{...admin,method:'POST',body:{store_id:receipt.users[0].store_id,name:'Estabilidad '+viewport.width,price:100,is_draft:false,available:true,catalog_data:{description:'Original'}}}))[0];created.push(row);
      const query=`/rest/v1/products?store_id=eq.${row.store_id}&id=eq.${row.id}`;
      await a.goto(base);await login(a,receipt.users[0]);await b.goto(base);await account(b,receipt.users[0]);
      assert.equal(await a.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k))).sort(),key).then(keys=>keys.join(',')),'expires,refresh,token,user');
      // Expiration invokes real token rotation once across two tabs.
      let refreshes=0;context.on('request',r=>{if(r.url().includes('grant_type=refresh_token'))refreshes++;});
      await a.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.expires=0;localStorage.setItem(k,JSON.stringify(s));},key);
      await Promise.all([a.reload(),b.reload()]);await Promise.all([account(a,receipt.users[0]),account(b,receipt.users[0])]);assert.equal(refreshes,1);
      for(const page of [a,b])await button(page,'Editar '+row.name).click();
      await a.getByLabel('Precio actual').fill('120');await a.getByLabel('Descripción',{exact:true}).fill('Guardado en primera pestaña');
      await b.getByLabel('Precio actual').fill('140');await b.getByLabel('Descripción',{exact:true}).fill('Mi edición conservada');
      // Temporary Auth failure is not logout and must not discard an unsaved form.
      await a.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.expires=0;localStorage.setItem(k,JSON.stringify(s));},key);
      await a.route('**/auth/v1/token?grant_type=refresh_token',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
      await button(a,'Guardar cambios').click();await a.getByText('El servicio de acceso no está disponible',{exact:false}).waitFor();assert.equal(await a.getByLabel('Descripción',{exact:true}).inputValue(),'Guardado en primera pestaña');assert.ok(await a.evaluate(k=>!!localStorage.getItem(k),key));assert.equal(Number(check(await request(query,admin))[0].price),100);await a.unroute('**/auth/v1/token?grant_type=refresh_token');
      await button(a,'Guardar cambios').click();await saved(a);
      await button(b,'Guardar cambios').click();await b.getByText('Este producto fue modificado',{exact:false}).waitFor();
      assert.equal(await b.getByLabel('Precio actual').inputValue(),'140');assert.equal(await b.getByLabel('Descripción',{exact:true}).inputValue(),'Mi edición conservada');assert.equal(await button(b,'Guardar cambios').isDisabled(),true);
      assert.equal(Number(check(await request(query,admin))[0].price),120);
      b.once('dialog',d=>d.dismiss());await button(b,'Recargar datos actuales').click();assert.equal(await b.getByLabel('Descripción',{exact:true}).inputValue(),'Mi edición conservada');
      await b.screenshot({path:path.join(output,'conflicto-'+viewport.width+'.png'),fullPage:true});
      assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      // A failed reload keeps the unsaved form; it never partially replaces fields.
      await b.route('**/rest/v1/products?**',r=>r.abort());b.once('dialog',d=>d.accept());await button(b,'Recargar datos actuales').click();await b.getByText('No se pudo conectar.',{exact:false}).waitFor();assert.equal(await b.getByLabel('Descripción',{exact:true}).inputValue(),'Mi edición conservada');await b.unroute('**/rest/v1/products?**');
      b.once('dialog',d=>d.accept());await button(b,'Recargar datos actuales').click();await b.waitForFunction(()=>document.getElementById('description').value==='Guardado en primera pestaña');
      assert.equal(await button(b,'Guardar cambios').isDisabled(),false);await b.getByLabel('Precio actual').fill('150');await button(b,'Guardar cambios').click();await saved(b);assert.equal(Number(check(await request(query,admin))[0].price),150);
      if(viewport.width===390){await b.setViewportSize({width:320,height:740});assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
      // Logout immediately removes both accounts' in-memory product data and tokens.
      await button(a,'Salir').click();await Promise.all([loggedOut(a),loggedOut(b)]);assert.equal(await b.locator('#products').textContent(),'');assert.equal(await b.getByLabel('Descripción',{exact:true}).inputValue(),'');assert.equal(await b.evaluate(k=>localStorage.getItem(k),key),null);
      await login(b,receipt.users[1]);await a.reload();await account(a,receipt.users[1]);assert.equal(await a.getByText(row.name,{exact:true}).count(),0);await button(a,'Editar Bolso de prueba B').waitFor();
      // Failed Auth validation on reload must not expose a cached workspace.
      await a.route('**/auth/v1/user',r=>r.abort());await a.reload();await a.getByText('No se pudo conectar.',{exact:false}).waitFor();await loggedOut(a);assert.ok(await a.evaluate(k=>!!localStorage.getItem(k),key));await a.unroute('**/auth/v1/user');await button(a,'Reintentar conexión').click();await account(a,receipt.users[1]);
      // A rejected access token removes persistence rather than trusting stored user data.
      await a.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.token='invalid.jwt.token';localStorage.setItem(k,JSON.stringify(s));},key);await a.reload();await a.getByText('Tu sesión venció.',{exact:false}).waitFor().catch(async e=>{console.log('Invalid session diagnostic',await a.locator('#login-error').textContent(),await a.evaluate(k=>({stored:!!localStorage.getItem(k),workspace:document.getElementById('workspace').hidden}),key));throw e;});await loggedOut(a);assert.equal(await a.evaluate(k=>localStorage.getItem(k),key),null);
      await context.close();console.log(`PASS ${viewport.width}px: persistencia, refresh real coordinado, conflicto, cancelar/recargar, salida entre pestañas, cuenta B, red y token inválido`);
    }
    // Deliver an old catalogue only AFTER another tab logs out and changes account.
    const context=await browser.newContext();const a=await context.newPage(),b=await context.newPage();
    await a.goto(base);await login(a,receipt.users[0]);await b.goto(base);await account(b,receipt.users[0]);await button(a,'Editar Remera de prueba').waitFor();
    let deliver,received;const intercepted=new Promise(r=>{received=r;});
    await a.route('**/rest/v1/products?**',async route=>{const response=await route.fetch();received();await new Promise(r=>{deliver=r;});await route.fulfill({response});});
    await button(a,'Actualizar').click();await intercepted;await button(b,'Salir').click();await loggedOut(a);await login(b,receipt.users[1]);deliver();await a.waitForTimeout(250);assert.equal(await a.locator('#products').textContent(),'');assert.equal(await a.locator('#account-name').textContent(),'');await a.unroute('**/rest/v1/products?**');await a.reload();await account(a,receipt.users[1]);await context.close();console.log('PASS respuesta tardía de comercio A descartada después del cambio a B');
    assert.deepEqual(errors,[]);
  }finally{
    for(const row of created)check(await request(`/rest/v1/products?store_id=eq.${row.store_id}&id=eq.${row.id}`,{...admin,method:'DELETE'}));
    await browser.close();await new Promise(r=>server.close(r));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
