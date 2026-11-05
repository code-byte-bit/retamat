// Herramienta local del responsable del servidor. No expone una ruta web.
const path=require('node:path');
const readline=require('node:readline');
const {Writable}=require('node:stream');
const {randomBytes,pbkdf2,randomUUID}=require('node:crypto');
const {promisify}=require('node:util');
const {transaction}=require('./aula');
const {ADMIN_TABLES}=require('./admin');
const derive=promisify(pbkdf2),ITERATIONS=600000;
function problem(message){return Object.assign(Error(message),{status:400});}
function normalizedEmail(email){if(typeof email!=='string'||email.trim().length>150||!/^\S+@\S+\.\S+$/.test(email.trim()))throw problem('Indica el correo de tu cuenta: node restablecer-clave.js correo@ejemplo.com');return email.trim().toLowerCase();}
function validatePassword(password){if(typeof password!=='string'||password.length<10||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw problem('Usa una contraseña de 10 a 128 caracteres, con letras y números.');}
async function resetPassword(pool,email,password){
 const correo=normalizedEmail(email);validatePassword(password);
 const salt=randomBytes(16),hash=(await derive(password,salt,ITERATIONS,32,'sha256')).toString('hex');
 return transaction(pool,async db=>{
  const [rows]=await db.execute('SELECT id,nombre,correo,activo FROM usuarios WHERE correo = ? FOR UPDATE',[correo]);
  const u=rows[0];if(!u)throw problem('No se encontró ese correo. Revisa cuál usaste para registrar la cuenta.');
  await db.execute('UPDATE usuarios SET hash_clave = ?, sal = ?, version_acceso = version_acceso + 1 WHERE id = ?',[hash,salt.toString('hex'),u.id]);
  await db.execute('INSERT INTO auditoria (id,actor_id,usuario_id,accion,datos) VALUES (?,?,?,?,?)',[randomUUID(),null,u.id,'clave_restablecida_local',JSON.stringify({origin:'terminal local'})]);
  return {email:u.correo,active:Boolean(u.activo)};
 });
}
function readSecret(prompt,{input=process.stdin,output=process.stdout}={}){
 if(!input.isTTY)return Promise.reject(problem('Ejecuta este comando en una terminal interactiva de Windows o Visual Studio Code.'));
 return new Promise((resolve,reject)=>{
  // readline edita la entrada en modo terminal; su salida se descarta para no mostrar la clave.
  const muted=new Writable({write(chunk,encoding,done){done();}});
  const rl=readline.createInterface({input,output:muted,terminal:true,historySize:0});let settled=false;
  output.write(prompt);
  function finish(error,value){if(settled)return;settled=true;rl.close();muted.end();output.write('\n');if(error)reject(error);else resolve(value);}
  rl.on('SIGINT',()=>finish(problem('Restablecimiento cancelado.')));
  rl.on('close',()=>{if(!settled)finish(problem('Entrada cancelada.'));});
  rl.question('',answer=>finish(null,answer));
 });
}
async function main(){
 const email=normalizedEmail(process.argv[2]);
 if(process.argv.length>3)throw problem('No escribas la contraseña en el comando. Se solicitará de forma oculta después del correo.');
 require('dotenv').config({path:path.join(__dirname,'.env')});
 if(['DB_HOST','DB_USER','DB_NAME'].some(k=>!process.env[k]))throw problem('Completa DB_HOST, DB_USER y DB_NAME en .env.');
 const pool=require('mysql2/promise').createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME,charset:'utf8mb4',connectionLimit:1});
 try{
  try{await pool.execute('SELECT 1 FROM auditoria LIMIT 0');}catch(error){if(error.code!=='ER_NO_SUCH_TABLE')throw error;await pool.execute(ADMIN_TABLES[0][1]);}
  const first=await readSecret('Contraseña nueva (no se mostrará): ');validatePassword(first);
  const second=await readSecret('Repite la contraseña nueva: ');
  if(first!==second)throw problem('Las contraseñas no coinciden. No se cambió la cuenta.');
  const user=await resetPassword(pool,email,first);
  console.log('Contraseña restablecida para '+user.email+'. Las sesiones anteriores se cerraron.');
  console.log(user.active?'Entra en http://127.0.0.1:3001/login con la contraseña nueva.':'La cuenta sigue inactiva. Su activación requiere un administrador.');
 }finally{await pool.end();}
}
if(require.main===module)main().catch(error=>{console.error(error.status?error.message:'No se pudo restablecer la contraseña. Revisa MySQL. Error: '+(error.code||error.name));process.exitCode=1;});
module.exports={resetPassword,readSecret,validatePassword,normalizedEmail,ITERATIONS};
