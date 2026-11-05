const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'.env')});
const mysql=require('mysql2/promise');
const {prepareTables}=require('./servidor');
(async()=>{
 if(!process.env.DB_HOST||!process.env.DB_USER||!process.env.DB_NAME)throw Error('Copia .env.example como .env y configura los datos de tu MySQL.');
 if(!/^[A-Za-z0-9_]{1,64}$/.test(process.env.DB_NAME))throw Error('DB_NAME debe contener únicamente letras, números y guion bajo.');
 const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',charset:'utf8mb4'});
 try{await pool.execute('CREATE DATABASE IF NOT EXISTS `'+process.env.DB_NAME+'` CHARACTER SET utf8mb4');}finally{await pool.end();}
 const db=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME,charset:'utf8mb4'});
 try{await prepareTables(db);console.log('RETAMAT preparado. Se conservaron las cuentas y los registros existentes. Ejecuta npm start.');}finally{await db.end();}
})().catch(error=>{console.error(error.code||error.message);console.error('Revisa MySQL y .env.');process.exitCode=1;});
