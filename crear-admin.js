// Solo se ejecuta en la terminal local, con acceso al archivo .env del servidor.
const path=require('node:path');
const {ADMIN_TABLES,bootstrapAdmin}=require('./admin');
async function main(){
 const email=process.argv[2];
 if(!email){console.error('Uso: node crear-admin.js correo@ejemplo.com');process.exitCode=1;return;}
 require('dotenv').config({path:path.join(__dirname,'.env')});
 if(['DB_HOST','DB_USER','DB_NAME'].some(k=>!process.env[k])){console.error('Completa DB_HOST, DB_USER y DB_NAME en .env.');process.exitCode=1;return;}
 const pool=require('mysql2/promise').createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME,charset:'utf8mb4',connectionLimit:1});
 try{
  try{await pool.execute('SELECT 1 FROM auditoria LIMIT 0');}catch(error){if(error.code!=='ER_NO_SUCH_TABLE')throw error;await pool.execute(ADMIN_TABLES[0][1]);}
  const user=await bootstrapAdmin(pool,email);
  console.log('Primer administrador preparado: '+user.email);
  console.log('Inicia el servidor con node servidor.js y entra con la contraseña que elegiste al registrar esa cuenta.');
  console.log('Panel: http://127.0.0.1:3001/admin');
 }catch(error){console.error(error.status?error.message:'No se pudo preparar el administrador. Error de MySQL: '+(error.code||error.name));process.exitCode=1;}
 finally{await pool.end();}
}
if(require.main===module)main().catch(error=>{console.error('No se pudo ejecutar el comando:',error.code||error.name);process.exitCode=1;});
module.exports={main};
