const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {transaction}=require('./aula');
const {engine}=require('./espacio-motor');
const {importLegacy,mirror}=require('./espacio-migracion');
const {METHODS:STUDY_METHODS,runStudy}=require('./estudio');
const {METHODS:LEARNING_METHODS,runLearning}=require('./aprendizaje');
const {upgradeExams,finishExam,saveExam,attachFile}=require('./mejoras');
const derive=promisify(crypto.pbkdf2),clone=x=>JSON.parse(JSON.stringify(x));
const COLLECTIONS=['topics','lessons','groups','tasks','activities','rooms','exercises','notes','notifications','settings'];
const SPACE_TABLES=[['espacio_control',`CREATE TABLE IF NOT EXISTS espacio_control (id TINYINT PRIMARY KEY,revision BIGINT UNSIGNED NOT NULL DEFAULT 0,importado BOOLEAN NOT NULL DEFAULT FALSE) ENGINE=InnoDB`],['espacio_registros',`CREATE TABLE IF NOT EXISTS espacio_registros (coleccion VARCHAR(32) NOT NULL,id VARCHAR(120) NOT NULL,datos LONGTEXT NOT NULL,PRIMARY KEY (coleccion,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`],['espacio_comandos',`CREATE TABLE IF NOT EXISTS espacio_comandos (id VARCHAR(100) NOT NULL,usuario_id VARCHAR(100) NOT NULL,metodo VARCHAR(40) NOT NULL,huella CHAR(64) NOT NULL,resultado LONGTEXT NOT NULL,creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (id,usuario_id),CONSTRAINT fk_espacio_comando_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
const fakeUser=u=>({id:u.id,name:u.nombre,email:u.correo,role:u.rol,active:Boolean(u.activo),authVersion:u.version_acceso||0,salt:'0'.repeat(32),password:'0'.repeat(64)});
function recordMap(d){const map=new Map();for(const collection of COLLECTIONS){const rows=collection==='settings'?Object.entries(d.settings).map(([id,value])=>({id,value})):d[collection].map((value,i)=>({id:value.id||(collection==='notes'?'note-'+crypto.createHash('sha256').update(value.user+'\0'+value.lesson).digest('hex'):String(i)),value}));for(const row of rows)map.set(collection+'\0'+row.id,JSON.stringify(row.value));}return map;}
async function writeRecords(db,before,after){const old=recordMap(before),next=recordMap(after);for(const [key,value]of next)if(old.get(key)!==value){const [collection,id]=key.split('\0');await db.execute('INSERT INTO espacio_registros (coleccion,id,datos) VALUES (?,?,?) ON DUPLICATE KEY UPDATE datos=VALUES(datos)',[collection,id,value]);}for(const key of old.keys())if(!next.has(key)){const [collection,id]=key.split('\0');await db.execute('DELETE FROM espacio_registros WHERE coleccion = ? AND id = ?',[collection,id]);}}
function blank(users,revision){return {format:'RETAMAT_HTML',version:1,serverManaged:true,revision,users,...Object.fromEntries(COLLECTIONS.map(k=>[k,k==='settings'?{}:[]]))};}
function redactQuestion(q){return {...q,answer:0,explanation:'',solution_steps:['','']};}
function projection(data,actor,time=Date.now()){
 const d=clone(data),admin=actor.role==='admin';d.serverView=true;
 if(!admin){
  d.groups=d.groups.filter(g=>g.owner===actor.id||g.members.includes(actor.id));const owned=new Set(d.groups.filter(g=>g.owner===actor.id&&actor.role==='teacher').map(g=>g.id)),groupIds=new Set(d.groups.map(g=>g.id));
  d.tasks=d.tasks.filter(t=>groupIds.has(t.group));const teacherTasks=new Set(d.tasks.filter(t=>owned.has(t.group)).map(t=>t.id));
  d.rooms=d.rooms.filter(r=>r.owner===actor.id||r.members.includes(actor.id));const rooms=new Set(d.rooms.map(r=>r.id));
  d.activities=d.activities.filter(a=>a.owner===actor.id||teacherTasks.has(a.task)||rooms.has(a.room));
  d.activities=d.activities.map(a=>{
   const t=d.tasks.find(t=>t.id===a.task),teacher=teacherTasks.has(a.task),own=a.owner===actor.id,released=a.simulation?a.done||time>=a.deadline:!t?.exam||teacher||t.reveal&&time>=t.due;
   a.seed=0;a.questions=a.questions.map((q,i)=>teacher||own&&released&&(a.done||i<a.attempts.length)?q:redactQuestion(q));
   if(!own&&!teacher)a.attempts=a.attempts.map(x=>({...x,answer:''}));
   if(own&&!released)a.attempts=a.attempts.map(x=>({...x,correct:false}));return a;
  });
  d.tasks=d.tasks.map(t=>({...t,questions:teacherTasks.has(t.id)?t.questions:t.questions.map(redactQuestion)}));
  d.rooms=d.rooms.map(r=>({...r,questions:r.questions.map(redactQuestion)}));
  d.exercises=d.exercises.filter(q=>q.owner===actor.id&&actor.role==='teacher');
  d.notes=d.notes.filter(n=>n.user===actor.id);d.notifications=d.notifications.filter(n=>n.user===actor.id);
  const settings={};for(const [uid,value]of Object.entries(d.settings)){if(uid===actor.id)settings[uid]=value;else{const feedback=Object.fromEntries(Object.entries(value.feedback||{}).filter(([aid])=>d.activities.some(a=>a.id===aid&&teacherTasks.has(a.task))));if(Object.keys(feedback).length)settings[uid]={feedback};}}d.settings=settings;
  const users=new Set([actor.id,...d.groups.flatMap(g=>[g.owner,...g.members]),...d.rooms.flatMap(r=>[r.owner,...r.members]),...d.activities.map(a=>a.owner)]),emails=new Set([actor.id,...d.groups.filter(g=>owned.has(g.id)).flatMap(g=>g.members)]);
  d.users=d.users.filter(u=>users.has(u.id)).map(u=>({...u,email:emails.has(u.id)?u.email:''}));
 }
 // No salen hashes o sales reales: el motor solo trabaja con marcadores de validación.
 return d;
}
function expire(model,time){
 const d=model.data(),expired=d.activities.filter(a=>!a.done&&(a.deadline&&a.deadline<=time||a.task&&d.tasks.some(t=>t.id===a.task&&(!t.active||!t.legacyNoDue&&t.due<=time)))).map(a=>a.id);
 if(expired.length)model.update(data=>{for(const a of data.activities)if(expired.includes(a.id)){if(a.examReview)finishExam(data,a,time);else a.done=true;}});
}
const ALLOWED=new Set(['savePracticeDraft','startSimulation','finishSimulation','startDaily','startSmartReview','nextHint','saveExamDraft','submitExam','attachFile','createGroup','joinGroup','editGroup','setEnrollment','postGroupNotice','saveExercise','createTask','duplicateTask','closeTask','start','answer','startReview','setSettings','bookmark','note','feedback','readNotice','createRoom','joinRoom','controlRoom','chat','editLesson','archiveExercise','export','restore']);
const STAFF=new Set(['createGroup','editGroup','setEnrollment','postGroupNotice','saveExercise','createTask','duplicateTask','closeTask','feedback','createRoom','controlRoom','archiveExercise']);
function restoreContent(api,current,payload){
 const incoming=api.validate(clone(payload)),mapping=new Map();
 for(const old of incoming.users){const u=current.users.find(u=>u.email===old.email);if(!u)throw problem(400,'La copia incluye una cuenta que no existe en MySQL: '+old.email+'. Regístrala antes de importar.');mapping.set(old.id,u.id);}
 const remap=id=>{const value=mapping.get(id);if(!value)throw problem(400,'La copia contiene una referencia de usuario desconocida.');return value;};
 for(const g of incoming.groups){g.owner=remap(g.owner);g.members=g.members.map(remap);}for(const r of incoming.rooms){r.owner=remap(r.owner);r.members=r.members.map(remap);}for(const a of incoming.activities)a.owner=remap(a.owner);for(const e of incoming.exercises)e.owner=remap(e.owner);for(const n of incoming.notes)n.user=remap(n.user);for(const n of incoming.notifications)n.user=remap(n.user);
 incoming.settings=Object.fromEntries(Object.entries(incoming.settings).map(([id,s])=>[remap(id),s]));
 for(const key of COLLECTIONS){if(key==='settings'){current.settings={...current.settings,...incoming.settings};continue;}const records=new Map(current[key].map((r,i)=>[r.id||r.user+'\0'+r.lesson,r]));for(const row of incoming[key]){const id=row.id||row.user+'\0'+row.lesson,old=records.get(id);if(old&&['groups','rooms'].includes(key)){if(old.owner!==row.owner)throw problem(400,'La copia intenta cambiar el propietario de un grupo o sala existente.');row.members=[...new Set([...old.members,...row.members])];}if(old&&key==='tasks'&&old.group!==row.group)throw problem(400,'La copia intenta mover una actividad existente a otro grupo.');if(old&&key==='activities'&&(old.owner!==row.owner||old.task!==row.task||old.room!==row.room))throw problem(400,'La copia cambia referencias de una entrega existente.');records.set(id,row);}current[key]=[...records.values()];}
 for(const a of current.activities){if(a.task){const task=current.tasks.find(t=>t.id===a.task),group=current.groups.find(g=>g.id===task?.group);if(group&&!group.members.includes(a.owner))group.members.push(a.owner);}if(a.room){const room=current.rooms.find(r=>r.id===a.room);if(room&&!room.members.includes(a.owner))room.members.push(a.owner);}}current.revision++;return api.validate(current);
}
function createSpaceService(pool,{now=Date.now}={}){
 const motor=engine(now);
 async function load(db,req){
  await db.execute('INSERT IGNORE INTO espacio_control (id,revision,importado) VALUES (1,0,FALSE)');
  const [controls]=await db.execute('SELECT revision,importado FROM espacio_control WHERE id = 1 FOR UPDATE');const control=controls[0];
  const [actorRows]=await db.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);const native=actorRows[0];if(!native||!native.activo||native.version_acceso!==req.authVersion)throw problem(401,'Tu acceso cambió. Inicia sesión de nuevo.');
  const [users]=await db.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios');const accounts=users.map(fakeUser),actor=accounts.find(u=>u.id===req.user.id);
  let d=blank(accounts,Number(control.revision));
  const [records]=await db.execute('SELECT coleccion,id,datos FROM espacio_registros');
  if(!control.importado){
   d={...clone(motor.api.seed()),users:accounts,serverManaged:true};await importLegacy(db,d,now());motor.api.validate(d);await writeRecords(db,blank(accounts,0),d);await db.execute('UPDATE espacio_control SET importado = TRUE,revision = ? WHERE id = 1',[d.revision]);
  }else for(const row of records){if(!COLLECTIONS.includes(row.coleccion))throw Error('Colección de servidor desconocida');if(row.coleccion==='settings')d.settings[row.id]=JSON.parse(row.datos);else d[row.coleccion].push(JSON.parse(row.datos));}
  motor.api.validate(d);return {d,actor};
 }
 async function run(req,command=null){return transaction(pool,async db=>{
  const {d,actor}=await load(db,req),before=clone(d),model=motor.model(d,actor);upgradeExams(model);expire(model,now());
  let result=null,error=null;
  if(command){
   if(!ALLOWED.has(command.method)||!Array.isArray(command.args)||command.args.length>6)throw problem(400,'Operación no admitida.');
   if(typeof command.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(command.id))throw problem(400,'Identificador de operación no válido.');
   const fingerprint=crypto.createHash('sha256').update(JSON.stringify([command.method,command.args])).digest('hex');
   const [previous]=await db.execute('SELECT metodo,huella,resultado FROM espacio_comandos WHERE id = ? AND usuario_id = ?',[command.id,actor.id]);
   if(previous[0]){if(previous[0].huella!==fingerprint)throw problem(409,'Ese identificador ya se usó para otra operación.');result=JSON.parse(previous[0].resultado);}
   else{
    try{
     if(STAFF.has(command.method)&&!['teacher','admin'].includes(actor.role))throw problem(403,'Esta operación corresponde al docente o administrador.');
     if(command.method==='start'&&['assignment','challenge'].includes(command.args[0]?.mode)&&actor.role!=='student')throw problem(403,'Resuelve esta actividad con una cuenta de estudiante.');
     if(command.method==='start'&&!['practice','diagnostic','assignment','challenge'].includes(command.args[0]?.mode))throw problem(400,'Tipo de actividad no válido.');
     if(command.method==='setSettings'){const p=command.args[0];if(!p||Object.keys(p).some(k=>!['goal','font','contrast','motion'].includes(k)))throw problem(400,'Preferencia no admitida.');if(p.goal!==undefined&&(!Number.isInteger(p.goal)||p.goal<5||p.goal>200))throw problem(400,'Meta no válida.');if(p.font!==undefined&&!['normal','large','extra'].includes(p.font))throw problem(400,'Tamaño de letra no válido.');}
     if(command.method==='archiveExercise'){model.manager();model.update(data=>{const e=data.exercises.find(e=>e.id===command.args[0]);if(!e||e.owner!==actor.id&&actor.role!=='admin')throw problem(403,'No puedes archivar esa pregunta.');e.active=false;});}
     else if(command.method==='restore'){
      model.admin();await verifyPassword(db,actor.id,command.args[1]);const next=restoreContent(motor.api,model.data(),command.args[0]);model.save(next);
      await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[crypto.randomUUID(),actor.id,actor.id,'respaldo_importado',JSON.stringify({origin:'interfaz original'})]);result=true;
     }else if(command.method==='saveExamDraft'||command.method==='submitExam'){
      const a=model.activity(command.args[0]);if(!Number.isInteger(command.args[2])||command.args[2]!==Number(a.draftVersion||0))throw problem(409,'Las respuestas cambiaron en otra pestaña. Actualiza el examen antes de volver a guardar.');
      result=saveExam(model,command.args[0],command.args[1],now(),command.method==='submitExam');
     }else if(command.method==='answer'&&model.activity(command.args[0]).examReview){
      const a=model.activity(command.args[0]),answers=a.questions.map((_,i)=>a.drafts?.[i]||'');const step=Number(command.args[2]);if(!Number.isInteger(step)||step<0||step>=a.total)throw problem(400,'Pregunta no válida.');answers[step]=String(command.args[1]);saveExam(model,a.id,answers,now());result={recorded:true,correct:false,q:redactQuestion(a.questions[step])};
     }else if(command.method==='attachFile')result=await attachFile(db,model,command.args[0],command.args[1],command.args[2],now());
     else if(STUDY_METHODS.has(command.method))result=runStudy(model,command.method,command.args,now());
     else if(LEARNING_METHODS.has(command.method))result=runLearning(model,command.method,command.args,now());
     else result=await model[command.method](...command.args);
     expire(model,now());
     if(command.method==='answer'&&result){const current=model.data().activities.find(x=>x.id===command.args[0]);if(current?.practiceDraft)model.update(d=>{const a=d.activities.find(x=>x.id===current.id);delete a.practiceDraft;a.practiceDraftVersion=Number(a.practiceDraftVersion||0)+1;});}
     if(command.method==='answer'&&result){const a=model.data().activities.find(a=>a.id===command.args[0]);if(!model.released(a))result={correct:false,recorded:true,q:redactQuestion(result.q)};}
     if(command.method==='export'){result=clone(result);delete result.serverView;}
     result=result===undefined?null:clone(result);
     await db.execute('INSERT INTO espacio_comandos (id,usuario_id,metodo,huella,resultado) VALUES (?,?,?,?,?)',[command.id,actor.id,command.method,fingerprint,JSON.stringify(result)]);
    }catch(e){if(e.code||e instanceof Error&&!e.status||!e.message)throw e;error={status:e.status||400,message:e.message||'No se pudo aplicar la operación.'};}
   }
  }
  const after=model.data();motor.api.validate(after);await writeRecords(db,before,after);await mirror(db,before,after);await db.execute('UPDATE espacio_control SET revision = ? WHERE id = 1',[after.revision]);
  return {data:projection(after,actor,now()),user:{id:actor.id,name:actor.name,email:actor.email,role:actor.role},result,error,serverNow:now()};
 });}
 return {snapshot:req=>run(req),command:(req,b)=>run(req,b)};
}
async function verifyPassword(db,id,password){
 if(typeof password!=='string'||password.length>128)throw problem(400,'Escribe tu contraseña actual.');
 const [rows]=await db.execute('SELECT id,hash_clave,sal FROM usuarios WHERE id = ?',[id]);const u=rows[0];if(!u)throw problem(401,'Cuenta no disponible.');
 const hash=await derive(password,Buffer.from(u.sal,'hex'),600000,32,'sha256');if(!crypto.timingSafeEqual(hash,Buffer.from(u.hash_clave,'hex')))throw problem(403,'La contraseña actual no coincide.');
}
function mountSpace(app,pool,currentUser,{now=Date.now}={}){
 const service=createSpaceService(pool,{now}),wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Error del espacio:',e.code||e.name);res.status(e.status||503).json({mensaje:e.status?e.message:'No se pudo guardar en MySQL. Conserva la página y vuelve a intentar.'});}};
 app.get('/api/espacio',currentUser,wrap(async(req,res)=>res.json(await service.snapshot(req))));
 app.post('/api/espacio/comando',currentUser,wrap(async(req,res)=>{const result=await service.command(req,req.body||{});res.status(result.error?.status||200).json({...result,mensaje:result.error?.message});}));
 app.post('/api/espacio/perfil',currentUser,wrap(async(req,res)=>{
  const b=req.body||{};if(typeof b.name!=='string'||b.name.trim().length<2||b.name.trim().length>80)throw problem(400,'Escribe un nombre de 2 a 80 caracteres.');
  const {validatePassword}=require('./restablecer-clave');if(b.next)validatePassword(b.next);
  await transaction(pool,async db=>{const [actors]=await db.execute('SELECT id,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);if(!actors[0]?.activo||actors[0].version_acceso!==req.authVersion)throw problem(401,'Tu acceso cambió. Inicia sesión de nuevo.');if(b.next)await verifyPassword(db,req.user.id,b.current);if(b.next){const salt=crypto.randomBytes(16),hash=(await derive(b.next,salt,600000,32,'sha256')).toString('hex');await db.execute('UPDATE usuarios SET nombre = ?, hash_clave = ?, sal = ?, version_acceso = version_acceso + 1 WHERE id = ?',[b.name.trim(),hash,salt.toString('hex'),req.user.id]);}else await db.execute('UPDATE usuarios SET nombre = ? WHERE id = ?',[b.name.trim(),req.user.id]);});res.json({reauthenticate:Boolean(b.next)});
 }));
 app.post('/api/espacio/restablecer',currentUser,wrap(async(req,res)=>{
  if(req.user.role!=='admin')throw problem(403,'Solo un administrador puede restablecer otras cuentas.');const b=req.body||{};const {validatePassword}=require('./restablecer-clave');validatePassword(b.next);
  await transaction(pool,async db=>{await db.execute("SELECT codigo FROM roles WHERE codigo = 'admin' FOR UPDATE");const [actors]=await db.execute('SELECT id,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);if(!actors[0]?.activo||actors[0].rol!=='admin'||actors[0].version_acceso!==req.authVersion)throw problem(401,'Tu acceso cambió.');await verifyPassword(db,req.user.id,b.current);const [targets]=await db.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE',[b.id]);if(!targets[0])throw problem(404,'Cuenta no encontrada.');const salt=crypto.randomBytes(16),hash=(await derive(b.next,salt,600000,32,'sha256')).toString('hex');await db.execute('UPDATE usuarios SET hash_clave = ?, sal = ?, version_acceso = version_acceso + 1 WHERE id = ?',[hash,salt.toString('hex'),b.id]);await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[crypto.randomUUID(),req.user.id,b.id,'clave_restablecida_panel',JSON.stringify({origin:'interfaz original'})]);});res.json({reauthenticate:b.id===req.user.id});
 }));
 return service;
}
module.exports={SPACE_TABLES,COLLECTIONS,createSpaceService,projection,recordMap,mountSpace};
