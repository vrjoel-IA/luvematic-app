/* Run against local Vite with Playwright installed, or set PLAYWRIGHT_MODULE. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const baseURL = process.env.RESPONSIVE_BASE_URL || 'http://127.0.0.1:5173';
const output = path.resolve(process.env.RESPONSIVE_OUTPUT || '../responsive-audit');
const today = new Date().toISOString().slice(0, 10);
const user = { id: 'test-user', id_usuario: 'test-user', nombre: 'Técnico de prueba', nombre_completo: 'Técnico de prueba con nombre y apellidos largos', rol: 'Direccion', email: 'prueba@example.invalid', activo: true };
const client = { id: 'client-1', razon_social: 'Comunidad de propietarios Avenida del Parque Industrial', cif: 'PRUEBA', telefono: '600000000', email: 'cliente@example.invalid' };
const door = { id: 'door-1', id_instalacion: 'site-1', tipo: 'Seccional', identificador: 'Entrada principal de vehículos industriales', estado: 'operativa', marca: 'Marca de prueba', modelo: 'ModeloConIdentificadorExtensoSinEspacios123456789', numero_serie: '1234567890', frecuencia_mant: 'mensual', fin_contrato: '2027-09-01', accesorios: [{ elemento: 'Fotocélula de seguridad', marca: 'Marca', modelo: 'ModeloLargo12345678901234567890' }], Grupos_Mantenimiento: { nombre: 'Grupo de prueba' } };
const site = { id: 'site-1', id_cliente: client.id, direccion: 'Avenida del Parque Industrial, 123, edificio de mantenimiento', contacto_1: 'Responsable de mantenimiento', telefono_1: '600000000', contacto_local: 'Responsable de mantenimiento', telefono_local: '600000000', Clientes_Mant: client, Puertas: [door] };
const maintenance = { id: 'mant-1', id_instalacion: site.id, id_puerta: door.id, id_tecnico: user.id, id_grupo: null, frecuencia: 'mensual', estado: 'asignado', fecha_programada: today, Instalaciones: site, Puertas: door, Usuarios: user };
const aviso = { id_aviso: 1001, nombre_cliente: client.razon_social, direccion_cliente: site.direccion, telefono_cliente: '600000000', tipo_puerta: 'Seccional', descripcion_problema: 'La puerta no cierra correctamente. Revisar sensores y motor.', estado_aviso: 'Asignado', fecha_creacion: today, fecha_resolucion: today, id_tecnico_asignado: user.id, Usuarios: user };
const fixtures = {
 Usuarios: [user], Clientes_Mant: [client], Instalaciones: [site], Puertas: [door],
 Mantenimientos: [maintenance], Avisos: [aviso, {...aviso, id_aviso: 1002, estado_aviso: 'Cerrado'}],
 Grupos_Mantenimiento: [{id:'group-1',nombre:'Zona norte de instalaciones industriales',descripcion:'Grupo de prueba',orden:1}],
 Contratos: [{id:'contract-1',id_cliente:client.id,frecuencias:['mensual','anual'],modo_generacion:'año_natural',fecha_inicio:today,fecha_renovacion:'2027-09-01',activo:true}],
 Incidencias: [{id:'incident-1', id_mantenimiento:maintenance.id,id_puerta:door.id,estado:'Detectada',descripcion:'Revisar dispositivo de seguridad y mecanismo de cierre.',created_at:today,Mantenimientos:maintenance,Puertas:{...door,Instalaciones:site},Usuarios:user,Checklist_Respuestas:{observacion:'Prueba de interfaz',url_foto:null}}],
 Checklist_Plantillas: [{id:'check-1',tipo_puerta:'todos',frecuencia:'mensual',orden:1,descripcion:'Comprobar funcionamiento del sistema de seguridad',foto_obligatoria:false}],
 Fotos_Avisos: [], Historial_Estados: [], Checklist_Respuestas: [],
};
const scenes = [
 {name:'login',url:'/',role:null},
 {name:'registro',url:'/',role:null,action:async p=>p.getByRole('button',{name:'Regístrate aquí'}).click()},
 {name:'espera',url:'/espera',role:'Usuario'},
 {name:'modulos',url:'/select-module'},
 {name:'menu-avisos',url:'/admin',action:async p=>{const b=p.locator('.hamburger-btn');if(await b.isVisible())await b.click();}},
 {name:'menu-mantenimientos',url:'/admin/mantenimientos',action:async p=>{const b=p.locator('.hamburger-btn');if(await b.isVisible())await b.click();}},
 {name:'avisos-dashboard',url:'/admin'},
 {name:'avisos-listado',url:'/admin/avisos'},
 {name:'avisos-clientes',url:'/admin/clientes'},
 {name:'avisos-crear',url:'/admin/create-aviso'},
 {name:'avisos-detalle',url:'/admin/aviso/1001'},
 {name:'avisos-editar',url:'/admin/aviso/1001',action:async p=>p.getByRole('button',{name:'Editar',exact:true}).click()},
 {name:'usuarios',url:'/admin/usuarios'},
 {name:'productividad',url:'/admin/productividad'},
 {name:'mant-dashboard',url:'/admin/mantenimientos'},
 {name:'mant-clientes',url:'/admin/mantenimientos/clientes'},
 {name:'mant-cliente-formulario',url:'/admin/mantenimientos/clientes',action:async p=>p.getByRole('button',{name:/Añadir|Nueva|Nuevo/}).first().click()},
 {name:'mant-cliente-detalle',url:'/admin/mantenimientos/cliente/client-1'},
 {name:'mant-instalacion-formulario',url:'/admin/mantenimientos/cliente/client-1',action:async p=>p.getByRole('button',{name:/Añadir|Nueva|Nuevo/}).first().click()},
 {name:'mant-puertas',url:'/admin/mantenimientos/instalacion/site-1'},
 {name:'mant-puerta-formulario',url:'/admin/mantenimientos/instalacion/site-1',action:async p=>p.getByRole('button',{name:/Añadir Puerta/}).click()},
 {name:'mant-puerta-editar',url:'/admin/mantenimientos/instalacion/site-1',action:async p=>p.getByRole('button',{name:/Ajustar/}).click()},
 {name:'mant-accesorio-formulario',url:'/admin/mantenimientos/instalacion/site-1',action:async p=>{await p.getByRole('button',{name:/Añadir Puerta/}).click();await p.getByRole('button',{name:/Añadir Accesorio/}).click();}},
 {name:'mant-contratos',url:'/admin/mantenimientos/contratos/client-1'},
 {name:'mant-contrato-formulario',url:'/admin/mantenimientos/contratos/client-1',action:async p=>p.getByRole('button',{name:/Añadir|Nuevo/}).first().click()},
 {name:'mant-listado',url:'/admin/mantenimientos/listado'},
 {name:'mant-grupo-formulario',url:'/admin/mantenimientos/listado',action:async p=>p.getByRole('button',{name:/Grupo/}).first().click()},
 {name:'mant-asignacion',url:'/admin/mantenimientos/listado',action:async p=>p.locator('input[type=checkbox]').first().check()},
 {name:'mant-detalle-modal',url:'/admin/mantenimientos/listado',action:async p=>p.locator('[draggable] strong').first().click()},
 {name:'mant-incidencias',url:'/admin/mantenimientos/incidencias',action:async p=>p.getByText(site.direccion,{exact:true}).first().click()},
 {name:'tecnico-avisos',url:'/tecnico',role:'Tecnico'},
 {name:'tecnico-aviso-detalle',url:'/tecnico/aviso/1001',role:'Tecnico'},
 {name:'tecnico-mantenimientos',url:'/tecnico/mantenimientos',role:'Tecnico'},
 ...[1,2,3,4,5].map(step=>({name:'tecnico-visita-paso-'+step,url:'/tecnico/mantenimiento/mant-1',role:'Tecnico',step})),
];
scenes.push({name:'tecnico-firma-rotacion',url:'/tecnico/mantenimiento/mant-1',role:'Tecnico',step:4,action:async p=>{
 const canvas=p.locator('.sigCanvas');
 await canvas.scrollIntoViewIfNeeded();
 const box=await canvas.boundingBox();
 await p.mouse.move(box.x+10,box.y+50);await p.mouse.down();
 await p.mouse.move(box.x+box.width*0.7,box.y+90,{steps:15});await p.mouse.up();
 const pixels=()=>canvas.evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n;});
 assert(await pixels()>20,'Signature should contain a stroke');
 const original=p.viewportSize();
 await p.setViewportSize({width:original.width<=768?844:375,height:original.height});
 await p.waitForTimeout(100);
 assert(await pixels()>20,'Signature was lost on resize');
 await p.setViewportSize(original);await p.waitForTimeout(100);
 assert(await pixels()>20,'Signature was lost after restoring viewport');
 await p.getByRole('button',{name:/Borrar Firma/}).click();
 assert.equal(await pixels(),0,'Clear signature must erase the drawing');
 await canvas.scrollIntoViewIfNeeded();
 const touchBox=await canvas.boundingBox();
 const cdp=await p.context().newCDPSession(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+15,y:touchBox.y+60}]});
 for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBox.x+15+i*(touchBox.width-30)/10,y:touchBox.y+60+i*3}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.detach();
 assert(await pixels()>20,'Touch input should draw a signature');
}});
scenes.push(
 {name:'extra-historial-cliente',url:'/admin/clientes',action:async p=>{await p.locator('tbody tr td').first().click();await p.waitForLoadState('networkidle');}},
 {name:'extra-dashboard-lista',url:'/admin/mantenimientos',action:async p=>p.getByText('Visitas Pendientes (Mes)',{exact:true}).click()},
 {name:'extra-sin-firma',url:'/tecnico/mantenimiento/mant-1',role:'Tecnico',step:4,action:async p=>p.locator('input[type=checkbox]').check()},
 {name:'extra-checklist-incidencia',url:'/tecnico/mantenimiento/mant-1',role:'Tecnico',step:2,action:async p=>p.getByRole('button',{name:'Mal estado',exact:true}).click()},
);
const sizes = process.env.RESPONSIVE_SIZES ? JSON.parse(process.env.RESPONSIVE_SIZES) : [[320,740],[375,812],[390,844],[768,1024],[1024,768],[1440,900],[844,390],[390,400]];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const results=[];
 const failures=[];
 const networkWrites=[];
 const selected=scenes.filter(s=>!process.env.RESPONSIVE_SCENE || new RegExp(process.env.RESPONSIVE_SCENE).test(s.name));
 try {
 for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<=390?2:1,hasTouch:width<=844,serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const request=route.request();const url=new URL(request.url());
   if(url.origin===baseURL)return route.continue();
   if(url.pathname.includes('/rest/v1/')){
    if(request.method()!=='GET'){networkWrites.push(request.method()+' '+url.pathname);return route.fulfill({status:403,contentType:'application/json',body:'{"message":"Read-only UI test"}'});}
    const table=url.pathname.split('/').pop();
    const rows=fixtures[table]||[];
    const single=(request.headers().accept||'').includes('vnd.pgrst.object');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?rows[0]||null:rows)});
   }
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  for(const scene of selected){
   const page=await context.newPage();
   page.setDefaultTimeout(8000);
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
   await page.addInitScript(({role,user,step})=>{
    localStorage.clear();
    if(role)localStorage.setItem('luvematic_user',JSON.stringify({...user,rol:role}));
    if(step)localStorage.setItem('mant_draft_mant-1',JSON.stringify({step,horaInicio:'2026-09-09T09:00:00Z',horaFin:step===5?'2026-09-09T10:00:00Z':null}));
   },{role:scene.role===undefined?'Direccion':scene.role,user,step:scene.step});
   try{
    await page.goto(baseURL+scene.url);
    await page.waitForLoadState('networkidle');
    if(scene.action)await scene.action(page);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const check=await page.evaluate(()=>{
     const width=innerWidth;
     const overflow=[...document.querySelectorAll('body *')].filter(e=>{
      if(e.closest('.table-responsive') && !e.classList.contains('table-responsive'))return false;
      const r=e.getBoundingClientRect();
      return r.width>0&&r.height>0&&(r.right>width+1||r.left < -1);
     }).map(e=>({tag:e.tagName,class:e.getAttribute('class'),text:e.textContent?.slice(0,60)})).slice(0,8);
     const clipped=[...document.querySelectorAll('.modal-panel,.card,.incidencia-col')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1).map(e=>({class:e.className,width:e.clientWidth,scroll:e.scrollWidth}));
     const columns=[...document.querySelectorAll('.responsive-grid')].map(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
     const modalBounds=[...document.querySelectorAll('.modal-panel')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};});
     return {documentWidth:document.documentElement.scrollWidth,width,overflow,clipped,columns,modalBounds,content:document.querySelector('#root')?.textContent?.length||0};
    });
    assert(check.content>20,'Screen did not render');
    assert.equal(errors.length,0,'Browser errors: '+errors.join('; '));
    assert(check.documentWidth<=width+1,'Page overflows: '+JSON.stringify(check));
    assert.equal(check.overflow.length,0,'Elements outside viewport: '+JSON.stringify(check.overflow));
    assert.equal(check.clipped.length,0,'Clipped card: '+JSON.stringify(check.clipped));
    if(width<=768)assert(check.columns.every(n=>n===1),'Form grid must use one column');
    assert(check.modalBounds.every(r=>r.top>=0&&r.bottom<=r.height+1),'Modal outside visible height');
    if(width===390&&height===844 || width===1440)await page.screenshot({path:path.join(output,scene.name+'-'+width+'.png'),fullPage:true});
    const modal=page.locator('.modal-panel').last();
    if(await modal.count()){
     const lastButton=modal.locator('button').last();
     if(await lastButton.count()){
      await lastButton.scrollIntoViewIfNeeded();
      const rect=await lastButton.boundingBox();
      assert(rect.y>=0&&rect.y+rect.height<=height+1,'Last modal action is not reachable');
     }
    }
    const menu=page.locator('.nav-links.open');
    if(await menu.count()){
     const logout=menu.locator('button').last();await logout.scrollIntoViewIfNeeded();
     const rect=await logout.boundingBox();
     assert(rect.y>=0&&rect.y+rect.height<=height+1,'Menu footer is not reachable');
    }
    results.push({scene:scene.name,width,height,status:'passed'});
   }catch(e){
    failures.push({scene:scene.name,width,height,error:e.message});
    console.log('FAIL '+scene.name+' '+width+'x'+height+': '+e.message);
    await page.screenshot({path:path.join(output,'FAIL-'+scene.name+'-'+width+'x'+height+'.png'),fullPage:true}).catch(()=>{});
   }finally{await page.close();}
  }
  await context.close();
  console.log(width+'x'+height+': completed; total failures '+failures.length);
 }
 assert.equal(networkWrites.length,0,'Unexpected data mutation attempted');
 }finally{
  await browser.close();
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,failures,networkWrites},null,2));
 }
 console.log(JSON.stringify({passed:results.length,failed:failures.length,failures},null,2));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
