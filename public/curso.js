'use strict';
const $=id=>document.getElementById(id);
let course=null,selected=null,attempt=null,dirty=false,busy=false;
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function message(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input,select'))e.disabled=value;}
function show(id){for(const key of ['catalog','reader','exercise','result'])$(key).hidden=key!==id;}
function mayLeave(){return !dirty||window.confirm('Hay respuestas sin guardar. ¿Quieres salir y descartar esos cambios?');}
async function api(url,body){
 const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(r.status===401){window.location.assign('/login');throw Error('Tu sesión terminó. Inicia sesión nuevamente.');}
 const data=await r.json();if(!r.ok)throw Error(data.mensaje||'No se pudo completar la solicitud.');return data;
}
function lessonLabel(id){return course?.lessons.find(l=>l.id===id)?.title||'Práctica';}
function lessonInfo(l){return l.completed?'Completada · Mejor resultado: '+l.best+'/6':l.best===null?'Aún no hay prácticas terminadas.':'Mejor resultado: '+l.best+'/6 · Sigue practicando.';}
function filter(){
 if(!course)return;const query=fold($('search').value.trim()),topic=$('topic').value;
 const lessons=course.lessons.filter(l=>(topic==='all'||l.topic===topic)&&fold(l.title+' '+l.description+' '+l.topic).includes(query));
 $('filter-count').textContent=lessons.length+' lecciones encontradas';$('lessons').replaceChildren();
 for(const l of lessons){
  const card=node('article',undefined,'card');card.append(node('span',l.topic+' · '+l.stage+' · '+l.minutes+' min','tag'),node('h3',l.title),node('p',l.description),node('span',lessonInfo(l),l.completed?'badge':'muted'));
  if(l.pendingId)card.append(node('span','Tienes una práctica pendiente.','muted'));
  const button=node('button',l.pendingId?'Estudiar o continuar':'Abrir lección');button.type='button';button.addEventListener('click',()=>read(l.id));card.append(button);$('lessons').append(card);
 }
}
async function catalog(){
 const data=await api('/api/lecciones');course=data;
 $('completion').max=data.lessons.length;$('completion').value=data.completed;$('completion-text').textContent=data.completed+' de '+data.lessons.length+' lecciones completadas';
 $('suggestion').hidden=!data.recommended;
 if(data.recommended){$('suggestion-title').textContent='Siguiente paso: '+lessonLabel(data.recommended.id);$('suggestion-reason').textContent=data.recommended.reason;}
 $('history').replaceChildren();
 if(!data.history.length)$('history').append(node('li','Tus prácticas aparecerán aquí cuando comiences.'));
 for(const item of data.history){const li=node('li'),box=node('div'),date=new Date(item.creada);box.append(node('p',lessonLabel(item.leccion_id)),node('p',item.estado==='terminado'?item.aciertos+'/6 respuestas correctas':'Práctica en progreso','muted'),node('span',Number.isNaN(date.getTime())?'':date.toLocaleString('es-MX'),'muted'));const b=node('button',item.estado==='terminado'?'Ver resultado':'Continuar','secondary');b.type='button';b.addEventListener('click',()=>openAttempt(item.id));li.append(box,b);$('history').append(li);}
 filter();dirty=false;attempt=null;show('catalog');
}
function read(id){
 if(busy||!mayLeave())return;selected=course.lessons.find(l=>l.id===id);if(!selected)return;dirty=false;
 $('reader-title').textContent=selected.title;$('reader-tag').textContent=selected.topic+' · '+selected.stage+' · '+selected.minutes+' minutos aproximados';$('reader-description').textContent=selected.description;$('reader-example').textContent=selected.example;$('reader-steps').replaceChildren(...selected.steps.map(s=>node('li',s)));$('reader-tip').textContent=selected.tip;$('reader-progress').textContent=lessonInfo(selected);$('start').textContent=selected.pendingId?'Continuar práctica pendiente':'Practicar · 6 preguntas';show('reader');message('');$('reader-title').focus();
}
function inputs(){return [...$('questions').querySelectorAll('input')];}
function changed(){dirty=true;const count=inputs().filter(i=>i.value.trim()).length;$('progress').value=count;$('progress-text').textContent=count+' de 6 respuestas';$('saved').textContent='Hay cambios sin guardar. Usa Guardar avance antes de salir.';}
function render(data){
 attempt=data;dirty=false;selected=course.lessons.find(l=>l.id===data.lessonId)||null;
 if(data.state==='terminado'){
  $('result-title').textContent=data.lessonTitle;$('score').textContent=data.score+'/6 · '+Math.round(data.score/6*100)+' %';
  $('feedback').textContent=data.score>=5?'¡Bien hecho! Esta lección ya cuenta como completada. Puedes repetirla para seguir practicando.':selected?.completed?'Esta práctica te ayuda a repasar. La lección sigue completada gracias a tu mejor resultado anterior.':'Revisa las explicaciones y repasa el ejemplo. Con 5 de 6 respuestas correctas completarás esta lección.';
  $('review').replaceChildren();data.questions.forEach((q,i)=>{const item=node('article',undefined,'review'+(q.correct?' ok':''));item.append(node('h3',(i+1)+'. '+(q.correct?'Correcta':'Por reforzar')),node('p',q.prompt),node('p','Tu respuesta: '+q.response),node('p','Respuesta correcta: '+Number(q.answer.toPrecision(8))),node('p',q.explanation));$('review').append(item);});show('result');$('result-title').focus();return;
 }
 $('exercise-title').textContent=data.lessonTitle;$('questions').replaceChildren();data.questions.forEach((q,i)=>{const field=node('fieldset'),label=node('label',q.prompt),input=node('input');input.id='p-'+i;input.type='text';input.maxLength=80;input.autocomplete='off';input.value=data.answers[i]||'';input.addEventListener('input',changed);label.htmlFor=input.id;field.append(node('legend','Pregunta '+(i+1)),label,input);$('questions').append(field);});
 const count=data.answers.filter(a=>a.trim()).length;$('progress').value=count;$('progress-text').textContent=count+' de 6 respuestas';$('saved').textContent='No hay cambios pendientes. Guarda antes de salir si modificas tus respuestas.';show('exercise');$('exercise-title').focus();
}
async function openAttempt(id){if(busy||!mayLeave())return;lock(true);message('Abriendo práctica…');try{render((await api('/api/practicas/'+encodeURIComponent(id))).attempt);message('');}catch(e){message(e.message,true);}finally{lock(false);}}
$('start').addEventListener('click',async()=>{if(busy||!selected)return;lock(true);message('Preparando tus ejercicios…');try{render((await api('/api/lecciones/'+encodeURIComponent(selected.id)+'/practica',{})).attempt);message('');}catch(e){message(e.message,true);}finally{lock(false);}});
async function save(finish){
 if(busy||!attempt)return;const answers=inputs().map(i=>i.value);
 if(finish&&answers.some(a=>!a.trim())){message('Contesta las 6 preguntas antes de entregar.',true);inputs().find(i=>!i.value.trim())?.focus();return;}
 lock(true);message(finish?'Guardando tu resultado…':'Guardando avance…');
 try{const data=await api('/api/practicas/'+encodeURIComponent(attempt.id)+(finish?'/finalizar':'/guardar'),{answers,revision:attempt.revision});render(data.attempt);message(finish?'Resultado guardado en MySQL.':'Avance guardado. Puedes continuar después.');}
 catch(e){message(e.message,true);$('saved').textContent='No se confirmó el guardado. Tus respuestas siguen aquí; vuelve a intentar.';}
 finally{lock(false);}
}
async function back(){if(busy||!mayLeave())return;lock(true);message('Actualizando tu progreso…');try{await catalog();message('');}catch(e){message(e.message,true);}finally{lock(false);}}
for(const id of ['reader-back','practice-back','result-back'])$(id).addEventListener('click',back);
$('save').addEventListener('click',()=>save(false));$('answers').addEventListener('submit',e=>{e.preventDefault();save(true);});
$('read-again').addEventListener('click',async()=>{if(busy||!attempt)return;const id=attempt.lessonId;lock(true);try{await catalog();lock(false);read(id);}catch(e){message(e.message,true);}finally{lock(false);}});
$('suggestion-button').addEventListener('click',()=>{if(course?.recommended)read(course.recommended.id);});$('topic').addEventListener('change',filter);$('search').addEventListener('input',filter);$('print').addEventListener('click',()=>window.print());
for(const a of document.querySelectorAll('[data-leave]'))a.addEventListener('click',e=>{if(busy||!mayLeave())e.preventDefault();else dirty=false;});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
(async()=>{lock(true);try{const {user}=await api('/api/auth/me');if(user.role!=='student'){window.location.replace('/cuenta');return;}$('greeting').textContent='Sigue aprendiendo, '+user.name;await catalog();message('');}catch(e){message(e.message,true);$('retry').hidden=false;}finally{lock(false);}})();
