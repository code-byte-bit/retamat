const {randomUUID}=require('node:crypto');
const {transaction}=require('./aula');
const {LESSONS}=require('./lecciones');
const ADMIN_TABLES=[['auditoria',`CREATE TABLE IF NOT EXISTS auditoria (
 id VARCHAR(100) PRIMARY KEY,
 actor_id VARCHAR(100) NULL,
 usuario_id VARCHAR(100) NOT NULL,
 accion VARCHAR(40) NOT NULL,
 datos LONGTEXT NOT NULL,
 fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_auditoria_fecha (fecha,id),
 CONSTRAINT fk_auditoria_actor FOREIGN KEY (actor_id) REFERENCES usuarios(id),
 CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const TABLE_NAMES=['roles','usuarios','diagnosticos','practicas','grupos','integrantes_grupo','asignaciones','entregas','auditoria'];
const ROLES=['student','teacher','admin'];
const problem=(status,message)=>Object.assign(Error(message),{status});
async function lockAdminRole(db){
 const [rows]=await db.execute("SELECT codigo FROM roles WHERE codigo = 'admin' FOR UPDATE");
 if(!rows[0])throw problem(409,'Falta el rol admin en la tabla roles. Revisa la preparación inicial de MySQL.');
}
async function audit(db,actor,user,action,data){
 await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[randomUUID(),actor,user,action,JSON.stringify(data)]);
}
async function bootstrapAdmin(pool,email){
 if(typeof email!=='string'||email.trim().length>150||!/^\S+@\S+\.\S+$/.test(email.trim()))throw problem(400,'Indica el correo de una cuenta ya registrada: node crear-admin.js correo@ejemplo.com');
 return transaction(pool,async db=>{
  await lockAdminRole(db);
  const [admins]=await db.execute("SELECT id FROM usuarios WHERE rol = 'admin' AND activo = TRUE FOR UPDATE");
  if(admins.length)throw problem(409,'Ya existe un administrador activo. Entra con esa cuenta y usa el panel para asignar más administradores.');
  const [rows]=await db.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios WHERE correo = ? FOR UPDATE',[email.trim().toLowerCase()]);
  const u=rows[0];if(!u)throw problem(404,'Ese correo no está registrado. Primero crea la cuenta desde /registro.');
  if(!u.activo)throw problem(409,'La cuenta elegida está desactivada. Usa una cuenta activa.');
  await db.execute("UPDATE usuarios SET rol = 'admin', version_acceso = version_acceso + 1 WHERE id = ?",[u.id]);
  await audit(db,null,u.id,'primer_admin',{origin:'terminal local',roleBefore:u.rol,roleAfter:'admin'});
  return {id:u.id,name:u.nombre,email:u.correo};
 });
}
function adminInput(body){const b=body||{};if(!ROLES.includes(b.role)||typeof b.active!=='boolean'||!Number.isSafeInteger(b.revision)||b.revision<0)throw problem(400,'Elige un rol y un estado válidos. Vuelve a cargar el usuario si es necesario.');return b;}
function mountAdmin(app,pool,currentUser,{lessonsCount=LESSONS.length,tableNames=TABLE_NAMES}={}){
 const admin=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({mensaje:'Esta sección requiere una cuenta de administrador.'});
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){if(error.status)return res.status(error.status).json({mensaje:error.message});console.error('Error administrativo:',error.code||error.name);res.status(503).json({mensaje:'No se pudo consultar o guardar la administración. Revisa MySQL y vuelve a intentar.'});}};
 async function assertActor(db,req){
  const [rows]=await db.execute('SELECT id,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);const a=rows[0];
  if(!a||a.rol!=='admin'||!a.activo||a.version_acceso!==req.authVersion)throw problem(401,'Tu acceso administrativo cambió. Inicia sesión nuevamente.');
 }
 app.get('/api/admin/resumen',currentUser,admin,wrap(async(req,res)=>{
  const tables=[];for(const name of tableNames){const [rows]=await pool.execute('SELECT COUNT(*) AS total FROM '+name);tables.push({name,count:Number(rows[0].total)});}
  const [roles]=await pool.execute('SELECT rol,COUNT(*) AS total,SUM(activo = TRUE) AS activas FROM usuarios GROUP BY rol');
  res.json({tables,roles:roles.map(r=>({role:r.rol,total:Number(r.total),active:Number(r.activas)})),lessons:lessonsCount});
 }));
 app.get('/api/admin/usuarios',currentUser,admin,wrap(async(req,res)=>{
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  const role=req.query.role??'all',status=req.query.status??'all',rawPage=req.query.page??'1';
  const page=typeof rawPage==='string'&&/^\d+$/.test(rawPage)?Number(rawPage):NaN;
  if(q.length>100||!['all',...ROLES].includes(role)||!['all','active','inactive'].includes(status)||!Number.isSafeInteger(page)||page<1||page>100000)throw problem(400,'Revisa los filtros de usuarios.');
  const where=[],params=[];if(q){where.push('(LOCATE(?,LOWER(nombre)) > 0 OR LOCATE(?,LOWER(correo)) > 0)');params.push(q.toLowerCase(),q.toLowerCase());}if(role!=='all'){where.push('rol = ?');params.push(role);}if(status!=='all'){where.push('activo = ?');params.push(status==='active');}
  const clause=where.length?' WHERE '+where.join(' AND '):'';
  const [counts]=await pool.execute('SELECT COUNT(*) AS total FROM usuarios'+clause,params);
  // offset solo se interpola después de comprobar que es un entero acotado.
  const [users]=await pool.execute('SELECT id,nombre,correo,rol,activo,fecha_creacion,version_acceso AS revision FROM usuarios'+clause+' ORDER BY nombre,id LIMIT 50 OFFSET '+((page-1)*50),params);
  res.json({users,total:Number(counts[0].total),page,pageSize:50});
 }));
 app.post('/api/admin/usuarios/:id/actualizar',currentUser,admin,wrap(async(req,res)=>{
  const b=adminInput(req.body);
  const result=await transaction(pool,async db=>{
   await lockAdminRole(db);await assertActor(db,req);
   const [rows]=await db.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.params.id]);const u=rows[0];if(!u)throw problem(404,'No se encontró ese usuario.');
   if(u.version_acceso!==b.revision)throw problem(409,'El usuario cambió desde que lo abriste. Actualiza la lista antes de guardar.');
   const wasActive=Boolean(u.activo),changed=u.rol!==b.role||wasActive!==b.active;
   if(!changed)return {mensaje:'No hay cambios por guardar.',reauthenticate:false};
   if(u.rol==='admin'&&wasActive&&(b.role!=='admin'||!b.active)){
    const [admins]=await db.execute("SELECT id FROM usuarios WHERE rol = 'admin' AND activo = TRUE FOR UPDATE");
    if(admins.length<=1)throw problem(409,'Debe permanecer al menos un administrador activo. Primero asigna ese rol a otra cuenta activa.');
   }
   await db.execute('UPDATE usuarios SET rol = ?, activo = ?, version_acceso = version_acceso + 1 WHERE id = ?',[b.role,b.active,u.id]);
   await audit(db,req.user.id,u.id,'usuario_actualizado',{roleBefore:u.rol,roleAfter:b.role,activeBefore:wasActive,activeAfter:b.active});
   return {mensaje:'Usuario actualizado. Sus sesiones anteriores quedaron invalidadas.',reauthenticate:u.id===req.user.id};
  });res.json(result);
 }));
 app.post('/api/admin/usuarios/:id/cerrar-sesiones',currentUser,admin,wrap(async(req,res)=>{
  const b=req.body||{};if(!Number.isSafeInteger(b.revision)||b.revision<0)throw problem(400,'Vuelve a cargar el usuario antes de cerrar sus sesiones.');
  const result=await transaction(pool,async db=>{
   await lockAdminRole(db);await assertActor(db,req);
   const [rows]=await db.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.params.id]);const u=rows[0];if(!u)throw problem(404,'No se encontró ese usuario.');
   if(u.version_acceso!==b.revision)throw problem(409,'El usuario cambió. Actualiza la lista antes de continuar.');
   await db.execute('UPDATE usuarios SET version_acceso = version_acceso + 1 WHERE id = ?',[u.id]);
   await audit(db,req.user.id,u.id,'sesiones_revocadas',{});return {mensaje:'Sesiones anteriores invalidadas. El usuario puede volver a entrar con su contraseña.',reauthenticate:u.id===req.user.id};
  });res.json(result);
 }));
 app.get('/api/admin/auditoria',currentUser,admin,wrap(async(req,res)=>{
  const [rows]=await pool.execute('SELECT a.id,a.accion,a.datos,a.fecha,u.nombre AS actor,t.nombre AS usuario FROM auditoria a LEFT JOIN usuarios u ON u.id=a.actor_id INNER JOIN usuarios t ON t.id=a.usuario_id ORDER BY a.fecha DESC,a.id DESC LIMIT 100');
  res.json({events:rows.map(r=>({...r,details:JSON.parse(r.datos),datos:undefined}))});
 }));
}
module.exports={ADMIN_TABLES,TABLE_NAMES,bootstrapAdmin,adminInput,mountAdmin};
