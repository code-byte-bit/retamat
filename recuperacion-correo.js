const crypto=require('node:crypto'),path=require('node:path'),{promisify}=require('node:util'),{transaction}=require('./aula'),{validatePassword}=require('./restablecer-clave');
const derive=promisify(crypto.pbkdf2),digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const RECOVERY_TABLES=[['recuperaciones',`CREATE TABLE IF NOT EXISTS recuperaciones (id CHAR(64) PRIMARY KEY,usuario_id VARCHAR(100) NOT NULL,version_acceso INT UNSIGNED NOT NULL,vence_ms BIGINT UNSIGNED NOT NULL,usada BOOLEAN NOT NULL DEFAULT FALSE,tipo VARCHAR(20) NOT NULL DEFAULT 'email',INDEX idx_recuperacion_usuario (usuario_id),CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];
const problem=(status,message)=>Object.assign(Error(message),{status});
const clean=x=>String(x??'').replace(/[\x00-\x1f]/g,'').trim();
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
function buildBackupPdf({code,email='',name='',time=Date.now()}){
 const fs=require('node:fs'),PDFDocument=require('pdfkit');
 const doc=new PDFDocument({size:'A4',margin:50,info:{Title:'RETAMAT · Código de recuperación',Author:'RETAMAT'}}),chunks=[];
 const result=new Promise((resolve,reject)=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const normalFont=path.join(__dirname,'fuentes','DejaVuSans.ttf'),boldFont=path.join(__dirname,'fuentes','DejaVuSans-Bold.ttf');
 doc.registerFont('Normal',fs.existsSync(normalFont)?normalFont:'Helvetica');
 doc.registerFont('Bold',fs.existsSync(boldFont)?boldFont:'Helvetica-Bold');
 doc.rect(0,0,doc.page.width,14).fill('#152e2b');
 doc.font('Bold').fontSize(24).fillColor('#152e2b').text('RETAMAT',50,45);
 doc.font('Bold').fontSize(16).fillColor('#203c35').text('Código de recuperación de cuenta',50,82);
 doc.font('Normal').fontSize(10).fillColor('#535d73').text('Generado: '+new Date(time).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}),50,108);
 let y=140;
 if(name||email){
  doc.roundedRect(50,y,495,name&&email?58:38,10).fill('#f5f7f3');
  if(name){doc.font('Bold').fontSize(10).fillColor('#203c35').text('Nombre: ',66,y+12,{continued:true}).font('Normal').text(clean(name).slice(0,100));}
  if(email){doc.font('Bold').fontSize(10).fillColor('#203c35').text('Correo: ',66,name?y+32:y+12,{continued:true}).font('Normal').text(clean(email).slice(0,150));}
  y+=name&&email?76:56;
 }
 doc.roundedRect(50,y,495,110,14).fillAndStroke('#eef5ec','#276457');
 doc.font('Bold').fontSize(11).fillColor('#276457').text('TU CÓDIGO DE RECUPERACIÓN',50,y+20,{width:495,align:'center'});
 doc.font('Bold').fontSize(30).fillColor('#152e2b').text(code,50,y+46,{width:495,align:'center',characterSpacing:4});
 y+=132;
 doc.font('Bold').fontSize(12).fillColor('#203c35').text('¿Cómo usar este código si olvidas tu contraseña?',50,y);
 y+=24;
 const steps=[
  '1. Abre la pantalla de inicio de sesión de RETAMAT y pulsa "¿Olvidaste tu contraseña?".',
  '2. Escribe el correo electrónico de tu cuenta y este código de recuperación ('+code+').',
  '3. Escribe tu nueva contraseña. Al usar este código se generará uno nuevo automáticamente.'
 ];
 steps.forEach(s=>{doc.font('Normal').fontSize(10.5).fillColor('#203c35').text(s,50,y,{width:495});y=doc.y+10;});
 doc.font('Normal').fontSize(9.5).fillColor('#627267').text('Importante: Guarda este documento en un lugar seguro. Este código funciona una sola vez.',50,y+12,{width:495});
 doc.end();
 return result;
}
function mountRecovery(app,pool,{now=Date.now}={}){
 const limits=new Map();
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Recuperación:',e.code||e.status||'ERROR');res.status(e.status||503).json({mensaje:e.status?e.message:'No se pudo completar la recuperación. Inténtalo más tarde o pide ayuda al administrador.'});}};
 const limit=(req,res,next)=>{const time=now();for(const [key,v]of limits)if(v.until<=time)limits.delete(key);const key=req.ip||'local',v=limits.get(key)||{count:0,until:time+900000};if(limits.size>=1000&&!limits.has(key)||++v.count>8)return res.status(429).json({mensaje:'Espera quince minutos antes de realizar otro intento.'});limits.set(key,v);next();};
 app.get('/api/auth/recuperacion/estado',wrap(async(req,res)=>res.json({enabled:true,mode:'backup-code'})));
 app.get('/api/auth/recuperacion/codigo.pdf',wrap(async(req,res)=>{
  const norm=normalizeCode(req.query?.code);
  if(norm.length!==8)throw problem(400,'Código no válido.');
  const formatted=norm.slice(0,4)+'-'+norm.slice(4);
  const bytes=await buildBackupPdf({code:formatted,email:req.query?.email||'',name:req.query?.name||'',time:now()});
  res.set('Content-Type','application/pdf');
  res.set('Content-Disposition','attachment; filename="RETAMAT_Codigo_Recuperacion.pdf"');
  res.send(bytes);
 }));
 app.post('/api/auth/recuperacion/restablecer',limit,wrap(async(req,res)=>{
  const b=req.body||{};
  validatePassword(b.password);
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const rawCode=typeof b.code==='string'?b.code.trim():'';
  if(!email||email.length>150||!/^\S+@\S+\.\S+$/.test(email))throw problem(400,'Escribe un correo válido.');
  const norm=normalizeCode(rawCode);
  if(norm.length!==8&&norm.length!==6)throw problem(400,'Escribe tu código de recuperación de 8 caracteres (o 6 dígitos).');
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
