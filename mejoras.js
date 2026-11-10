const crypto=require('node:crypto');
const {engine}=require('./espacio-motor');
const problem=(status,message)=>Object.assign(Error(message),{status});
const FILE_TABLES=[['archivos',`CREATE TABLE IF NOT EXISTS archivos (id VARCHAR(100) PRIMARY KEY,usuario_id VARCHAR(100) NOT NULL,nombre VARCHAR(160) NOT NULL,mime VARCHAR(80) NOT NULL,tamano INT UNSIGNED NOT NULL,contenido LONGBLOB NOT NULL,creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT fk_archivos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
function upgradeExams(model){
 const data=model.data(),ids=data.activities.filter(a=>!a.done&&!a.examReview&&data.tasks.some(t=>t.id===a.task&&t.exam)).map(a=>a.id);
 if(!ids.length)return;
 model.update(d=>{for(const a of d.activities)if(ids.includes(a.id)){
  const order=a.legacyOrder||a.questions.map((_,i)=>i),questions=Array(a.total),drafts={};
  order.forEach((original,i)=>{questions[original]=a.questions[i];if(a.attempts[i])drafts[original]=a.attempts[i].answer;});
  a.questions=questions;a.drafts=drafts;a.attempts=[];a.examReview=true;a.draftVersion=0;delete a.legacyOrder;
 }});
}
function finishExam(data,a,time){
 if(a.done)return;
 const answered=a.questions.map((_,i)=>i).filter(i=>String(a.drafts?.[i]||'').trim()),blank=a.questions.map((_,i)=>i).filter(i=>!answered.includes(i));
 const order=answered.concat(blank),questions=order.map(i=>({...a.questions[i],originalNumber:i+1}));
 const numeric=engine().math.parseAnswer;
 a.attempts=answered.map((index,step)=>{const answer=String(a.drafts[index]),q=a.questions[index],n=numeric(answer);return {step,answer,correct:Number.isFinite(n)&&Math.abs(n-q.answer)<=q.tolerance,created:time};});
 a.examOrder=order;a.questions=questions;a.done=true;a.submitted=time;delete a.drafts;
}
function saveExam(model,id,answers,time,submit=false){
 const actor=model.require(),a=model.activity(id),t=model.data().tasks.find(t=>t.id===a.task);
 if(!a.examReview||!t?.exam||a.owner!==actor.id||a.done||!t.active||time>=a.deadline)throw problem(409,'El examen ya terminó o no admite cambios.');
 if(!Array.isArray(answers)||answers.length!==a.total||answers.some(x=>typeof x!=='string'||x.length>80))throw problem(400,'Revisa las respuestas del examen.');
 const parse=engine().math.parseAnswer;
 answers.forEach((value,i)=>{if(!value.trim())return;const n=parse(value),q=a.questions[i];if(!Number.isFinite(n)||q.type==='choice'&&(!Number.isInteger(n)||n<0||n>=q.options.length)||q.type==='boolean'&&![0,1].includes(n))throw problem(400,'Revisa la respuesta de la pregunta '+(i+1)+'.');});
 model.update(d=>{const current=d.activities.find(x=>x.id===id);current.draftVersion=Number(current.draftVersion||0)+1;current.drafts=Object.fromEntries(answers.map((x,i)=>[i,x]));if(submit)finishExam(d,current,time);});
 return {saved:true,submitted:submit};
}
function fileData(b){
 if(!b||typeof b.name!=='string'||!b.name.trim()||b.name.length>160||/[\x00-\x1f\\/]/.test(b.name)||typeof b.base64!=='string'||b.base64.length>6990510||!b.base64.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.base64))throw problem(400,'Selecciona un PDF, PNG, JPEG o WebP de hasta 5 MB.');
 const bytes=Buffer.from(b.base64,'base64');if(!bytes.length||bytes.length>5*1024*1024||bytes.toString('base64')!==b.base64)throw problem(400,'El archivo no es válido o supera 5 MB.');
 let mime;if(bytes.subarray(0,5).toString()==='%PDF-')mime='application/pdf';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')mime='image/webp';
 const extension={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[mime];if(!extension)throw problem(400,'Solo se admiten archivos PDF, PNG, JPEG y WebP.');
 const name=b.name.replace(/\.[^.]*$/,'').slice(0,140)+extension;
 return {id:crypto.randomUUID(),name,mime,size:bytes.length,bytes};
}
async function attachFile(db,model,type,id,b,time){
 let target;const data=model.data(),actor=model.require();
 if(type==='task'){target=data.tasks.find(t=>t.id===id);if(!target)throw problem(404,'Actividad no encontrada.');if(!['teacher','admin'].includes(actor.role))throw problem(403,'Solo el docente puede adjuntar instrucciones.');model.group(target.group,true);}
 else if(type==='activity'){target=model.activity(id);const task=data.tasks.find(t=>t.id===target.task);if(target.owner!==actor.id||!task||task.exam||!task.active||!task.legacyNoDue&&time>=task.due)throw problem(403,'Solo puedes adjuntar evidencias a tu tarea dentro del plazo.');}
 else throw problem(400,'Destino no válido.');
 if((target.attachments||[]).length>=5)throw problem(400,'Se permiten hasta cinco archivos por actividad o entrega.');
 const f=fileData(b);await db.execute('INSERT INTO archivos (id,usuario_id,nombre,mime,tamano,contenido) VALUES (?,?,?,?,?,?)',[f.id,actor.id,f.name,f.mime,f.size,f.bytes]);
 const meta={id:f.id,name:f.name,mime:f.mime,size:f.size,created:time};model.update(d=>{const row=(type==='task'?d.tasks:d.activities).find(t=>t.id===id);row.attachments=[...(row.attachments||[]),meta];});return meta;
}
function mountLive(app,currentUser,{heartbeatMs=15000}={}){
 const clients=new Set();
 app.use((req,res,next)=>{if(req.method==='POST')res.once('finish',()=>{if(res.statusCode<400)for(const client of clients)client.res.write('event: changed\ndata: {}\n\n');});next();});
 app.get('/api/espacio/eventos',currentUser,(req,res)=>{
  if([...clients].filter(c=>c.user===req.user.id).length>=5||clients.size>=500)return res.status(429).json({mensaje:'Demasiadas pestañas conectadas.'});
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'});res.flushHeaders();res.write('event: ready\ndata: {}\n\n');const client={res,user:req.user.id};clients.add(client);
  let checking=false;
  const timer=setInterval(async()=>{if(checking)return;checking=true;try{const deny={clearCookie(){},status(){return this;},json(){if(!res.writableEnded){res.write('event: expired\ndata: {}\n\n');res.end();}}};await currentUser(req,deny,()=>{if(!res.destroyed&&!res.writableEnded)res.write(': keepalive\n\n');});}finally{checking=false;}},heartbeatMs);timer.unref();
  req.on('close',()=>{clearInterval(timer);clients.delete(client);});
 });return {clients};
}
function mountExtras(app,pool,currentUser,service,{now=Date.now}={}){
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){const status=e.status||(!(e instanceof Error)&&typeof e.message==='string'?400:503);if(status===503)console.error('Error de archivo/reporte:',e.code||e.name);if(!res.headersSent)res.status(status).json({mensaje:status!==503?e.message:'No se pudo generar el archivo. Inténtalo otra vez.'});else res.end();}};
 app.get('/api/espacio/vista-previa/:id',currentUser,wrap(async(req,res)=>{
  if(!['teacher','admin'].includes(req.user.role))throw problem(403,'La vista previa corresponde al docente.');
  const state=await service.snapshot(req),actor=state.data.users.find(u=>u.id===req.user.id),model=engine(now).model(state.data,actor);model.manager();const t=state.data.tasks.find(t=>t.id===req.params.id);if(!t)throw problem(404,'Actividad no encontrada.');const g=model.group(t.group,true);
  res.json({group:g.name,task:{...t,questions:t.questions.map(q=>({...q,answer:0,explanation:'',solution_steps:['','']}))}});
 }));
 app.get('/api/espacio/archivos/:id',currentUser,wrap(async(req,res)=>{
  const s=await service.snapshot(req);if(![...s.data.tasks,...s.data.activities].some(t=>(t.attachments||[]).some(f=>f.id===req.params.id)))throw problem(403,'No tienes acceso a este archivo.');
  const [rows]=await pool.execute('SELECT id,nombre,mime,tamano,contenido FROM archivos WHERE id = ?',[req.params.id]);const f=rows[0];if(!f)throw problem(404,'El archivo no está disponible.');
  res.set('Content-Type',f.mime);res.set('Content-Disposition',"attachment; filename=\"archivo\"; filename*=UTF-8''"+encodeURIComponent(f.nombre));res.send(Buffer.from(f.contenido.data||f.contenido));
 }));
 app.get('/api/espacio/reporte.pdf',currentUser,wrap(async(req,res)=>{
  const state=await service.snapshot(req),model=engine(now).model(state.data,state.data.users.find(u=>u.id===req.user.id));
  const {report}=require('./reportes');const bytes=await report(model,req.query,now());res.set('Content-Type','application/pdf');res.set('Content-Disposition','attachment; filename="RETAMAT_Reporte.pdf"');res.send(bytes);
 }));
}
module.exports={FILE_TABLES,upgradeExams,finishExam,saveExam,attachFile,fileData,mountLive,mountExtras};
