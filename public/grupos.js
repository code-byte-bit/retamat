'use strict';
const $=id=>document.getElementById(id);
let user=null,current=null,busy=false,dirty=false;
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function message(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input,textarea'))e.disabled=value;}
function mayLeave(){return !dirty||window.confirm('Hay cambios sin guardar. ¿Quieres salir y descartarlos?');}
async function api(url,body){
 const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(r.status===401){window.location.assign('/login');throw Error('Tu sesión terminó. Inicia sesión nuevamente.');}
 const data=await r.json();if(!r.ok)throw Error(data.mensaje||'No se pudo completar la solicitud.');return data;
}
async function list(){
 const {groups}=await api('/api/grupos');$('groups').replaceChildren();$('group-count').textContent=groups.length+' grupos';
 if(!groups.length)$('groups').append(node('p',user.role==='teacher'?'Todavía no has creado grupos.':'Aún no perteneces a un grupo. Pide el código a tu docente.','muted'));
 for(const g of groups){const item=node('article',undefined,'group-item');item.append(node('h3',g.nombre),node('p',g.descripcion||'Sin descripción.'));
  if(user.role==='teacher'){
   item.append(node('p',g.integrantes+' estudiantes · '+(g.inscripciones_abiertas?'Inscripciones abiertas':'Inscripciones pausadas'),'muted'));
   const b=node('button','Ver grupo','secondary');b.type='button';b.addEventListener('click',()=>openReport(g.id));item.append(b);
  }else item.append(node('p','Docente: '+g.docente,'muted'),node('p',g.inscripciones_abiertas?'Inscripciones abiertas':'Inscripciones pausadas. Sigues siendo integrante.','muted'));
  $('groups').append(item);
 }
 current=null;dirty=false;$('listing').hidden=false;$('report').hidden=true;
}
function renderReport(data){
 current=data;const g=data.group;dirty=false;$('assign-group').href='/actividades?grupo='+encodeURIComponent(g.id);$('report-title').textContent=g.nombre;$('report-description').textContent=g.descripcion||'Sin descripción.';$('group-code').value=g.codigo;$('member-count').textContent=data.members.length;$('enrollment-label').textContent=g.inscripciones_abiertas?'Abiertas':'Pausadas';$('toggle').textContent=g.inscripciones_abiertas?'Pausar inscripciones':'Abrir inscripciones';$('edit-name').value=g.nombre;$('edit-description').value=g.descripcion;
 $('members').replaceChildren();$('empty-roster').hidden=data.members.length>0;$('roster').hidden=data.members.length===0;
 for(const u of data.members){const tr=node('tr');for(const value of [u.nombre,u.correo,u.bestDiagnostic===null?'Sin evaluación':u.bestDiagnostic+'/10',u.practices,u.completedLessons+'/'+data.lessonCount,u.activo?'Activa':'Desactivada'])tr.append(node('td',value));$('members').append(tr);}
 $('listing').hidden=true;$('report').hidden=false;$('report-title').focus();
}
async function openReport(id){if(busy||!mayLeave())return;lock(true);message('Consultando el grupo…');try{renderReport(await api('/api/grupos/'+encodeURIComponent(id)));message('');}catch(e){message(e.message,true);}finally{lock(false);}}
$('create').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const body=Object.fromEntries(new FormData($('create')));lock(true);message('Creando grupo…');
 try{const data=await api('/api/grupos',body);$('create').reset();dirty=false;await list();renderReport(await api('/api/grupos/'+encodeURIComponent(data.group.id)));message('Grupo creado. Comparte el código con tus estudiantes.');}catch(error){message(error.message,true);}finally{lock(false);}
});
$('join').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;lock(true);message('Buscando tu grupo…');
 try{const data=await api('/api/grupos/unirse',{code:$('join-code').value});$('join').reset();dirty=false;await list();message(data.mensaje);}catch(error){message(error.message,true);}finally{lock(false);}
});
$('edit').addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!current)return;const id=current.group.id,body=Object.fromEntries(new FormData($('edit')));lock(true);message('Guardando cambios…');
 try{const data=await api('/api/grupos/'+encodeURIComponent(id)+'/editar',body);renderReport(await api('/api/grupos/'+encodeURIComponent(id)));message(data.mensaje);}catch(error){message(error.message,true);}finally{lock(false);}
});
$('toggle').addEventListener('click',async()=>{
 if(busy||!current||!mayLeave())return;const id=current.group.id,open=!current.group.inscripciones_abiertas;lock(true);
 try{const data=await api('/api/grupos/'+encodeURIComponent(id)+'/acceso',{open});renderReport(await api('/api/grupos/'+encodeURIComponent(id)));message(data.mensaje);}catch(error){message(error.message,true);}finally{lock(false);}
});
async function back(){if(busy||!mayLeave())return;lock(true);try{await list();message('');}catch(error){message(error.message,true);}finally{lock(false);}}
$('back').addEventListener('click',back);$('refresh').addEventListener('click',back);
$('copy').addEventListener('click',async()=>{if(!current)return;try{if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(current.group.codigo);message('Código copiado.');}catch{$('group-code').focus();$('group-code').select();message('Código seleccionado. Presiona Ctrl + C para copiarlo.');}});
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
$('export').addEventListener('click',()=>{
 if(!current)return;
 const rows=[['Estudiante','Correo','Evaluaciones terminadas (global)','Mejor evaluación /10 (global)','Prácticas terminadas (global)','Lecciones completadas (global)','Cuenta']];
 for(const u of current.members)rows.push([u.nombre,u.correo,u.diagnostics,u.bestDiagnostic??'',u.practices,u.completedLessons,u.activo?'Activa':'Desactivada']);
 const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=node('a');a.href=url;a.download='RETAMAT_grupo_'+current.group.id+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Se descargó el resumen del grupo en CSV.');
});
for(const form of ['create','join','edit'])$(form).addEventListener('input',()=>{dirty=true;});
for(const a of document.querySelectorAll('[data-leave]'))a.addEventListener('click',e=>{if(busy||!mayLeave())e.preventDefault();else dirty=false;});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
(async()=>{lock(true);try{user=(await api('/api/auth/me')).user;if(!['student','teacher'].includes(user.role)){window.location.replace('/cuenta');return;}$('greeting').textContent=user.role==='teacher'?'Tu espacio docente, '+user.name:'Tus grupos de estudio, '+user.name;$('intro').textContent=user.role==='teacher'?'Crea un grupo, comparte su código y acompaña el avance de tus estudiantes.':'Únete al grupo de tu docente y sigue aprendiendo con tus lecciones y prácticas.';$('role-label').textContent=user.role==='teacher'?'Panel docente':'Mis grupos';$('teacher-create').hidden=user.role!=='teacher';$('student-join').hidden=user.role!=='student';$('aula-link').hidden=user.role!=='student';await list();message('');}catch(e){message(e.message,true);$('retry').hidden=false;}finally{lock(false);}})();
