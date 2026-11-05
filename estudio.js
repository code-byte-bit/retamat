const crypto=require('node:crypto'),{engine}=require('./espacio-motor');
const METHODS=new Set(['savePracticeDraft','startSimulation','finishSimulation']);
const problem=(status,message)=>Object.assign(Error(message),{status});
const {validWork}=require('./public/assets/estudio');
function runStudy(model,method,args,time){
 const actor=model.require();
 if(method==='savePracticeDraft'){
  const [id,step,body,version]=args,a=model.data().activities.find(a=>a.id===id);
  if(!a||a.owner!==actor.id)throw problem(403,'El borrador pertenece a tu propia práctica.');
  if(a.mode!=='practice'||a.simulation||a.task||a.room||a.done||step!==a.attempts.length||!Number.isInteger(step))throw problem(409,'Esta pregunta ya no admite un borrador de práctica.');
  if(!Number.isInteger(version)||version!==Number(a.practiceDraftVersion||0))throw problem(409,'El borrador cambió en otra pestaña. Compara las versiones antes de guardar.');
  if(!validWork(body))throw problem(400,'El borrador admite 80 caracteres de respuesta, 8000 de procedimiento y hasta 3000 puntos de dibujo.');
  model.update(d=>{const current=d.activities.find(x=>x.id===id);current.practiceDraftVersion=version+1;current.practiceDraft={step,answer:body.answer,work:body.work,strokes:body.strokes,updated:time};});return {saved:true,version:version+1};
 }
 if(method==='startSimulation'){
  const b=args[0],d=model.data();if(actor.role!=='student')throw problem(403,'Los simulacros corresponden a estudiantes.');
  if(args.length!==1||!b||Object.keys(b).some(k=>!['topics','level','count','minutes'].includes(k))||!Array.isArray(b.topics)||!b.topics.length||b.topics.length>3||new Set(b.topics).size!==b.topics.length||!b.topics.every(id=>d.topics.some(t=>t.id===id&&t.active))||!Number.isInteger(b.level)||b.level<1||b.level>10||!Number.isInteger(b.count)||b.count<3||b.count>10||!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>90)throw problem(400,'Elige temas activos, nivel 1–10, entre 3 y 10 preguntas y de 1 a 90 minutos.');
  const existing=d.activities.find(a=>a.owner===actor.id&&a.simulation&&!a.done&&a.deadline>time);if(existing)return existing.id;
  const math=engine().math,questions=[],seen=new Set();for(let i=0;i<b.count;i++){const topic=b.topics[i%b.topics.length];let q;for(let n=0;n<30;n++){q={...math.generateQuestion(topic,b.level,crypto.randomInt(1,1000000)),topic,level:b.level,type:'number',points:1};if(!seen.has(q.prompt))break;}seen.add(q.prompt);questions.push(q);}
  const a={id:crypto.randomUUID(),owner:actor.id,mode:'practice',simulation:true,simulationMinutes:b.minutes,lesson:null,task:null,room:null,topic:questions[0].topic,level:b.level,total:b.count,questions,attempts:[],done:false,deadline:time+b.minutes*60000,created:time,seed:0};model.update(data=>data.activities.unshift(a));return a.id;
 }
 if(method==='finishSimulation'){
  const a=model.data().activities.find(x=>x.id===args[0]);if(!a||a.owner!==actor.id)throw problem(403,'El simulacro no pertenece a tu cuenta.');if(!a.simulation)throw problem(400,'Esta actividad no es un simulacro.');if(!a.done)model.update(d=>{const row=d.activities.find(x=>x.id===a.id);row.done=true;row.submitted=time;});return {finished:true};
 }
 throw problem(400,'Operación de estudio no válida.');
}
module.exports={METHODS,runStudy,validWork};
