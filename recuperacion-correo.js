const crypto=require('node:crypto'),{promisify}=require('node:util'),{transaction}=require('./aula'),{validatePassword}=require('./restablecer-clave');
const derive=promisify(crypto.pbkdf2),digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const RECOVERY_TABLES=[['recuperaciones',`CREATE TABLE IF NOT EXISTS recuperaciones (id CHAR(64) PRIMARY KEY,usuario_id VARCHAR(100) NOT NULL,version_acceso INT UNSIGNED NOT NULL,vence_ms BIGINT UNSIGNED NOT NULL,usada BOOLEAN NOT NULL DEFAULT FALSE,INDEX idx_recuperacion_usuario (usuario_id),CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
function generateBackupCode(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const bytes=crypto.randomBytes(8);
 let code='';
 for(let i=0;i<8;i++)code+=alphabet[bytes[i]%alphabet.length];
 return code.slice(0,4)+'-'+code.slice(4);
}
function normalizeCode(code){
 return String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function mountRecovery(app,pool,{now=Date.now,currentUser=null}={}){
 const limits=new Map();
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Recuperación:',e.code||e.status||'ERROR');res.status(e.status||503).json({mensaje:e.status?e.message:'No se pudo completar la recuperación. Inténtalo más tarde o pide ayuda al administrador.'});}};
 const limit=(req,res,next)=>{const time=now();for(const [key,v]of limits)if(v.until<=time)limits.delete(key);const key=req.ip||'local',v=limits.get(key)||{count:0,until:time+900000};if(limits.size>=1000&&!limits.has(key)||++v.count>8)return res.status(429).json({mensaje:'Espera quince minutos antes de realizar otro intento.'});limits.set(key,v);next();};
 app.get('/api/auth/recuperacion/estado',wrap(async(req,res)=>res.json({enabled:true,mode:'backup-code'})));
 if(currentUser){
  app.post('/api/auth/recuperacion/generar',currentUser,wrap(async(req,res)=>{
   const backupCode=generateBackupCode();
   const hashId=digest(`${req.user.id}:${normalizeCode(backupCode)}`);
   await transaction(pool,async db=>{
    const [users]=await db.execute('SELECT id,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);
    const u=users[0];
    if(!u||!u.activo)throw problem(401,'Inicia sesión para continuar.');
    await db.execute('UPDATE recuperaciones SET usada = TRUE WHERE usuario_id = ? AND usada = FALSE',[u.id]);
    await db.execute('INSERT INTO recuperaciones (id,usuario_id,version_acceso,vence_ms,usada) VALUES (?,?,?,?,FALSE)',[hashId,u.id,u.version_acceso,0]);
   });
   res.json({backupCode,mensaje:'Nuevo código de recuperación generado.'});
  }));
 }
 app.post('/api/auth/recuperacion/restablecer',limit,wrap(async(req,res)=>{
  const b=req.body||{};
  validatePassword(b.password);
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const rawCode=typeof b.code==='string'?b.code.trim():'';
  if(!email||email.length>150||!/^\S+@\S+\.\S+$/.test(email))throw problem(400,'Escribe un correo válido.');
  const norm=normalizeCode(rawCode);
  if(norm.length!==8&&norm.length!==6)throw problem(400,'Escribe tu código de recuperación de 8 caracteres.');
  const [users]=await pool.execute('SELECT id,activo,version_acceso FROM usuarios WHERE correo = ? LIMIT 1',[email]);
  const user=users[0];
  if(!user||!user.activo)throw problem(400,'El código de recuperación no es válido para este correo.');
  const hashId=digest(`${user.id}:${norm}`);
  const salt=crypto.randomBytes(16),password=(await derive(b.password,salt,600000,32,'sha256')).toString('hex');
  const nextBackupCode=generateBackupCode();
  const nextHashId=digest(`${user.id}:${normalizeCode(nextBackupCode)}`);
  await transaction(pool,async db=>{
   const [candidate]=await db.execute('SELECT id,usuario_id,version_acceso,vence_ms,usada FROM recuperaciones WHERE id = ? FOR UPDATE',[hashId]);
   const c=candidate[0];
   if(!c||c.usada)throw problem(400,'El código de recuperación no es válido o ya fue utilizado.');
   if(c.vence_ms&&Number(c.vence_ms)>0&&Number(c.vence_ms)<=now())throw problem(400,'El código ya venció. Contacta al administrador.');
   if(c.version_acceso!==user.version_acceso)throw problem(400,'El código de recuperación ya no es válido para tu versión de acceso.');
   const nextVersion=user.version_acceso+1;
   await db.execute('UPDATE usuarios SET hash_clave = ?, sal = ?, version_acceso = ? WHERE id = ?',[password,salt.toString('hex'),nextVersion,user.id]);
   await db.execute('UPDATE recuperaciones SET usada = TRUE WHERE usuario_id = ?',[user.id]);
   await db.execute('INSERT INTO recuperaciones (id,usuario_id,version_acceso,vence_ms,usada) VALUES (?,?,?,?,FALSE)',[nextHashId,user.id,nextVersion,0]);
   await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[crypto.randomUUID(),null,user.id,'recuperacion_clave',JSON.stringify({origin:'codigo_respaldo'})]);
  });
  res.json({mensaje:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',nextBackupCode});
 }));
}
module.exports={RECOVERY_TABLES,mountRecovery,generateBackupCode,normalizeCode};
