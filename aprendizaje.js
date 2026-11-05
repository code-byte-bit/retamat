const crypto=require('node:crypto');
const learning=require('./public/assets/aprendizaje');
const {engine}=require('./espacio-motor');
const problem=(status,message)=>Object.assign(Error(message),{status});
const METHODS=new Set(['startDaily','startSmartReview','nextHint']);
function activity(model,questions,time,extra={}){
  const actor=model.require(),a={id:crypto.randomUUID(),owner:actor.id,mode:'practice',lesson:null,task:null,room:null,topic:questions[0].topic,level:questions[0].level,total:questions.length,questions,attempts:[],done:false,deadline:null,created:time,seed:time%1000000,...extra};
  model.update(d=>d.activities.unshift(a));return a.id;
}
function runLearning(model,method,args,time){
  const actor=model.require();
  if(method==='nextHint'){
    const a=model.data().activities.find(x=>x.id===args[0]),step=args[1];
    if(!a||a.owner!==actor.id)throw problem(403,'Las pistas pertenecen a tu propia práctica.');
    if(a.mode!=='practice'||a.simulation||a.task||a.room||a.done)throw problem(409,'Las pistas por pasos solo están disponibles en prácticas personales.');
    if(!Number.isInteger(step)||step!==a.attempts.length)throw problem(409,'La pregunta cambió. Actualiza antes de pedir otra pista.');
    const count=Math.min(3,Number(a.hints?.[step]?.count||0)+1);
    if(count!==a.hints?.[step]?.count)model.update(d=>{const current=d.activities.find(x=>x.id===a.id);current.hints={...(current.hints||{}),[step]:{count,updated:time}};});
    return {count,text:learning.hints(a.questions[step].topic,a.questions[step].level)[count-1]};
  }
  if(method==='startDaily'){
    if(actor.role!=='student')throw problem(403,'El reto diario corresponde a la cuenta de estudiante.');
    if(args.length)throw problem(400,'El servidor elige la fecha y el nivel del reto.');
    const key=learning.dayKey(time),existing=model.data().activities.find(a=>a.owner===actor.id&&a.dailyKey===key);if(existing)return existing.id;
    const recommendation=model.recommendations().find(r=>model.data().topics.some(t=>t.id===r.topic&&t.active));
    if(!recommendation)throw problem(400,'No hay un tema activo para el reto diario.');
    const questions=model.buildQuestions({source:'generated',topics:[recommendation.topic],level:recommendation.level,count:3,format:'mixed'});
    return activity(model,questions,time,{dailyKey:key,dailyZone:'America/Mexico_City'});
  }
  if(method==='startSmartReview'){
    const topic=args[0]||'all',aid=args[1]||'';
    if(typeof topic!=='string'||typeof aid!=='string'||args.length>2)throw problem(400,'Selecciona un tema válido.');
    const candidates=model.reviewCandidates(topic,aid);
    if(!candidates.length)throw problem(400,'Todavía no tienes errores con resultados publicados para preparar este repaso.');
    const sources=candidates.slice(0,3),math=engine().math,used=new Set(candidates.map(q=>q.prompt)),questions=[];
    for(let i=0;i<Math.max(3,sources.length);i++){
      const source=sources[i%sources.length];let q;
      for(let n=0;n<100;n++){q={...math.generateQuestion(source.topic,source.level,(time%1000000)+crypto.randomInt(1,1000000)+n),topic:source.topic,level:source.level,points:1};if(!used.has(q.prompt))break;}
      if(used.has(q.prompt))throw problem(409,'No se pudo preparar una variante distinta. Inténtalo otra vez.');
      used.add(q.prompt);questions.push(q);
    }
    return activity(model,questions,time,{review:true,reviewOriginals:sources.length,smartReview:true});
  }
  throw problem(400,'Mejora de aprendizaje no válida.');
}
module.exports={METHODS,runLearning};
