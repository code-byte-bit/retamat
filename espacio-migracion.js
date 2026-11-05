const crypto=require('node:crypto');
const {LESSONS}=require('./lecciones');
const {numeric}=require('./aula');
const TOPIC={'Álgebra':'algebra','Fracciones':'fracciones','Geometría':'geometria',algebra:'algebra',fracciones:'fracciones',geometria:'geometria'};
const NO_DUE=Date.parse('2099-12-31T23:59:59.000Z');
const stamp=(x,now)=>{const n=x instanceof Date?x.getTime():Date.parse(x);return Number.isFinite(n)?n:now;};
function question(q,topic='algebra',level=3){
 return {...q,topic:TOPIC[q.topic]||topic,level:Number(q.level)||level,type:q.type||'number',tolerance:q.tolerance??Math.min(1,1e-6*Math.max(1,Math.abs(q.answer))),instruction:q.instruction||'Escribe un número o una fracción, sin unidades.',hint:q.hint||'Identifica los datos y aplica el procedimiento de la lección.',explanation:q.explanation||'Revisa el procedimiento.',solution_steps:q.solution_steps||[q.explanation||'Identifica los datos de la pregunta.','Comprueba tu respuesta con el procedimiento.'],points:q.points??1};
}
function lessonMap(d,legacyId){
 const old=LESSONS.find(l=>l.id===legacyId);if(!old)return null;
 const topic=TOPIC[old.topic],levels={Bases:1,Desarrollo:3,Aplicación:6};
 return d.lessons.find(l=>l.topic===topic&&l.level===levels[old.stage])?.id||d.lessons.find(l=>l.topic===topic)?.id||null;
}
function delivery(row,qs,mode,extra,now){
 const answers=JSON.parse(row.respuestas),finished=row.estado==='terminado';
 const order=qs.map((_,i)=>i).filter(i=>answers[i]?.trim()).concat(qs.map((_,i)=>i).filter(i=>!answers[i]?.trim()));
 const questions=order.map(i=>qs[i]),attempts=order.filter(i=>answers[i]?.trim()).map((i,step)=>({step,answer:answers[i],correct:Number.isFinite(numeric(answers[i]))&&Math.abs(numeric(answers[i])-qs[i].answer)<=qs[i].tolerance,created:Number(row.fin_ms)||stamp(row.actualizada||row.creada,now)}));
 return {id:row.id,owner:row.usuario_id,mode,lesson:null,task:null,room:null,topic:questions[0]?.topic||'algebra',level:questions[0]?.level||3,total:qs.length,questions,attempts,done:finished,deadline:row.limite_ms==null?null:Number(row.limite_ms),created:Number(row.inicio_ms)||stamp(row.creada,now),seed:crypto.randomInt(1000000),legacy:true,legacyOrder:order,...extra};
}
async function importLegacy(db,d,now){
 const [groups]=await db.execute('SELECT * FROM grupos');const [members]=await db.execute('SELECT * FROM integrantes_grupo');
 const [tasks]=await db.execute('SELECT * FROM asignaciones');const [deliveries]=await db.execute('SELECT * FROM entregas');
 const [diagnostics]=await db.execute('SELECT * FROM diagnosticos');const [practices]=await db.execute('SELECT * FROM practicas');
 d.groups=groups.map(g=>({id:g.id,owner:g.docente_id,name:g.nombre,description:g.descripcion||'',enrollmentOpen:Boolean(g.inscripciones_abiertas),code:g.codigo.trim(),members:members.filter(m=>m.grupo_id===g.id).map(m=>m.usuario_id),created:stamp(g.creada,now)}));
 d.tasks=tasks.map(t=>({id:t.id,group:t.grupo_id,title:t.titulo,instructions:t.instrucciones||'',exam:t.tipo==='examen',due:t.vence_ms===null?NO_DUE:Number(t.vence_ms),legacyNoDue:t.vence_ms===null,opens:stamp(t.creada,now)-1,duration:Number(t.duracion_min)||0,reveal:true,active:true,created:stamp(t.creada,now),questions:JSON.parse(t.preguntas).map(q=>question(q,TOPIC[LESSONS.find(l=>l.id===t.leccion_id)?.topic]||'algebra'))}));
 for(const row of diagnostics)d.activities.push(delivery(row,JSON.parse(row.preguntas).map(q=>question(q)),'diagnostic',{},now));
 for(const row of practices){const lid=lessonMap(d,row.leccion_id),l=d.lessons.find(l=>l.id===lid);d.activities.push(delivery(row,JSON.parse(row.preguntas).map(q=>question(q,l?.topic,l?.level)),'practice',{lesson:lid},now));}
 for(const row of deliveries){const task=d.tasks.find(t=>t.id===row.asignacion_id);if(!task)throw Error('Hay una entrega sin actividad asignada.');const a=delivery(row,task.questions,'assignment',{task:task.id,deadline:row.limite_ms==null?(task.legacyNoDue?null:task.due):Number(row.limite_ms)},now);d.activities.push(a);}
 d.activities.sort((a,b)=>b.created-a.created);return d;
}
const responseArray=a=>a.questions.map((_,i)=>a.examReview&&!a.done?a.drafts?.[i]||'':a.attempts.find(x=>x.step===i)?.answer||'');
async function mirror(db,before,after){
 const changed=(key)=>after[key].filter(row=>JSON.stringify(before[key].find(x=>x.id===row.id))!==JSON.stringify(row));
 for(const g of changed('groups')){
  await db.execute('INSERT INTO grupos (id,docente_id,nombre,descripcion,codigo,inscripciones_abiertas) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),descripcion=VALUES(descripcion),codigo=VALUES(codigo),inscripciones_abiertas=VALUES(inscripciones_abiertas)',[g.id,g.owner,g.name,g.description||'',g.code,g.enrollmentOpen!==false]);
  const old=before.groups.find(x=>x.id===g.id)?.members||[];
  for(const uid of g.members.filter(uid=>!old.includes(uid)))await db.execute('INSERT INTO integrantes_grupo (grupo_id,usuario_id) VALUES (?,?)',[g.id,uid]);
 }
 for(const t of changed('tasks'))await db.execute('INSERT INTO asignaciones (id,grupo_id,leccion_id,titulo,instrucciones,tipo,duracion_min,vence_ms,preguntas) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),instrucciones=VALUES(instrucciones),vence_ms=VALUES(vence_ms),preguntas=VALUES(preguntas)',[t.id,t.group,t.questions[0]?.topic||'mixto',t.title,t.instructions,t.exam?'examen':'tarea',t.exam?t.duration:null,t.legacyNoDue?null:t.due,JSON.stringify(t.questions)]);
 for(const a of changed('activities')){
  const normalizedAnswers=responseArray(a);if(a.mode==='assignment'&&(a.examOrder||a.legacyOrder)){const reordered=Array(a.total).fill('');(a.examOrder||a.legacyOrder).forEach((oldIndex,i)=>{reordered[oldIndex]=normalizedAnswers[i];});normalizedAnswers.splice(0,normalizedAnswers.length,...reordered);}
  const answers=JSON.stringify(normalizedAnswers),qs=JSON.stringify(a.questions),score=a.done?a.attempts.filter(x=>x.correct).length:null,state=a.done?'terminado':'pendiente';
  if(a.mode==='assignment')await db.execute('INSERT INTO entregas (id,asignacion_id,usuario_id,estado,respuestas,revision,aciertos,inicio_ms,limite_ms,fin_ms) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),respuestas=VALUES(respuestas),revision=VALUES(revision),aciertos=VALUES(aciertos),limite_ms=VALUES(limite_ms),fin_ms=VALUES(fin_ms)',[a.id,a.task,a.owner,state,answers,(a.examReview?Number(a.draftVersion||0):a.attempts.length)+(a.done?1:0),score,a.created,a.deadline,a.done?Date.now():null]);
  else if(a.mode==='diagnostic')await db.execute('INSERT INTO diagnosticos (id,usuario_id,estado,preguntas,respuestas,revision,aciertos) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),preguntas=VALUES(preguntas),respuestas=VALUES(respuestas),revision=VALUES(revision),aciertos=VALUES(aciertos)',[a.id,a.owner,state,qs,answers,(a.examReview?Number(a.draftVersion||0):a.attempts.length)+(a.done?1:0),score]);
  else await db.execute('INSERT INTO practicas (id,usuario_id,leccion_id,estado,preguntas,respuestas,revision,aciertos) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado),preguntas=VALUES(preguntas),respuestas=VALUES(respuestas),revision=VALUES(revision),aciertos=VALUES(aciertos)',[a.id,a.owner,a.lesson||'libre-'+a.topic,state,qs,answers,(a.examReview?Number(a.draftVersion||0):a.attempts.length)+(a.done?1:0),score]);
 }
}
module.exports={importLegacy,mirror,question,NO_DUE};
