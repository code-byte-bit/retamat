const crypto=require('node:crypto'),{promisify}=require('node:util'),{transaction}=require('./aula'),{validatePassword}=require('./restablecer-clave');
const derive=promisify(crypto.pbkdf2),digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const RECOVERY_TABLES=[['recuperaciones',`CREATE TABLE IF NOT EXISTS recuperaciones (id CHAR(64) PRIMARY KEY,usuario_id VARCHAR(100) NOT NULL,version_acceso INT UNSIGNED NOT NULL,vence_ms BIGINT UNSIGNED NOT NULL,usada BOOLEAN NOT NULL DEFAULT FALSE,INDEX idx_recuperacion_usuario (usuario_id),CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
function mailConfig(env=process.env){
 if(!env.SMTP_HOST||!env.MAIL_FROM)return null;
 const base=new URL(env.APP_URL||'http://127.0.0.1:3001');if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('APP_URL no válida.');
 const nodemailer=require('nodemailer'),port=Number(env.SMTP_PORT||587);
 return {base:base.origin,from:env.MAIL_FROM,transport:nodemailer.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,...(env.SMTP_USER?{auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD||''}}:{}),connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000})};
}
function mountRecovery(app,pool,{now=Date.now,mailer=undefined}={}){
 const limits=new Map();
 const config=()=>mailer===undefined?mailConfig():mailer;
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Recuperación por correo:',e.code||e.status||'ERROR');res.status(e.status||503).json({mensaje:e.status?e.message:'No se pudo completar la recuperación. Inténtalo más tarde o pide ayuda al administrador.'});}};
 const limit=(req,res,next)=>{const time=now();for(const [key,v]of limits)if(v.until<=time)limits.delete(key);const key=req.ip||'local',v=limits.get(key)||{count:0,until:time+900000};if(limits.size>=1000&&!limits.has(key)||++v.count>5)return res.status(429).json({mensaje:'Espera quince minutos antes de solicitar otro enlace.'});limits.set(key,v);next();};
 app.get('/api/auth/recuperacion/estado',wrap(async(req,res)=>res.json({enabled:Boolean(config())})));
 app.post('/api/auth/recuperacion/solicitar',limit,wrap(async(req,res)=>{
  const cfg=config();if(!cfg)throw problem(503,'El correo todavía no está configurado. Pide al administrador que configure SMTP o restablezca tu contraseña.');
  const email=req.body?.email;if(typeof email!=='string'||email.length>150||!/^\S+@\S+\.\S+$/.test(email.trim()))throw problem(400,'Escribe un correo válido.');
  const token=crypto.randomBytes(32).toString('hex'),id=digest(token),[users]=await pool.execute('SELECT id,nombre,correo,activo,version_acceso FROM usuarios WHERE correo = ? LIMIT 1',[email.trim().toLowerCase()]);const user=users[0];
  if(user?.activo){
   await pool.execute('INSERT INTO recuperaciones (id,usuario_id,version_acceso,vence_ms,usada) VALUES (?,?,?,?,?)',[id,user.id,user.version_acceso,now()+1800000,false]);
   try{await cfg.transport.sendMail({from:cfg.from,to:user.correo,subject:'Recupera tu acceso a RETAMAT',text:'Solicitaste cambiar tu contraseña de RETAMAT. Este enlace vence en 30 minutos y funciona una sola vez:\n\n'+cfg.base+'/#reset/'+token+'\n\nSi no lo solicitaste, ignora este mensaje. Tu contraseña sigue igual.'});}
   catch(error){await pool.execute('UPDATE recuperaciones SET usada = TRUE WHERE id = ?',[id]);console.error('No se pudo enviar el correo de recuperación:',error.code||'SMTP');}
  }
  res.json({mensaje:'Si el correo pertenece a una cuenta activa, recibirás un enlace de recuperación. Revisa también la carpeta de spam.'});
 }));
 app.post('/api/auth/recuperacion/restablecer',limit,wrap(async(req,res)=>{
  const b=req.body||{};if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))throw problem(400,'El enlace no es válido.');validatePassword(b.password);
  const hashId=digest(b.token),salt=crypto.randomBytes(16),password=(await derive(b.password,salt,600000,32,'sha256')).toString('hex');
  await transaction(pool,async db=>{
   // Bloquear usuario primero evita interbloqueos con dos enlaces de una cuenta.
   const [candidate]=await db.execute('SELECT id,usuario_id,version_acceso,vence_ms,usada FROM recuperaciones WHERE id = ?',[hashId]);const c=candidate[0];if(!c)throw problem(400,'El enlace venció o ya fue utilizado.');
   const [users]=await db.execute('SELECT id,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[c.usuario_id]);const u=users[0];
   const [rows]=await db.execute('SELECT id,usuario_id,version_acceso,vence_ms,usada FROM recuperaciones WHERE id = ? FOR UPDATE',[hashId]);const row=rows[0];
   if(!u?.activo||!row||row.usada||Number(row.vence_ms)<=now()||row.version_acceso!==u.version_acceso)throw problem(400,'El enlace venció o ya fue utilizado. Solicita otro.');
   await db.execute('UPDATE usuarios SET hash_clave = ?, sal = ?, version_acceso = version_acceso + 1 WHERE id = ?',[password,salt.toString('hex'),u.id]);await db.execute('UPDATE recuperaciones SET usada = TRUE WHERE usuario_id = ?',[u.id]);
   await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[crypto.randomUUID(),null,u.id,'recuperacion_correo',JSON.stringify({origin:'enlace temporal'})]);
  });res.json({mensaje:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'});
 }));
}
module.exports={RECOVERY_TABLES,mountRecovery,mailConfig};
