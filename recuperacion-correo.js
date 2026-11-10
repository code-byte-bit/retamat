const crypto=require('node:crypto'),{promisify}=require('node:util'),{transaction}=require('./aula'),{validatePassword}=require('./restablecer-clave');
const derive=promisify(crypto.pbkdf2),digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const RECOVERY_TABLES=[['recuperaciones',`CREATE TABLE IF NOT EXISTS recuperaciones (id CHAR(64) PRIMARY KEY,usuario_id VARCHAR(100) NOT NULL,version_acceso INT UNSIGNED NOT NULL,vence_ms BIGINT UNSIGNED NOT NULL,usada BOOLEAN NOT NULL DEFAULT FALSE,INDEX idx_recuperacion_usuario (usuario_id),CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
function mailConfig(env=process.env){
 const user=(env.SMTP_USER||'').trim();
 const rawPass=(env.SMTP_PASSWORD||'').trim();
 const host=(env.SMTP_HOST||(user&&rawPass?'smtp.gmail.com':'')).trim();
 const from=(env.MAIL_FROM||(user?`RETAMAT <${user}>`:'')).trim();
 const pass=host.includes('gmail')?rawPass.replace(/\s+/g,''):rawPass;
 if(!host||!from||(host.includes('gmail')&&(!user||!pass)))return null;
 let origin='http://127.0.0.1:3001';
 if(env.APP_URL){
  const base=new URL(env.APP_URL);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw Error('APP_URL no válida.');
  origin=base.origin;
 }
 const nodemailer=require('nodemailer'),port=Number(env.SMTP_PORT||587);
 return {base:origin,from,transport:nodemailer.createTransport({host,port,secure:port===465,requireTLS:port!==465,...(user?{auth:{user,pass}}:{}) ,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000})};
}
function mountRecovery(app,pool,{now=Date.now,mailer=undefined}={}){
 const limits=new Map();
 const config=()=>mailer===undefined?mailConfig():mailer;
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Recuperación por correo:',e.code||e.status||'ERROR');res.status(e.status||503).json({mensaje:e.status?e.message:'No se pudo completar la recuperación. Inténtalo más tarde o pide ayuda al administrador.'});}};
 const limit=(req,res,next)=>{const time=now();for(const [key,v]of limits)if(v.until<=time)limits.delete(key);const key=req.ip||'local',v=limits.get(key)||{count:0,until:time+900000};if(limits.size>=1000&&!limits.has(key)||++v.count>8)return res.status(429).json({mensaje:'Espera quince minutos antes de realizar otro intento.'});limits.set(key,v);next();};
 app.get('/api/auth/recuperacion/estado',wrap(async(req,res)=>res.json({enabled:Boolean(config())})));
 app.post('/api/auth/recuperacion/solicitar',limit,wrap(async(req,res)=>{
  const cfg=config();if(!cfg)throw problem(503,'El servicio de correo no está configurado en este momento. Contacta al administrador.');
  const email=req.body?.email;if(typeof email!=='string'||email.length>150||!/^\S+@\S+\.\S+$/.test(email.trim()))throw problem(400,'Escribe un correo válido.');
  const cleanEmail=email.trim().toLowerCase();
  const [users]=await pool.execute('SELECT id,nombre,correo,activo,version_acceso FROM usuarios WHERE correo = ? LIMIT 1',[cleanEmail]);const user=users[0];
  if(user?.activo){
   const code=String(crypto.randomInt(100000,1000000)),id=digest(`${user.id}:${code}`);
   await pool.execute('UPDATE recuperaciones SET usada = TRUE WHERE usuario_id = ? AND usada = FALSE',[user.id]);
   await pool.execute('INSERT INTO recuperaciones (id,usuario_id,version_acceso,vence_ms,usada) VALUES (?,?,?,?,?)',[id,user.id,user.version_acceso,now()+900000,false]);
   try{
    await cfg.transport.sendMail({
     from:cfg.from,
     to:user.correo,
     subject:'Código de verificación de RETAMAT',
     text:`Hola, ${user.nombre}:\n\nSolicitaste restablecer tu contraseña en RETAMAT.\n\nTu código de verificación es: ${code}\n\nEste código de 6 dígitos vence en 15 minutos y funciona una sola vez.\n\nSi no solicitaste este cambio, ignora este mensaje.`,
     html:`<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #dce5d7;border-radius:16px;color:#203c35;background:#ffffff"><p style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#276457;margin:0 0 8px">RETAMAT · RECUPERACIÓN DE CUENTA</p><h2 style="margin:0 0 12px;font-size:22px">Código de verificación</h2><p style="margin:0 0 16px;color:#4a5d52">Hola, <strong>${user.nombre.replace(/[&<>"']/g,'')}</strong>. Ingresa el siguiente código en la ventana de recuperación para crear tu nueva contraseña:</p><div style="background:#f5f7f3;border:1px solid #dce5d7;border-radius:12px;padding:18px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#152e2b;margin:0 0 16px">${code}</div><p style="margin:0;font-size:13px;color:#627267">Este código vence en 15 minutos y solo puede utilizarse una vez. Si no lo solicitaste, puedes ignorar este correo.</p></div>`
    });
   }catch(error){
    await pool.execute('UPDATE recuperaciones SET usada = TRUE WHERE id = ?',[id]);
    console.error('No se pudo enviar el correo de recuperación:',error.code||'SMTP');
    throw problem(503,'No se pudo enviar el código de verificación. Revisa la configuración del correo e inténtalo de nuevo.');
   }
  }
  res.json({mensaje:'Si el correo pertenece a una cuenta activa, enviamos un código de verificación de 6 dígitos. Revisa tu bandeja de entrada y spam.'});
 }));
 app.post('/api/auth/recuperacion/restablecer',limit,wrap(async(req,res)=>{
  const b=req.body||{};
  validatePassword(b.password);
  let hashId='';
  if(typeof b.code==='string'&&b.code.trim()){
   const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
   const code=b.code.trim();
   if(!email||email.length>150||!/^\S+@\S+\.\S+$/.test(email))throw problem(400,'Escribe un correo válido.');
   if(!/^\d{6}$/.test(code))throw problem(400,'Escribe el código de verificación de 6 dígitos.');
   const [users]=await pool.execute('SELECT id FROM usuarios WHERE correo = ? LIMIT 1',[email]);
   if(!users[0])throw problem(400,'El código de verificación no es válido o ya venció.');
   hashId=digest(`${users[0].id}:${code}`);
  }else if(typeof b.token==='string'&&/^[a-f0-9]{64}$/.test(b.token)){
   hashId=digest(b.token);
  }else{
   throw problem(400,'Escribe el código de verificación de 6 dígitos.');
  }
  const salt=crypto.randomBytes(16),password=(await derive(b.password,salt,600000,32,'sha256')).toString('hex');
  await transaction(pool,async db=>{
   const [candidate]=await db.execute('SELECT id,usuario_id,version_acceso,vence_ms,usada FROM recuperaciones WHERE id = ?',[hashId]);const c=candidate[0];if(!c)throw problem(400,'El código de verificación no es válido o ya venció.');
   const [users]=await db.execute('SELECT id,activo,version_acceso FROM usuarios WHERE id = ? FOR UPDATE',[c.usuario_id]);const u=users[0];
   const [rows]=await db.execute('SELECT id,usuario_id,version_acceso,vence_ms,usada FROM recuperaciones WHERE id = ? FOR UPDATE',[hashId]);const row=rows[0];
   if(!u?.activo||!row||row.usada||Number(row.vence_ms)<=now()||row.version_acceso!==u.version_acceso)throw problem(400,'El código de verificación no es válido o ya venció. Solicita uno nuevo.');
   await db.execute('UPDATE usuarios SET hash_clave = ?, sal = ?, version_acceso = version_acceso + 1 WHERE id = ?',[password,salt.toString('hex'),u.id]);await db.execute('UPDATE recuperaciones SET usada = TRUE WHERE usuario_id = ?',[u.id]);
   await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[crypto.randomUUID(),null,u.id,'recuperacion_correo',JSON.stringify({origin:'codigo verificacion'})]);
  });res.json({mensaje:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'});
 }));
}
module.exports={RECOVERY_TABLES,mountRecovery,mailConfig};
