const {randomUUID}=require('node:crypto');
const {LESSONS,generatePractice}=require('./lecciones');
const {transaction,numeric,evaluate}=require('./aula');
const ACTIVITY_TABLES=[['asignaciones',`CREATE TABLE IF NOT EXISTS asignaciones (
 id VARCHAR(100) PRIMARY KEY,
 grupo_id VARCHAR(100) NOT NULL,
 leccion_id VARCHAR(60) NOT NULL,
 titulo VARCHAR(100) NOT NULL,
 instrucciones VARCHAR(2000) NOT NULL DEFAULT '',
 tipo VARCHAR(10) NOT NULL,
 duracion_min SMALLINT UNSIGNED NULL,
 vence_ms BIGINT UNSIGNED NULL,
 preguntas LONGTEXT NOT NULL,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_asignaciones_grupo (grupo_id,creada),
 CONSTRAINT fk_asignaciones_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`],['entregas',`CREATE TABLE IF NOT EXISTS entregas (
 id VARCHAR(100) PRIMARY KEY,
 asignacion_id VARCHAR(100) NOT NULL,
 usuario_id VARCHAR(100) NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
 respuestas LONGTEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 0,
 aciertos TINYINT UNSIGNED NULL,
 inicio_ms BIGINT UNSIGNED NOT NULL,
 limite_ms BIGINT UNSIGNED NULL,
 fin_ms BIGINT UNSIGNED NULL,
 UNIQUE KEY uq_entrega_asignacion_usuario (asignacion_id,usuario_id),
 INDEX idx_entregas_usuario (usuario_id),
 CONSTRAINT fk_entregas_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id),
 CONSTRAINT fk_entregas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
function activityInput(b,now){
 b=b||{};
 if(typeof b.title!=='string'||b.title.trim().length<2||b.title.trim().length>100)throw problem(400,'El título debe tener de 2 a 100 caracteres.');
 if(typeof b.instructions!=='string'||b.instructions.trim().length>2000)throw problem(400,'Las instrucciones deben tener como máximo 2000 caracteres.');
 if(!LESSONS.some(l=>l.id===b.lessonId))throw problem(400,'Elige una lección válida.');
 if(!['tarea','examen'].includes(b.kind))throw problem(400,'Elige Tarea o Examen.');
 if(typeof b.groupId!=='string'||b.groupId.length<1||b.groupId.length>100)throw problem(400,'Elige un grupo.');
 let due=null;
 if(b.due!==null&&b.due!==undefined&&b.due!==''){
  if(typeof b.due!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(b.due))throw problem(400,'La fecha de cierre no tiene un formato válido.');
  due=Date.parse(b.due);if(!Number.isFinite(due)||new Date(due).toISOString().slice(0,19)!==b.due.slice(0,19)||due<=now)throw problem(400,'La fecha de cierre debe ser posterior al momento actual.');
 }
 const minutes=b.kind==='examen'?b.minutes:null;
 if(b.kind==='examen'&&(!Number.isInteger(minutes)||minutes<1||minutes>180||due===null))throw problem(400,'El examen necesita una duración de 1 a 180 minutos y una fecha de cierre.');
 return {title:b.title.trim(),instructions:b.instructions.trim(),lessonId:b.lessonId,groupId:b.groupId,kind:b.kind,minutes,due};
}
function meta(a){return {id:a.id,groupId:a.grupo_id,groupName:a.grupo_nombre,title:a.titulo,instructions:a.instrucciones,kind:a.tipo,lessonId:a.leccion_id,lessonTitle:LESSONS.find(l=>l.id===a.leccion_id)?.title||a.leccion_id,minutes:a.duracion_min,due:a.vence_ms===null?null:Number(a.vence_ms)};}
function view(a,e,now){
 const qs=JSON.parse(a.preguntas),answers=JSON.parse(e.respuestas),finished=e.estado==='terminado';
 const reviewAvailable=finished&&(a.tipo==='tarea'||(a.vence_ms!==null&&now>=Number(a.vence_ms)));
 return {id:e.id,state:e.estado,revision:e.revision,answers,score:finished?e.aciertos:null,started:Number(e.inicio_ms),deadline:e.limite_ms===null?null:Number(e.limite_ms),finished:e.fin_ms===null?null:Number(e.fin_ms),reviewAvailable,timedOut:finished&&e.limite_ms!==null&&e.fin_ms!==null&&Number(e.fin_ms)>=Number(e.limite_ms),
 questions:reviewAvailable?evaluate(qs,answers):qs.map(({topic,prompt},i)=>({topic,prompt,...(finished?{response:answers[i]}:{})}))};
}
function expired(e,time){return e.estado==='pendiente'&&e.limite_ms!==null&&time>=Number(e.limite_ms);}
async function persist(db,a,e,answers,finish,time){
 const score=finish?evaluate(JSON.parse(a.preguntas),answers).filter(q=>q.correct).length:null;
 const next={...e,respuestas:JSON.stringify(answers),estado:finish?'terminado':'pendiente',aciertos:score,revision:e.revision+1,fin_ms:finish?time:null};
 await db.execute('UPDATE entregas SET respuestas = ?, estado = ?, aciertos = ?, fin_ms = ?, revision = revision + 1 WHERE id = ? AND usuario_id = ?',[next.respuestas,next.estado,score,next.fin_ms,e.id,e.usuario_id]);return next;
}
function mountActivities(app,pool,currentUser,{now=Date.now}={}){
 const teacher=(req,res,next)=>req.user.role==='teacher'?next():res.status(403).json({mensaje:'Esta acción es para docentes.'});
 const student=(req,res,next)=>req.user.role==='student'?next():res.status(403).json({mensaje:'Esta acción es para estudiantes.'});
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){if(error.status)return res.status(error.status).json({mensaje:error.message});console.error('Error de actividades:',error.code||error.name);res.status(503).json({mensaje:'No se pudo consultar o guardar la actividad. Conserva la página abierta y vuelve a intentar.'});}};
 async function authorized(db,id,user,lock=false){
  const suffix=lock?' FOR UPDATE':'';
  let sql;
  if(user.role==='teacher')sql='SELECT a.*,g.nombre AS grupo_nombre FROM asignaciones a INNER JOIN grupos g ON g.id=a.grupo_id WHERE a.id = ? AND g.docente_id = ?';
  else if(user.role==='student')sql='SELECT a.*,g.nombre AS grupo_nombre FROM asignaciones a INNER JOIN grupos g ON g.id=a.grupo_id INNER JOIN integrantes_grupo i ON i.grupo_id=g.id WHERE a.id = ? AND i.usuario_id = ?';
  else throw problem(403,'Esta sección es para estudiantes y docentes.');
  const [rows]=await db.execute(sql+suffix,[id,user.id]);if(!rows[0])throw problem(404,'No se encontró esa actividad entre las de tus grupos.');return rows[0];
 }
 async function getOwn(db,a,user,time){
  const [rows]=await db.execute('SELECT * FROM entregas WHERE asignacion_id = ? AND usuario_id = ? FOR UPDATE',[a.id,user.id]);let e=rows[0];
  if(e&&expired(e,time))e=await persist(db,a,e,JSON.parse(e.respuestas),true,time);return e;
 }
 app.get('/api/actividades',currentUser,wrap(async(req,res)=>{
  let rows,groups=[];
  if(req.user.role==='teacher'){
   [rows]=await pool.execute('SELECT a.id,a.grupo_id,a.leccion_id,a.titulo,a.instrucciones,a.tipo,a.duracion_min,a.vence_ms,g.nombre AS grupo_nombre,(SELECT COUNT(*) FROM entregas e WHERE e.asignacion_id=a.id) AS iniciadas FROM asignaciones a INNER JOIN grupos g ON g.id=a.grupo_id WHERE g.docente_id = ? ORDER BY a.creada DESC,a.id DESC',[req.user.id]);
   [groups]=await pool.execute('SELECT id,nombre FROM grupos WHERE docente_id = ? ORDER BY nombre,id',[req.user.id]);
  }else if(req.user.role==='student'){
   [rows]=await pool.execute('SELECT a.id,a.grupo_id,a.leccion_id,a.titulo,a.instrucciones,a.tipo,a.duracion_min,a.vence_ms,g.nombre AS grupo_nombre,e.estado,e.aciertos,e.limite_ms FROM asignaciones a INNER JOIN grupos g ON g.id=a.grupo_id INNER JOIN integrantes_grupo i ON i.grupo_id=g.id LEFT JOIN entregas e ON e.asignacion_id=a.id AND e.usuario_id=i.usuario_id WHERE i.usuario_id = ? ORDER BY a.creada DESC,a.id DESC',[req.user.id]);
  }else throw problem(403,'Esta sección es para estudiantes y docentes.');
  res.json({activities:rows.map(a=>({...meta(a),state:a.estado??'sin_iniciar',score:a.estado==='terminado'?a.aciertos:null,deadline:a.limite_ms==null?null:Number(a.limite_ms),startedCount:Number(a.iniciadas||0)})),groups,lessons:req.user.role==='teacher'?LESSONS.map(({id,title,topic})=>({id,title,topic})):[],serverNow:now()});
 }));
 app.post('/api/actividades',currentUser,teacher,wrap(async(req,res)=>{
  const b=activityInput(req.body,now());
  const [groups]=await pool.execute('SELECT id,nombre FROM grupos WHERE id = ? AND docente_id = ?',[b.groupId,req.user.id]);if(!groups[0])throw problem(404,'Elige uno de tus grupos.');
  const a={id:randomUUID(),grupo_id:b.groupId,grupo_nombre:groups[0].nombre,leccion_id:b.lessonId,titulo:b.title,instrucciones:b.instructions,tipo:b.kind,duracion_min:b.minutes,vence_ms:b.due};
  await pool.execute('INSERT INTO asignaciones (id,grupo_id,leccion_id,titulo,instrucciones,tipo,duracion_min,vence_ms,preguntas) VALUES (?,?,?,?,?,?,?,?,?)',[a.id,a.grupo_id,a.leccion_id,a.titulo,a.instrucciones,a.tipo,a.duracion_min,a.vence_ms,JSON.stringify(generatePractice(a.leccion_id))]);
  res.status(201).json({activity:meta(a)});
 }));
 app.get('/api/actividades/:id',currentUser,wrap(async(req,res)=>{
  const data=await transaction(pool,async db=>{
   const a=await authorized(db,req.params.id,req.user,true),time=now();
   if(req.user.role==='student'){
    const e=await getOwn(db,a,req.user,time);return {activity:meta(a),attempt:e?view(a,e,time):null,serverNow:time};
   }
   const [attempts]=await db.execute('SELECT * FROM entregas WHERE asignacion_id = ? FOR UPDATE',[a.id]);
   for(const e of attempts)if(expired(e,time))await persist(db,a,e,JSON.parse(e.respuestas),true,time);
   const [roster]=await db.execute('SELECT u.id,u.nombre,u.correo,e.id AS entrega_id,e.estado,e.aciertos,e.inicio_ms,e.limite_ms,e.fin_ms FROM integrantes_grupo i INNER JOIN usuarios u ON u.id=i.usuario_id LEFT JOIN entregas e ON e.usuario_id=u.id AND e.asignacion_id = ? WHERE i.grupo_id = ? ORDER BY u.nombre,u.id',[a.id,a.grupo_id]);
   return {activity:meta(a),members:roster.map(u=>({...u,estado:u.estado||'sin_iniciar'})),serverNow:time};
  });res.json(data);
 }));
 app.post('/api/actividades/:id/iniciar',currentUser,student,wrap(async(req,res)=>{
  const data=await transaction(pool,async db=>{
   const a=await authorized(db,req.params.id,req.user,true),time=now();let e=await getOwn(db,a,req.user,time);
   if(!e){
    if(a.vence_ms!==null&&time>=Number(a.vence_ms))throw problem(409,'La fecha de cierre ya pasó. No se puede iniciar esta actividad.');
    const examEnd=a.tipo==='examen'?time+Number(a.duracion_min)*60000:null;
    const deadline=a.vence_ms===null?examEnd:examEnd===null?Number(a.vence_ms):Math.min(examEnd,Number(a.vence_ms));
    e={id:randomUUID(),asignacion_id:a.id,usuario_id:req.user.id,estado:'pendiente',respuestas:JSON.stringify(Array(6).fill('')),revision:0,aciertos:null,inicio_ms:time,limite_ms:deadline,fin_ms:null};
    await db.execute('INSERT INTO entregas (id,asignacion_id,usuario_id,respuestas,inicio_ms,limite_ms) VALUES (?,?,?,?,?,?)',[e.id,a.id,e.usuario_id,e.respuestas,time,deadline]);
   }
   return {activity:meta(a),attempt:view(a,e,time),serverNow:time};
  });res.json(data);
 }));
 function save(finish){return wrap(async(req,res)=>{
  const b=req.body||{};
  if(!Array.isArray(b.answers)||b.answers.length!==6||b.answers.some(a=>typeof a!=='string'||a.length>80)||!Number.isInteger(b.revision)||b.revision<0)throw problem(400,'Envía las 6 respuestas y una versión válida.');
  const answers=b.answers.map(a=>a.trim());
  if(answers.some(a=>a!==''&&!Number.isFinite(numeric(a))))throw problem(400,'Responde con números o fracciones, sin unidades.');
  const data=await transaction(pool,async db=>{
   const a=await authorized(db,req.params.id,req.user,true),time=now();let e=await getOwn(db,a,req.user,time);
   if(!e)throw problem(409,'Primero inicia esta actividad.');
   if(e.estado==='terminado')return {activity:meta(a),attempt:view(a,e,time),serverNow:time};
   if(e.revision!==b.revision)throw problem(409,'La actividad cambió en otra pestaña. Copia tus respuestas y vuelve a abrirla antes de guardar.');
   if(finish&&a.tipo==='tarea'&&answers.some(a=>a===''))throw problem(400,'Contesta las 6 preguntas de la tarea antes de entregar.');
   e=await persist(db,a,e,answers,finish,time);return {activity:meta(a),attempt:view(a,e,time),serverNow:time};
  });res.json(data);
 });}
 app.post('/api/actividades/:id/guardar',currentUser,student,save(false));
 app.post('/api/actividades/:id/finalizar',currentUser,student,save(true));
}
module.exports={ACTIVITY_TABLES,activityInput,meta,view,expired,mountActivities};
