const {randomInt,randomUUID}=require('node:crypto');
const SCHEMA=`CREATE TABLE IF NOT EXISTS diagnosticos (
 id VARCHAR(100) PRIMARY KEY,
 usuario_id VARCHAR(100) NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
 preguntas LONGTEXT NOT NULL,
 respuestas LONGTEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 0,
 aciertos TINYINT UNSIGNED NULL,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_diagnosticos_usuario_estado (usuario_id,estado,creada),
 CONSTRAINT fk_diagnosticos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
function numeric(text){
 if(typeof text!=='string'||text.length>80)return NaN;
 const s=text.trim().replace(',','.');
 const num='[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
 if(new RegExp('^'+num+'$').test(s))return Number(s);
 if(new RegExp('^'+num+'\\s*/\\s*'+num+'$').test(s)){
  const [a,b]=s.split('/').map(Number);return b===0?NaN:a/b;
 }
 return NaN;
}
function questions(){
 const a=randomInt(2,10),b=randomInt(2,10),x=randomInt(2,10),y=randomInt(2,10),z=randomInt(2,10),w=randomInt(2,10),d=randomInt(3,10),r=randomInt(2,9);
 const q=(topic,prompt,answer,explanation)=>({topic,prompt,answer,explanation});
 return [
  q('Álgebra',`Resuelve: x + ${b} = ${x+b}. ¿Cuánto vale x?`,x,`Resta ${b} a ambos lados: x = ${x+b} − ${b} = ${x}.`),
  q('Álgebra',`Resuelve: ${a}x = ${a*y}.`,y,`Divide ambos lados entre ${a}: x = ${a*y}/${a} = ${y}.`),
  q('Álgebra',`Resuelve: ${a}x + ${b} = ${a*z+b}.`,z,`Resta ${b} y divide entre ${a}: x = ${z}.`),
  q('Álgebra',`Si x² = ${w*w}, escribe la raíz positiva.`,w,`La raíz positiva de ${w*w} es ${w}, porque ${w} × ${w} = ${w*w}.`),
  q('Fracciones',`Calcula: 1/${d} + 2/${d}.`,3/d,`Conserva el denominador y suma numeradores: (1 + 2)/${d} = 3/${d}.`),
  q('Fracciones',`Calcula: ${a*d}/${d}.`,a,`Divide ${a*d} entre ${d}: el resultado es ${a}.`),
  q('Fracciones',`Calcula: 1/2 × ${b}/3.`,b/6,`Multiplica numeradores y denominadores: ${b}/6. Puedes simplificar la fracción.`),
  q('Geometría',`Un rectángulo tiene base ${a} cm y altura ${b} cm. Escribe su área en cm².`,a*b,`Área = base × altura = ${a} × ${b} = ${a*b} cm².`),
  q('Geometría',`Un círculo tiene radio ${r} m. Escribe su diámetro en metros.`,2*r,`Diámetro = 2 × radio = 2 × ${r} = ${2*r} m.`),
  q('Geometría',`Un triángulo tiene base ${a} cm y altura ${b} cm. Escribe su área en cm².`,a*b/2,`Área = (base × altura)/2 = (${a} × ${b})/2 = ${a*b/2} cm².`)
 ];
}
function evaluate(qs,answers){
 return qs.map((q,i)=>{
  const value=numeric(answers[i]);
  return {...q,response:answers[i],correct:Number.isFinite(value)&&Math.abs(value-q.answer)<=1e-6*Math.max(1,Math.abs(q.answer))};
 });
}
function project(row){
 const qs=JSON.parse(row.preguntas),answers=JSON.parse(row.respuestas);
 const finished=row.estado==='terminado';
 return {id:row.id,state:row.estado,revision:row.revision,created:row.creada,updated:row.actualizada,
  questions:finished?evaluate(qs,answers):qs.map(({topic,prompt})=>({topic,prompt})),
  answers,score:finished?row.aciertos:null};
}
function problem(status,message){return Object.assign(Error(message),{status});}
async function transaction(pool,fn){
 const db=await pool.getConnection();
 try{await db.beginTransaction();const result=await fn(db);await db.commit();return result;}
 catch(error){try{await db.rollback();}catch{}throw error;}
 finally{db.release();}
}
function mountAula(app,pool,currentUser){
 const student=(req,res,next)=>req.user.role==='student'?next():res.status(403).json({mensaje:'Esta sección es para estudiantes. El panel docente está en /docente.'});
 const wrap=fn=>async(req,res)=>{
  try{await fn(req,res);}
  catch(error){
   if(error.status)return res.status(error.status).json({mensaje:error.message});
   console.error('Error del aula:',error.code||error.name);
   res.status(503).json({mensaje:'No se pudo guardar o consultar el aula. Revisa MySQL y vuelve a intentar; conserva tus respuestas.'});
  }
 };
 app.get('/api/aula/resumen',currentUser,student,wrap(async(req,res)=>{
  const [history]=await pool.execute('SELECT id,estado,aciertos,creada,actualizada FROM diagnosticos WHERE usuario_id = ? ORDER BY creada DESC,id DESC LIMIT 20',[req.user.id]);
  const [totals]=await pool.execute("SELECT COUNT(*) AS total, MAX(aciertos) AS mejor FROM diagnosticos WHERE usuario_id = ? AND estado = 'terminado'",[req.user.id]);
  res.json({history,total:Number(totals[0].total),best:totals[0].mejor});
 }));
 app.post('/api/aula/diagnostico',currentUser,student,wrap(async(req,res)=>{
  const attempt=await transaction(pool,async db=>{
   // Serializa los inicios de un mismo usuario para reutilizar su intento pendiente.
   await db.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);
   const [pending]=await db.execute("SELECT * FROM diagnosticos WHERE usuario_id = ? AND estado = 'pendiente' LIMIT 1 FOR UPDATE",[req.user.id]);
   if(pending.length)return project(pending[0]);
   const row={id:randomUUID(),usuario_id:req.user.id,estado:'pendiente',preguntas:JSON.stringify(questions()),respuestas:JSON.stringify(Array(10).fill('')),revision:0,aciertos:null};
   await db.execute('INSERT INTO diagnosticos (id,usuario_id,preguntas,respuestas) VALUES (?,?,?,?)',[row.id,row.usuario_id,row.preguntas,row.respuestas]);
   return project(row);
  });
  res.json({attempt});
 }));
 app.get('/api/aula/diagnostico/:id',currentUser,student,wrap(async(req,res)=>{
  const [rows]=await pool.execute('SELECT * FROM diagnosticos WHERE id = ? AND usuario_id = ?',[req.params.id,req.user.id]);
  if(!rows[0])throw problem(404,'No se encontró esa evaluación en tu cuenta.');
  res.json({attempt:project(rows[0])});
 }));
 function save(finish){return wrap(async(req,res)=>{
  const b=req.body||{};
  if(!Array.isArray(b.answers)||b.answers.length!==10||b.answers.some(a=>typeof a!=='string'||a.length>80)||!Number.isInteger(b.revision)||b.revision<0)
   throw problem(400,'Envía las 10 respuestas y una versión válida.');
  const answers=b.answers.map(a=>a.trim());
  if(answers.some(a=>a!==''&&!Number.isFinite(numeric(a))))throw problem(400,'Usa números o fracciones como 1/2, sin unidades.');
  if(finish&&answers.some(a=>a===''))throw problem(400,'Contesta las 10 preguntas antes de entregar.');
  const attempt=await transaction(pool,async db=>{
   const [rows]=await db.execute('SELECT * FROM diagnosticos WHERE id = ? AND usuario_id = ? FOR UPDATE',[req.params.id,req.user.id]);
   const row=rows[0];if(!row)throw problem(404,'No se encontró esa evaluación en tu cuenta.');
   if(row.estado==='terminado')return project(row); // Reintento de entrega: devuelve el resultado ya guardado.
   if(row.revision!==b.revision)throw problem(409,'Esta evaluación cambió en otra pestaña. Copia tus respuestas y abre de nuevo el intento antes de continuar.');
   const score=finish?evaluate(JSON.parse(row.preguntas),answers).filter(q=>q.correct).length:null;
   const state=finish?'terminado':'pendiente';
   await db.execute('UPDATE diagnosticos SET respuestas = ?, estado = ?, aciertos = ?, revision = revision + 1 WHERE id = ? AND usuario_id = ?',[JSON.stringify(answers),state,score,row.id,req.user.id]);
   return project({...row,respuestas:JSON.stringify(answers),estado:state,aciertos:score,revision:row.revision+1});
  });
  res.json({attempt});
 });}
 app.post('/api/aula/diagnostico/:id/guardar',currentUser,student,save(false));
 app.post('/api/aula/diagnostico/:id/finalizar',currentUser,student,save(true));
}
module.exports={SCHEMA,numeric,questions,evaluate,project,mountAula,transaction};
