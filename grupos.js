const {randomBytes,randomUUID}=require('node:crypto');
const {transaction}=require('./aula');
const {LESSONS}=require('./lecciones');
const GROUP_TABLES=[['grupos',`CREATE TABLE IF NOT EXISTS grupos (
 id VARCHAR(100) PRIMARY KEY,
 docente_id VARCHAR(100) NOT NULL,
 nombre VARCHAR(80) NOT NULL,
 descripcion VARCHAR(1000) NOT NULL DEFAULT '',
 codigo CHAR(12) NOT NULL UNIQUE,
 inscripciones_abiertas BOOLEAN NOT NULL DEFAULT TRUE,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_grupos_docente (docente_id,creada),
 CONSTRAINT fk_grupos_docente FOREIGN KEY (docente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`],['integrantes_grupo',`CREATE TABLE IF NOT EXISTS integrantes_grupo (
 grupo_id VARCHAR(100) NOT NULL,
 usuario_id VARCHAR(100) NOT NULL,
 fecha_ingreso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (grupo_id,usuario_id),
 INDEX idx_integrantes_usuario (usuario_id),
 CONSTRAINT fk_integrantes_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id),
 CONSTRAINT fk_integrantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
function groupInput(body){
 const b=body||{};
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.trim().length>80)throw problem(400,'El nombre del grupo debe tener de 2 a 80 caracteres.');
 if(typeof b.description!=='string'||b.description.trim().length>1000)throw problem(400,'La descripción debe tener como máximo 1000 caracteres.');
 return {name:b.name.trim(),description:b.description.trim()};
}
function mountGroups(app,pool,currentUser){
 const teacher=(req,res,next)=>req.user.role==='teacher'?next():res.status(403).json({mensaje:'Esta acción es para docentes.'});
 const student=(req,res,next)=>req.user.role==='student'?next():res.status(403).json({mensaje:'Solo estudiantes pueden unirse a grupos.'});
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){if(error.status)return res.status(error.status).json({mensaje:error.message});console.error('Error de grupos:',error.code||error.name);res.status(503).json({mensaje:'No se pudo consultar o guardar el grupo. Revisa MySQL y vuelve a intentar.'});}};
 async function owned(id,user){const [rows]=await pool.execute('SELECT id,nombre,descripcion,codigo,inscripciones_abiertas,creada FROM grupos WHERE id = ? AND docente_id = ?',[id,user]);if(!rows[0])throw problem(404,'No se encontró ese grupo entre los tuyos.');return rows[0];}
 app.get('/api/grupos',currentUser,wrap(async(req,res)=>{
  if(req.user.role==='teacher'){
   const [groups]=await pool.execute('SELECT g.id,g.nombre,g.descripcion,g.codigo,g.inscripciones_abiertas,g.creada,(SELECT COUNT(*) FROM integrantes_grupo i WHERE i.grupo_id=g.id) AS integrantes FROM grupos g WHERE g.docente_id = ? ORDER BY g.creada DESC,g.id DESC',[req.user.id]);res.json({groups});
  }else if(req.user.role==='student'){
   const [groups]=await pool.execute('SELECT g.id,g.nombre,g.descripcion,g.inscripciones_abiertas,u.nombre AS docente,i.fecha_ingreso FROM integrantes_grupo i INNER JOIN grupos g ON g.id=i.grupo_id INNER JOIN usuarios u ON u.id=g.docente_id WHERE i.usuario_id = ? ORDER BY i.fecha_ingreso DESC,g.id DESC',[req.user.id]);res.json({groups});
  }else throw problem(403,'Para administrar usuarios, abre /admin.');
 }));
 app.post('/api/grupos',currentUser,teacher,wrap(async(req,res)=>{
  const b=groupInput(req.body),id=randomUUID();
  for(let n=0;n<5;n++){
   const code=randomBytes(6).toString('hex').toUpperCase();
   try{await pool.execute('INSERT INTO grupos (id,docente_id,nombre,descripcion,codigo) VALUES (?,?,?,?,?)',[id,req.user.id,b.name,b.description,code]);return res.status(201).json({group:{id,nombre:b.name,descripcion:b.description,codigo:code,inscripciones_abiertas:true,integrantes:0}});}
   catch(error){if(error.code!=='ER_DUP_ENTRY'||n===4)throw error;}
  }
 }));
 app.post('/api/grupos/unirse',currentUser,student,wrap(async(req,res)=>{
  const raw=req.body?.code;if(typeof raw!=='string'||!/^\s*[a-fA-F0-9]{12}\s*$/.test(raw))throw problem(400,'Escribe el código de 12 caracteres que te compartió tu docente.');
  const code=raw.trim().toUpperCase();
  const group=await transaction(pool,async db=>{
   const [rows]=await db.execute('SELECT id,nombre,inscripciones_abiertas FROM grupos WHERE codigo = ? FOR UPDATE',[code]);const g=rows[0];if(!g)throw problem(404,'No se encontró un grupo con ese código.');
   const [joined]=await db.execute('SELECT usuario_id FROM integrantes_grupo WHERE grupo_id = ? AND usuario_id = ?',[g.id,req.user.id]);if(joined.length)return {id:g.id,nombre:g.nombre,alreadyJoined:true};
   if(!g.inscripciones_abiertas)throw problem(409,'El docente pausó las inscripciones de este grupo.');
   await db.execute('INSERT INTO integrantes_grupo (grupo_id,usuario_id) VALUES (?,?)',[g.id,req.user.id]);return {id:g.id,nombre:g.nombre,alreadyJoined:false};
  });res.json({group,mensaje:group.alreadyJoined?'Ya perteneces a ese grupo.':'Te uniste al grupo correctamente.'});
 }));
 app.post('/api/grupos/:id/editar',currentUser,teacher,wrap(async(req,res)=>{
  const b=groupInput(req.body);await owned(req.params.id,req.user.id);
  await pool.execute('UPDATE grupos SET nombre = ?, descripcion = ? WHERE id = ? AND docente_id = ?',[b.name,b.description,req.params.id,req.user.id]);res.json({mensaje:'Grupo actualizado.'});
 }));
 app.post('/api/grupos/:id/acceso',currentUser,teacher,wrap(async(req,res)=>{
  if(typeof req.body?.open!=='boolean')throw problem(400,'Indica si las inscripciones deben estar abiertas o pausadas.');
  await owned(req.params.id,req.user.id);
  await pool.execute('UPDATE grupos SET inscripciones_abiertas = ? WHERE id = ? AND docente_id = ?',[req.body.open,req.params.id,req.user.id]);res.json({mensaje:req.body.open?'Inscripciones abiertas.':'Inscripciones pausadas.'});
 }));
 app.get('/api/grupos/:id',currentUser,teacher,wrap(async(req,res)=>{
  const group=await owned(req.params.id,req.user.id);
  const [roster]=await pool.execute('SELECT u.id,u.nombre,u.correo,u.activo,i.fecha_ingreso FROM integrantes_grupo i INNER JOIN usuarios u ON u.id=i.usuario_id WHERE i.grupo_id = ? ORDER BY u.nombre,u.id',[group.id]);
  const [diagnostics]=await pool.execute("SELECT d.usuario_id,COUNT(*) AS total,MAX(d.aciertos) AS mejor FROM diagnosticos d INNER JOIN integrantes_grupo i ON i.usuario_id=d.usuario_id WHERE i.grupo_id = ? AND d.estado = 'terminado' GROUP BY d.usuario_id",[group.id]);
  const [practices]=await pool.execute("SELECT p.usuario_id,p.leccion_id,COUNT(*) AS total,MAX(p.aciertos) AS mejor FROM practicas p INNER JOIN integrantes_grupo i ON i.usuario_id=p.usuario_id WHERE i.grupo_id = ? AND p.estado = 'terminado' GROUP BY p.usuario_id,p.leccion_id",[group.id]);
  const members=roster.map(u=>{const d=diagnostics.find(d=>d.usuario_id===u.id),ps=practices.filter(p=>p.usuario_id===u.id);return {...u,diagnostics:Number(d?.total||0),bestDiagnostic:d?.mejor??null,practices:ps.reduce((n,p)=>n+Number(p.total),0),completedLessons:ps.filter(p=>Number(p.mejor)>=5&&LESSONS.some(l=>l.id===p.leccion_id)).length};});
  res.json({group,members,lessonCount:LESSONS.length});
 }));
}
module.exports={GROUP_TABLES,groupInput,mountGroups};
