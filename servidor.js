const express = require('express');
const path = require('node:path');
const {randomBytes, randomUUID, pbkdf2, timingSafeEqual, createHash} = require('node:crypto');
const {promisify} = require('node:util');
const derive = promisify(pbkdf2);
const HASH_ITERATIONS = 600000;
const {SCHEMA,mountAula}=require('./aula');
const {PRACTICE_SCHEMA,mountLessons}=require('./lecciones');
const {GROUP_TABLES,mountGroups}=require('./grupos');
const {ACTIVITY_TABLES,mountActivities}=require('./actividades');
const {ADMIN_TABLES,mountAdmin,TABLE_NAMES}=require('./admin');
const {SPACE_TABLES,mountSpace}=require('./espacio');
const {FILE_TABLES,mountLive,mountExtras}=require('./mejoras');
const {RECOVERY_TABLES,mountRecovery,generateBackupCode,normalizeCode}=require('./recuperacion-correo');
const CORE_TABLES=[['roles',`CREATE TABLE IF NOT EXISTS roles (codigo VARCHAR(20) PRIMARY KEY,nombre VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`],['usuarios',`CREATE TABLE IF NOT EXISTS usuarios (id VARCHAR(100) PRIMARY KEY,nombre VARCHAR(80) NOT NULL,correo VARCHAR(150) NOT NULL UNIQUE,rol VARCHAR(20) NOT NULL,activo BOOLEAN NOT NULL DEFAULT TRUE,hash_clave CHAR(64) NOT NULL,sal CHAR(32) NOT NULL,version_acceso INT UNSIGNED NOT NULL DEFAULT 0,fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol) REFERENCES roles(codigo)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`]];

// Las sesiones viven en este proceso: reiniciar Node cierra todas las sesiones.
const SESSION_MS = 8 * 60 * 60 * 1000;
const COOKIE = 'retamat_session';
const cookieOptions = {httpOnly:true, sameSite:'strict', path:'/', secure:false}; // HTTP local en 127.0.0.1
const digest = token => createHash('sha256').update(token).digest('hex');
async function prepareTables(pool) {
  // Los nombres son constantes internas; no provienen de solicitudes del navegador.
  for (const [table,sql] of [...CORE_TABLES,['diagnosticos',SCHEMA],['practicas',PRACTICE_SCHEMA],...GROUP_TABLES,...ACTIVITY_TABLES,...ADMIN_TABLES,...SPACE_TABLES,...FILE_TABLES,...RECOVERY_TABLES]) {
    try { await pool.execute('SELECT 1 FROM '+table+' LIMIT 0'); }
    catch(error) { if(error.code !== 'ER_NO_SUCH_TABLE') throw error; await pool.execute(sql); if(table==='roles')await pool.execute("INSERT IGNORE INTO roles (codigo,nombre) VALUES ('student','Estudiante'),('teacher','Docente'),('admin','Administrador')"); }
  }
}
function createApp(conexion, {now = Date.now, legacy = false, mailer = undefined, liveHeartbeatMs = 15000} = {}) {
  const sessions = new Map(), limits = new Map();
  function clean() {
    const t = now();
    for (const [key,value] of sessions) if (value.expires <= t) sessions.delete(key);
    for (const [key,value] of limits) if (value.expires <= t) limits.delete(key);
  }
  function token(req) {
    const match = (req.headers.cookie || '').match(/(?:^|;\s*)retamat_session=([a-f0-9]{64})(?:;|$)/);
    return match ? match[1] : '';
  }
  function rejectSession(req,res) {
    const raw = token(req); if (raw) sessions.delete(digest(raw));
    res.clearCookie(COOKIE,cookieOptions);
    return res.status(401).json({mensaje:'Inicia sesión para continuar.'});
  }
  async function currentUser(req,res,next) {
    clean();
    const raw = token(req), session = raw && sessions.get(digest(raw));
    if (!session) return rejectSession(req,res);
    try {
      const [rows] = await conexion.execute('SELECT id,nombre,correo,rol,activo,version_acceso FROM usuarios WHERE id = ? LIMIT 1',[session.id]);
      const u = rows[0];
      if (!u || !u.activo || u.version_acceso !== session.version) return rejectSession(req,res);
      req.user = {id:u.id,name:u.nombre,email:u.correo,role:u.rol};
      req.authVersion=u.version_acceso;
      next();
    } catch(error) {
      console.error('Error de sesión:',error.code || 'SESION');
      res.status(503).json({mensaje:'No se pudo verificar tu sesión. Inténtalo de nuevo.'});
    }
  }
  function authLimit(req,res,next) {
    clean();
    const key = req.ip || 'local';
    let entry = limits.get(key);
    if (!entry) {
      if (limits.size >= 1000) return res.status(429).json({mensaje:'Espera unos minutos antes de volver a intentar.'});
      entry = {count:0,expires:now()+15*60*1000}; limits.set(key,entry);
    }
    if (++entry.count > 20) {
      res.set('Retry-After',String(Math.ceil((entry.expires-now())/1000)));
      return res.status(429).json({mensaje:'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'});
    }
    next();
  }
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/auth',express.json({limit:'8kb'}));
  app.use(express.json({limit:legacy?'8kb':'8mb'}));
  app.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    res.set('X-Content-Type-Options','nosniff');
    res.set('X-Frame-Options','DENY');
    // No se admiten formularios externos ni peticiones desde otro origen.
   // No se admiten formularios externos ni peticiones desde otro origen.
    const originOk = !req.headers.origin || req.headers.origin === 'http://127.0.0.1:3001' || (req.headers.host && req.headers.origin.includes(req.headers.host));
    if (req.method === 'POST' &&
        (!originOk || req.headers['sec-fetch-site'] === 'cross-site' || !req.is('application/json'))) {
      return res.status(403).json({mensaje:'Abre el formulario en la aplicación e inténtalo de nuevo.'});
    }
    next();
  });
  if (!legacy) {
    app.get('/manifest.webmanifest',(req,res)=>res.type('application/manifest+json').sendFile(path.join(__dirname,'public','manifest.webmanifest')));
    app.get('/sw.js',(req,res)=>res.set('Service-Worker-Allowed','/').type('application/javascript').sendFile(path.join(__dirname,'public','sw.js')));
    app.get('/offline.html',(req,res)=>res.sendFile(path.join(__dirname,'public','offline.html')));
    app.get(['/', '/index.html'],(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
    const aliases={login:'home',registro:'register',cuenta:'profile',aula:'home',lecciones:'topics',grupos:'groups',docente:'groups',actividades:'calendar',admin:'users'};
    for(const [route,view]of Object.entries(aliases))app.get('/'+route,(req,res)=>res.redirect('/#'+view));
    app.use('/assets',express.static(path.join(__dirname,'public','assets')));
    app.locals.live=mountLive(app,currentUser,{heartbeatMs:liveHeartbeatMs});
    const space=mountSpace(app,conexion,currentUser,{now});
    mountExtras(app,conexion,currentUser,space,{now});
    mountRecovery(app,conexion,{now,mailer,currentUser});
    app.use('/api',(req,res,next)=>/^\/(auth|admin|espacio)(\/|$)/.test(req.path)?next():res.status(410).json({mensaje:'Esta ruta ya no está disponible.'}));
  }
  app.get('/', (req,res) => res.redirect('/login'));
  app.get('/login', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
  app.get('/cuenta', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
  app.get('/api/auth/me',currentUser,(req,res) => res.json({user:req.user}));
  app.post('/api/auth/logout',(req,res) => {
    const raw=token(req); if(raw) sessions.delete(digest(raw));
    res.clearCookie(COOKIE,cookieOptions);
    res.json({mensaje:'Sesión cerrada.'});
  });
  app.post('/api/auth/login',authLimit,async (req,res) => {
    const b=req.body || {};
    if (typeof b.email !== 'string' || b.email.trim().length > 150 ||
        typeof b.password !== 'string' || b.password.length < 1 || b.password.length > 128)
      return res.status(400).json({mensaje:'Escribe tu correo y contraseña.'});
    try {
      const [rows] = await conexion.execute('SELECT id,nombre,correo,rol,activo,hash_clave,sal,version_acceso FROM usuarios WHERE correo = ? LIMIT 1',[b.email.trim().toLowerCase()]);
      const u = rows[0];
      const valid = u && /^[a-f0-9]{32}$/i.test(u.sal) && /^[a-f0-9]{64}$/i.test(u.hash_clave);
      // Derivar también para correos desconocidos evita omitir todo el trabajo de PBKDF2.
      const actual = await derive(b.password, valid ? Buffer.from(u.sal,'hex') : Buffer.alloc(16), HASH_ITERATIONS,32,'sha256');
      const expected = valid ? Buffer.from(u.hash_clave,'hex') : Buffer.alloc(32);
      if (!timingSafeEqual(actual,expected) || !valid || !u.activo)
        return res.status(401).json({mensaje:'Correo o contraseña incorrectos, o cuenta no disponible.'});
      if (sessions.size >= 5000) return res.status(503).json({mensaje:'No se pudo abrir otra sesión. Inténtalo más tarde.'});
      const old = token(req); if(old) sessions.delete(digest(old));
      const raw = randomBytes(32).toString('hex');
      sessions.set(digest(raw),{id:u.id,version:u.version_acceso,expires:now()+SESSION_MS});
      limits.delete(req.ip || 'local');
      res.cookie(COOKIE,raw,{...cookieOptions,maxAge:SESSION_MS});
      res.json({mensaje:'Sesión iniciada.',user:{id:u.id,name:u.nombre,email:u.correo,role:u.rol}});
    } catch(error) {
      console.error('Error al entrar:',error.code || 'LOGIN');
      res.status(503).json({mensaje:'No se pudo iniciar sesión. Inténtalo de nuevo.'});
    }
  });
  mountAdmin(app,conexion,currentUser,legacy?{}:{lessonsCount:18,tableNames:[...TABLE_NAMES,...[...SPACE_TABLES,...FILE_TABLES,...RECOVERY_TABLES].map(([name])=>name)]});
  // Compatibilidad disponible solo para las pruebas de las API anteriores.
  if (legacy) {
    mountAula(app,conexion,currentUser);
    mountLessons(app,conexion,currentUser);
    mountGroups(app,conexion,currentUser);
    mountActivities(app,conexion,currentUser,{now});
    app.get('/registro',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
  }
  app.get('/probar-conexion', async (req,res) => {
    try {
      await conexion.execute('SELECT 1');
      res.json({ok:true,mensaje:'Servicio disponible'});
    } catch(error) {
      console.error('Error de base de datos:',error.code || 'CONEXION');
      res.status(500).json({ok:false,mensaje:'Servicio no disponible temporalmente.'});
    }
  });
  app.post('/api/auth/register', authLimit, async (req,res) => {
    const b = req.body || {};
    if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 80)
      return res.status(400).json({mensaje:'Escribe un nombre de 2 a 80 caracteres.'});
    if (typeof b.email !== 'string' || b.email.trim().length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()))
      return res.status(400).json({mensaje:'Escribe un correo válido.'});
    if (typeof b.password !== 'string' || b.password.length < 10 || b.password.length > 128 || !/[A-Za-z]/.test(b.password) || !/\d/.test(b.password))
      return res.status(400).json({mensaje:'La contraseña debe tener de 10 a 128 caracteres, letras y números.'});
    const role = b.role === undefined ? 'student' : b.role;
    if (!['student','teacher'].includes(role))
      return res.status(400).json({mensaje:'Elige Estudiante o Docente. No se crean administradores desde este formulario.'});
    try {
      const id = randomUUID(), salt = randomBytes(16);
      const hash = (await derive(b.password, salt, HASH_ITERATIONS, 32, 'sha256')).toString('hex');
      const name = b.name.trim(), email = b.email.trim().toLowerCase();
      const backupCode = generateBackupCode();
      const backupHash = digest(`${id}:${normalizeCode(backupCode)}`);
      await conexion.execute(
        'INSERT INTO usuarios (id,nombre,correo,rol,activo,hash_clave,sal,version_acceso) VALUES (?,?,?,?,?,?,?,?)',
        [id,name,email,role,true,hash,salt.toString('hex'),0]
      );
      await conexion.execute(
        'INSERT INTO recuperaciones (id,usuario_id,version_acceso,vence_ms,usada) VALUES (?,?,?,?,FALSE)',
        [backupHash,id,0,0]
      );
      res.status(201).json({mensaje:'Cuenta creada. Guarda tu código de recuperación.',user:{id,name,email,role,active:true},backupCode});
    } catch(error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({mensaje:'Ese correo ya tiene una cuenta registrada.'});
      console.error('Error al registrar:',error.code || 'REGISTRO');
      const missing = ['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR','ER_NO_REFERENCED_ROW_2'].includes(error.code);
      res.status(500).json({mensaje:missing?'Revisa las tablas de usuarios y roles.':'No se pudo crear la cuenta en este momento. Inténtalo de nuevo.'});
    }
  });
  app.use((error,req,res,next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({mensaje:'Los datos del formulario son demasiado grandes.'});
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({mensaje:'Los datos enviados no tienen un formato válido.'});
    console.error('Error de solicitud:',error.code || error.name);
    res.status(500).json({mensaje:'No se pudo procesar la solicitud.'});
  });
  return app;
}

if (require.main === module) {
  require('dotenv').config({path:path.join(__dirname,'.env')});
  const mysql = require('mysql2/promise');
  const required = ['DB_HOST','DB_USER','DB_NAME'];
  if (required.some(key => !process.env[key])) {
    console.error('Completa DB_HOST, DB_USER y DB_NAME en el archivo .env junto a servidor.js.');
    process.exitCode = 1;
  } else {
    const ssl = (process.env.DB_HOST || '').includes('tidbcloud') ? {minVersion:'TLSv1.2',rejectUnauthorized:true} : undefined;
    const conexion = mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD || '',database:process.env.DB_NAME,charset:'utf8mb4',connectionLimit:5,ssl});
    prepareTables(conexion).then(() => {
    const port = Number(process.env.PORT || 3001);
    const server = createApp(conexion).listen(port,'0.0.0.0',() => {
      console.log('Prueba de conexión: http://127.0.0.1:3001/probar-conexion');
      console.log('Prueba de conexión: http://127.0.0.1:3001/probar-conexion');
      console.log('RETAMAT completo: http://127.0.0.1:3001');
      console.log('Crear cuenta en MySQL: http://127.0.0.1:3001/registro');
    });
    server.on('error',error => {
      console.error(error.code === 'EADDRINUSE' ? 'El puerto 3001 está ocupado. Detén el servidor anterior con Ctrl + C.' : 'No se pudo iniciar el servidor: ' + error.code);
      conexion.end();process.exitCode = 1;
    });
    }).catch(error => {
      console.error('No se pudo preparar el aula:',error.code || error.name);
      console.error('Revisa MySQL, .env y que las tablas usuarios y roles existan. La cuenta anterior se conserva.');
      conexion.end();process.exitCode=1;
    });
  }
}
module.exports = {createApp,HASH_ITERATIONS,prepareTables};
