// Disposable pilot. Deploy ONLY with access=MYSELF, executeAs=USER_DEPLOYING.
// All helpers end in _ so google.script.run cannot invoke them.
function owner_(){
 const expected=PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL');
 const active=Session.getActiveUser().getEmail();
 const effective=Session.getEffectiveUser().getEmail();
 // Fail closed when Google does not reveal active identity. Never substitute effective identity.
 if(!expected||!active||active!==expected||effective!==expected)throw Error('Acceso no autorizado.');
}
function property_(name){const value=PropertiesService.getScriptProperties().getProperty(name);if(!value)throw Error('Falta configurar el piloto: '+name);return value;}
function cell_(name){return SpreadsheetApp.openById(property_(name)).getSheets()[0].getRange('A1');}
function locked_(operation){
 owner_();const lock=LockService.getScriptLock();if(!lock.tryLock(5000))throw Error('Hay otro guardado en curso. Esperá y recargá.');
 try{return operation();}finally{lock.releaseLock();}
}
function state_(){
 const data=JSON.parse(cell_('PRIVATE_SHEET_ID').getValue());
 if(!Number.isSafeInteger(data.version)||!Array.isArray(data.rows)||data.rows.length>10)throw Error('Datos del piloto inválidos.');
 return data;
}
function write_(data){cell_('PRIVATE_SHEET_ID').setValue(SheetsPilot.encode(data));SpreadsheetApp.flush();}
function locate_(state,id){const row=state.rows.find(r=>r.id===id);if(!row)throw Error('Producto inexistente.');return row;}
function doGet(){owner_();return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Pedido Listo — Piloto').addMetaTag('viewport','width=device-width,initial-scale=1');}
function listProducts(){return locked_(()=>state_());}
function saveProduct(command){return locked_(()=>{
 const data=state_(),original=command.id?locate_(data,command.id):null;
 if(!original&&data.rows.length>=10)throw Error('Piloto limitado a diez productos.');
 const row=SheetsPilot.save(original,command,Utilities.getUuid());
 if(original)data.rows[data.rows.indexOf(original)]=row;else data.rows.push(row);
 data.version++;write_(data);return {row,version:data.version};
});}
function publishCatalog(expected){return locked_(()=>{
 const data=state_();if(data.version!==expected)throw Error('CONFLICT: cambió el catálogo. Recargá antes de publicar.');
 const snapshot=SheetsPilot.snapshot(data.rows,'catalog-'+data.version);
 cell_('PUBLIC_SHEET_ID').setValue(SheetsPilot.encode(snapshot));SpreadsheetApp.flush();
 return {version:snapshot.version,status:'pending'};
});}
function verifyPublication(){
 owner_();const url=property_('PUBLIC_CSV_URL');
 if(!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[a-zA-Z0-9_-]+\/pub\?/.test(url)||!url.includes('output=csv'))throw Error('URL pública CSV inválida.');
 // Public export only; no OAuth token or ImageKit key is included in this request.
 const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw Error('No se pudo comprobar la publicación pública.');
 const observed=SheetsPilotProvider.parseSnapshot(response.getContentText());
 const intended=JSON.parse(cell_('PUBLIC_SHEET_ID').getValue());
 const current=state_();
 return {version:observed.version,status:JSON.stringify(observed)===JSON.stringify(intended)?'published':'pending',hasUnpublishedChanges:observed.version!=='catalog-'+current.version};
}
function uploadPhoto(form){
 owner_();const id=form.productId,expected=Number(form.revision),color=form.color;
 const original=locked_(()=>locate_(state_(),id));SheetsPilot.revision(original,expected);
 if(typeof color!=='string')throw Error('Elegí el color.');
 // Validate association before making a billable/external call.
 SheetsPilot.attach(original,expected,{id:'validation',productId:id,color,url:'https://ik.imagekit.io/validation/image.jpg'});
 const blob=form.photo;if(!blob||typeof blob.getBytes!=='function')throw Error('Seleccioná una fotografía.');
 const bytes=blob.getBytes(),unsigned=bytes.map(b=>b&255);
 const jpeg=unsigned[0]===255&&unsigned[1]===216&&unsigned[2]===255;
 const png=[137,80,78,71,13,10,26,10].every((b,i)=>unsigned[i]===b);
 const mime=jpeg?'image/jpeg':png?'image/png':null;
 if(!mime||bytes.length>2*1024*1024||bytes.length<16)throw Error('Usá una foto JPG o PNG de hasta 2 MB para este piloto.');
 const endpoint=property_('IMAGEKIT_URL_ENDPOINT');
 if(!/^https:\/\/ik\.imagekit\.io\/[a-zA-Z0-9_-]+\/?$/.test(endpoint))throw Error('Endpoint de imágenes inválido.');
 const response=UrlFetchApp.fetch('https://upload.imagekit.io/api/v1/files/upload',{
  method:'post',muteHttpExceptions:true,
  headers:{Authorization:'Basic '+Utilities.base64Encode(property_('IMAGEKIT_PRIVATE_KEY')+':')},
  payload:{file:Utilities.newBlob(bytes,mime,'photo.'+(jpeg?'jpg':'png')),fileName:Utilities.getUuid()+'.'+(jpeg?'jpg':'png'),folder:'/pedido-listo-piloto/'+id,useUniqueFileName:'true'}
 });
 if(response.getResponseCode()<200||response.getResponseCode()>=300)throw Error('ImageKit rechazó la carga. Revisá la cuenta y su cuota.');
 let file;try{file=JSON.parse(response.getContentText());}catch(_){throw Error('Respuesta de imágenes inválida.');}
 if(typeof file.url!=='string'||!file.url.startsWith(endpoint.replace(/\/$/,'')+'/')||typeof file.fileId!=='string')throw Error('ImageKit devolvió una referencia inesperada.');
 // Never hold a Sheets lock during network upload. Recheck revision before association.
 try{return locked_(()=>{
  const data=state_(),row=locate_(data,id);
  const next=SheetsPilot.attach(row,expected,{id:file.fileId,productId:id,color,url:file.url});
  data.rows[data.rows.indexOf(row)]=next;data.version++;write_(data);return {row:next,version:data.version};
 });}catch(error){throw Error('La foto se subió, pero NO se asoció al producto. '+(String(error.message).includes('CONFLICT')?'CONFLICT: recargá el producto.':'Revisá el estado antes de reintentar.')+' Puede quedar un archivo huérfano en la carpeta del piloto.');}
}
// Run manually in the Apps Script editor only, AFTER reviewing and authorizing scopes.
function setupPilot(){
 const props=PropertiesService.getScriptProperties();
 const active=Session.getActiveUser().getEmail();
 if(!active||active!==Session.getEffectiveUser().getEmail())throw Error('Se necesita la cuenta dueña.');
 if(props.getProperty('PRIVATE_SHEET_ID')||props.getProperty('PUBLIC_SHEET_ID'))throw Error('El piloto ya tiene archivos: no se reemplazarán.');
 const privateSheet=SpreadsheetApp.create('Pedido Listo — Piloto — Privado');
 props.setProperty('PRIVATE_SHEET_ID',privateSheet.getId());props.setProperty('OWNER_EMAIL',active);
 privateSheet.getSheets()[0].getRange('A1').setValue(SheetsPilot.encode({version:0,rows:[]}));
 const publicSheet=SpreadsheetApp.create('Pedido Listo — Piloto — Catálogo público');
 props.setProperty('PUBLIC_SHEET_ID',publicSheet.getId());
 publicSheet.getSheets()[0].getRange('A1').setValue(SheetsPilot.encode({schema:1,version:'catalog-0',products:[]}));
 SpreadsheetApp.flush();
 // No automatic sharing/publication, no secrets in logs. Publish ONLY the public file after approval.
}
