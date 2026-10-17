// Integration test: actual local Auth/PostgREST. Requires the private phase-1 receipt.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const {createPanelServer}=require('../scripts/serve-panel.cjs');
async function main(){
  const {localConfig,api,expectStatus,testReceiptPath}=await import('../scripts/local-api.mjs');
  const config=localConfig(),request=api(config),admin={key:config.serviceKey,token:config.serviceKey};
  const receipt=JSON.parse(await fs.readFile(testReceiptPath(),'utf8'));assert.equal(receipt.state,'ready');
  const output=process.env.PEDIDO_LISTO_PANEL_EVIDENCE;if(!output)throw Error('Falta directorio de evidencias.');await fs.mkdir(output,{recursive:true});
  const server=createPanelServer({url:config.url,key:process.env.SUPABASE_PUBLIC_KEY||config.anonKey});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const created=[];let original;
  const check=(r)=>expectStatus(r,[200,201,204],'Fixture de navegador');
  const login=async(page,user)=>{await page.goto(base);await page.getByLabel('Correo electrónico').fill(user.email);await page.getByLabel('Contraseña',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('heading',{name:'Tu catálogo',exact:true}).waitFor();};
  try{
    for(const [index,viewport]of [{width:1440,height:1000},{width:390,height:844}].entries()){
      const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      page.on('dialog',d=>d.accept());const user=receipt.users[index];
      await page.goto(base);await page.getByLabel('Correo electrónico').fill(user.email);await page.getByLabel('Contraseña',{exact:true}).fill('incorrect-password');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByText('No pudimos ingresar.',{exact:false}).waitFor();
      await login(page,user);await page.getByRole('button',{name:'Nuevo producto',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),1);
      assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).length),0);
      const other=receipt.users[1-index];assert.equal(await page.getByText(index===0?'Bolso de prueba B':'Remera de prueba',{exact:true}).count(),0);
      await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
      await page.getByLabel('Nombre del producto').fill('Prueba panel '+index);
      await page.getByLabel('Precio actual').fill('-1');await page.getByLabel('Estado del producto').selectOption('active');
      await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Precio: Usá un precio',{exact:false}).waitFor();
      await page.getByLabel('Precio actual').fill('1290,50');await page.getByLabel('Categoría',{exact:true}).fill('Accesorios');
      await page.getByLabel('Descripción',{exact:true}).fill('Producto ficticio creado desde el panel.');
      await page.getByRole('button',{name:'Agregar variante',exact:true}).click();await page.getByLabel('Nombre de variante 1').fill('Color');await page.getByLabel('Opción 1 de variante 1',{exact:true}).fill('Azul');await page.getByRole('button',{name:'Agregar opción a variante 1',exact:true}).click();await page.getByLabel('Opción 2 de variante 1',{exact:true}).fill('Verde');
      await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
      const rows=check(await request(`/rest/v1/products?store_id=eq.${user.store_id}&name=eq.${encodeURIComponent('Prueba panel '+index)}`,admin));assert.equal(rows.length,1);created.push(rows[0]);
      assert.equal(Number(rows[0].price),1290.5);assert.deepEqual(rows[0].option_groups[0].options,['Azul','Verde']);
      assert.equal('store_id' in await page.locator('#editor-form').evaluate(f=>Object.fromEntries(new FormData(f))),false);
      await page.getByLabel('Estado del producto').selectOption('inactive');await page.getByLabel('Precio actual').fill('1350');await page.getByLabel('Opción 2 de variante 1',{exact:true}).fill('Rojo');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
      const updated=check(await request(`/rest/v1/products?store_id=eq.${user.store_id}&id=eq.${rows[0].id}`,admin))[0];assert.equal(updated.available,false);assert.equal(Number(updated.price),1350);assert.deepEqual(updated.option_groups[0].options,['Azul','Rojo']);
      await page.getByRole('button',{name:'Volver al catálogo',exact:true}).click();await page.getByLabel('Buscar productos').fill('Prueba panel '+index);await page.getByRole('button',{name:'Inactivos',exact:true}).click();await page.getByRole('button',{name:'Editar Prueba panel '+index,exact:true}).waitFor();
      await page.getByRole('button',{name:'Activos',exact:true}).click();await page.getByText('No encontramos productos').waitFor();
      await page.getByLabel('Buscar productos').fill('');await page.getByRole('button',{name:'Todos',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,index?'panel-celular.png':'panel-escritorio.png'),fullPage:true});
      await page.getByRole('button',{name:'Editar Prueba panel '+index,exact:true}).click();
      await page.screenshot({path:path.join(output,index?'editor-celular.png':'editor-escritorio.png'),fullPage:true});
      if(index){await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize(viewport);}
      // A failed read can be retried without logging out.
      await page.getByRole('button',{name:'Volver al catálogo',exact:true}).click();
      await page.route('**/rest/v1/products?**',r=>r.abort());await page.getByRole('button',{name:'Actualizar',exact:true}).click();await page.getByRole('button',{name:'Reintentar',exact:true}).waitFor();await page.unroute('**/rest/v1/products?**');await page.getByRole('button',{name:'Reintentar',exact:true}).click();await page.getByRole('button',{name:'Editar Prueba panel '+index,exact:true}).waitFor();
      // A write with an unknown outcome must not be retried automatically.
      await page.getByRole('button',{name:'Editar Prueba panel '+index,exact:true}).click();await page.getByLabel('Descripción',{exact:true}).fill('Texto conservado si falla la red');
      await page.route('**/rest/v1/products?**',r=>r.request().method()==='PATCH'?r.abort():r.continue());await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('No pudimos confirmar el guardado.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Descripción',{exact:true}).inputValue(),'Texto conservado si falla la red');assert.equal(await page.getByRole('button',{name:'Guardar cambios',exact:true}).isDisabled(),true);await page.unroute('**/rest/v1/products?**');
      await page.getByRole('button',{name:'Volver al catálogo',exact:true}).click();
      await page.getByRole('button',{name:'Salir',exact:true}).click();await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();assert.equal(await page.getByText('Prueba panel '+index,{exact:true}).count(),0);
      await login(page,other);assert.equal(await page.getByText('Prueba panel '+index,{exact:true}).count(),0);await page.reload();await page.getByRole('heading',{name:'Tu catálogo',exact:true}).waitFor();await page.waitForFunction(email=>document.getElementById('account-name').textContent===email,other.email).catch(async e=>{await page.screenshot({path:path.join(output,'restore-failure.png'),fullPage:true});console.log('Restore diagnostics:',await page.locator('#login-error').textContent(),errors);throw e;});assert.deepEqual(errors,[]);await context.close();
      console.log(`PASS panel ${index?'celular 390px':'escritorio 1440px'}: login real, RLS, alta/edición, filtros, variantes, errores, salida y recarga`);
    }
    // Edit an existing color gallery and prove no metadata is lost.
    original=check(await request(`/rest/v1/products?store_id=eq.${receipt.users[0].store_id}&id=eq.ropa-001`,admin))[0];
    const variantRow={store_id:original.store_id,name:'Opciones con separadores',price:123,is_draft:false,available:true,option_groups:[{id:'acabado',label:'Acabado',options:['Mate; cepillado','Brillante']}],catalog_data:{}};
    const special=check(await request('/rest/v1/products',{...admin,method:'POST',body:variantRow}))[0];created.push(special);
    const roundtrip=await browser.newPage();await login(roundtrip,receipt.users[0]);await roundtrip.getByRole('button',{name:'Editar Opciones con separadores',exact:true}).click();await roundtrip.getByLabel('Descripción',{exact:true}).fill('Solo cambia el texto');await roundtrip.getByRole('button',{name:'Guardar cambios',exact:true}).click();await roundtrip.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
    const specialAfter=check(await request(`/rest/v1/products?store_id=eq.${special.store_id}&id=eq.${special.id}`,admin))[0];assert.deepEqual(specialAfter.option_groups,special.option_groups);
    await roundtrip.getByLabel('Opción 1 de variante 1',{exact:true}).fill('Mate; satinado');await roundtrip.getByRole('button',{name:'Guardar cambios',exact:true}).click();await roundtrip.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
    await roundtrip.getByRole('button',{name:'Volver al catálogo',exact:true}).click();await roundtrip.getByRole('button',{name:'Editar Opciones con separadores',exact:true}).click();assert.equal(await roundtrip.getByLabel('Opción 1 de variante 1',{exact:true}).inputValue(),'Mate; satinado');
    const recovered=check(await request(`/rest/v1/products?store_id=eq.${special.store_id}&id=eq.${special.id}`,admin))[0];assert.deepEqual(require('../src/product-mapper.cjs').toProduct(recovered).optionGroups[0].options,['Mate; satinado','Brillante']);await roundtrip.close();console.log('PASS opciones con ; preservadas, editadas, recuperadas y compatibles con motor');
    const gallery=check(await request('/rest/v1/products',{...admin,method:'POST',body:{...variantRow,name:'Galería automática de prueba',option_groups:[],catalog_data:{mediaMode:'auto',image:'https://catalog.example.test/frente.webp',gallery:['https://catalog.example.test/dorso.webp']}}}))[0];created.push(gallery);
    const guard=await browser.newPage();guard.on('dialog',d=>d.accept());await login(guard,receipt.users[0]);await guard.getByRole('button',{name:'Editar Galería automática de prueba',exact:true}).click();await guard.getByRole('button',{name:'Agregar variante',exact:true}).click();await guard.getByLabel('Nombre de variante 1').fill('Color');await guard.getByLabel('Opción 1 de variante 1',{exact:true}).fill('Rojo');await guard.getByRole('button',{name:'Agregar opción a variante 1',exact:true}).click();await guard.getByLabel('Opción 2 de variante 1',{exact:true}).fill('Azul');await guard.getByRole('button',{name:'Guardar cambios',exact:true}).click();await guard.getByText('Las nuevas variantes cambiarían la asociación de fotografías.',{exact:false}).waitFor();
    assert.deepEqual(check(await request(`/rest/v1/products?store_id=eq.${gallery.store_id}&id=eq.${gallery.id}`,admin))[0],gallery);await guard.close();console.log('PASS galería automática: asociación incorrecta bloqueada sin modificar la base');
    const page=await browser.newPage();await login(page,receipt.users[0]);await page.getByRole('button',{name:'Editar Remera de prueba',exact:true}).click();
    assert.equal(await page.getByLabel('Opción 1 de variante 2',{exact:true}).isDisabled(),true);
    await page.getByLabel('Descripción',{exact:true}).fill('Edición de compatibilidad');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados en administración.',{exact:false}).waitFor();
    const after=check(await request(`/rest/v1/products?store_id=eq.${original.store_id}&id=eq.${original.id}`,admin))[0];
    const {description:_,...beforeData}=original.catalog_data;const {description:__,...afterData}=after.catalog_data;assert.deepEqual(afterData,beforeData);assert.deepEqual(after.option_groups,original.option_groups);assert.equal(after.id,original.id);await page.close();console.log('PASS galerías por color y metadatos preservados');
  }finally{
    if(original)check(await request(`/rest/v1/products?store_id=eq.${original.store_id}&id=eq.${original.id}`,{...admin,method:'PATCH',body:{catalog_data:original.catalog_data}}));
    for(const p of created)check(await request(`/rest/v1/products?store_id=eq.${p.store_id}&id=eq.${p.id}`,{...admin,method:'DELETE'}));
    await browser.close();await new Promise(r=>server.close(r));
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
