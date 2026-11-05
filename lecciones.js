const {randomInt,randomUUID}=require('node:crypto');
const {numeric,evaluate,project,transaction}=require('./aula');
const PRACTICE_SCHEMA=`CREATE TABLE IF NOT EXISTS practicas (
 id VARCHAR(100) PRIMARY KEY,
 usuario_id VARCHAR(100) NOT NULL,
 leccion_id VARCHAR(60) NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
 preguntas LONGTEXT NOT NULL,
 respuestas LONGTEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 0,
 aciertos TINYINT UNSIGNED NULL,
 creada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_practicas_usuario_leccion (usuario_id,leccion_id,estado,creada),
 CONSTRAINT fk_practicas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
const LESSONS=[
 {id:'alg-suma',topic:'Álgebra',title:'Despejar una incógnita',stage:'Bases',minutes:8,
  description:'Una ecuación expresa una igualdad. Para encontrar x, aplica la operación contraria en ambos lados.',
  example:'x + 5 = 12',steps:['Resta 5 en ambos lados: x + 5 − 5 = 12 − 5.','Simplifica: x = 7.','Comprueba sustituyendo: 7 + 5 = 12.'],tip:'Si sumas o restas una cantidad, hazlo en ambos lados de la igualdad.'},
 {id:'alg-lineal',topic:'Álgebra',title:'Ecuaciones de dos pasos',stage:'Desarrollo',minutes:10,
  description:'En ax + b = c, primero elimina la suma o resta que acompaña al término con x. Después divide entre su coeficiente.',
  example:'3x + 4 = 19',steps:['Resta 4: 3x = 15.','Divide entre 3: x = 5.','Comprueba: 3(5) + 4 = 19.'],tip:'No dividas solo el número de la derecha: la operación debe aplicarse a ambos lados.'},
 {id:'alg-parentesis',topic:'Álgebra',title:'Ecuaciones con paréntesis',stage:'Aplicación',minutes:12,
  description:'Cuando un factor multiplica todo un paréntesis, puedes dividir primero entre ese factor para simplificar el despeje.',
  example:'2(x + 3) = 16',steps:['Divide entre 2: x + 3 = 8.','Resta 3: x = 5.','Comprueba: 2(5 + 3) = 16.'],tip:'El factor de afuera multiplica a todo el contenido del paréntesis.'},
 {id:'frac-suma',topic:'Fracciones',title:'Sumar con el mismo denominador',stage:'Bases',minutes:8,
  description:'El denominador indica el tamaño de las partes. Si es igual en ambas fracciones, se conserva y se suman los numeradores.',
  example:'2/7 + 3/7 = 5/7',steps:['Comprueba que los denominadores sean iguales: 7 y 7.','Suma los numeradores: 2 + 3 = 5.','Conserva el denominador: 5/7.'],tip:'No sumes los denominadores. Puedes responder con una fracción equivalente o un decimal.'},
 {id:'frac-producto',topic:'Fracciones',title:'Multiplicar fracciones',stage:'Desarrollo',minutes:10,
  description:'Multiplica numerador por numerador y denominador por denominador. Simplifica el resultado si tienen un factor común.',
  example:'2/3 × 3/4 = 1/2',steps:['Multiplica los numeradores: 2 × 3 = 6.','Multiplica los denominadores: 3 × 4 = 12.','Simplifica: 6/12 = 1/2.'],tip:'Las fracciones equivalentes valen lo mismo: 1/2, 2/4 y 0.5 representan la misma cantidad.'},
 {id:'frac-combinada',topic:'Fracciones',title:'Operaciones combinadas',stage:'Aplicación',minutes:12,
  description:'Resuelve primero el paréntesis. Usa un denominador común para sumar fracciones diferentes. Dividir entre un entero equivale a multiplicar por su recíproco.',
  example:'(1/2 + 1/3) ÷ 2 = 5/12',steps:['Convierte a sextos: 1/2 = 3/6 y 1/3 = 2/6.','Suma dentro del paréntesis: 5/6.','Divide entre 2: (5/6)(1/2) = 5/12.'],tip:'No dividas únicamente uno de los sumandos; primero completa la operación del paréntesis.'},
 {id:'geo-rectangulo',topic:'Geometría',title:'Área del rectángulo',stage:'Bases',minutes:8,
  description:'El área mide una superficie. Para un rectángulo se obtiene multiplicando la base por la altura.',
  example:'Base 6 cm y altura 4 cm → área 24 cm²',steps:['Identifica base = 6 cm y altura = 4 cm.','Aplica A = base × altura = 6 × 4.','El resultado es 24 cm².'],tip:'El área usa unidades cuadradas. En el campo de respuesta escribe solo el número.'},
 {id:'geo-circulo',topic:'Geometría',title:'Área del círculo',stage:'Desarrollo',minutes:10,
  description:'El área del círculo es A = πr². El radio es la distancia del centro al borde. En estas prácticas usa siempre π = 3.14.',
  example:'Radio 3 cm → área 28.26 cm²',steps:['Eleva el radio al cuadrado: 3² = 9.','Multiplica por π: 3.14 × 9 = 28.26.','El área es 28.26 cm².'],tip:'Primero eleva el radio al cuadrado y después multiplica por 3.14.'},
 {id:'geo-prisma',topic:'Geometría',title:'Volumen de un prisma rectangular',stage:'Aplicación',minutes:12,
  description:'El volumen mide el espacio que ocupa un cuerpo. En un prisma rectangular, multiplica largo, ancho y alto.',
  example:'Largo 5 cm, ancho 3 cm y alto 4 cm → volumen 60 cm³',steps:['Usa V = largo × ancho × alto.','Multiplica: 5 × 3 × 4 = 60.','El volumen es 60 cm³.'],tip:'No confundas área con volumen: el volumen usa tres dimensiones y unidades cúbicas.'}
];
function generatePractice(id){
 const lesson=LESSONS.find(l=>l.id===id);if(!lesson)throw Error('Lección desconocida');
 const result=[],prompts=new Set();
 while(result.length<6){
  const a=randomInt(2,10),b=randomInt(2,10),x=randomInt(1,13),d=randomInt(3,10),e=randomInt(3,10);
  let prompt,answer,explanation;
  switch(id){
   case 'alg-suma':prompt=`Resuelve: x + ${b} = ${x+b}.`;answer=x;explanation=`Resta ${b}: x = ${x+b} − ${b} = ${x}.`;break;
   case 'alg-lineal':prompt=`Resuelve: ${a}x + ${b} = ${a*x+b}.`;answer=x;explanation=`Resta ${b}: ${a}x = ${a*x}. Divide entre ${a}: x = ${x}.`;break;
   case 'alg-parentesis':prompt=`Resuelve: ${a}(x + ${b}) = ${a*(x+b)}.`;answer=x;explanation=`Divide entre ${a}: x + ${b} = ${x+b}. Resta ${b}: x = ${x}.`;break;
   case 'frac-suma':prompt=`Calcula: ${a}/${d} + ${b}/${d}.`;answer=(a+b)/d;explanation=`Suma numeradores y conserva el denominador: (${a} + ${b})/${d} = ${a+b}/${d}.`;break;
   case 'frac-producto':prompt=`Calcula: ${a}/${d} × ${b}/${e}.`;answer=a*b/(d*e);explanation=`Multiplica numeradores y denominadores: (${a} × ${b})/(${d} × ${e}) = ${a*b}/${d*e}.`;break;
   case 'frac-combinada':prompt=`Calcula: (${a}/${d} + 1/${e}) ÷ ${b}.`;answer=(a*e+d)/(d*e*b);explanation=`Denominador común: ${d*e}. Suma: (${a*e} + ${d})/${d*e} = ${a*e+d}/${d*e}. Divide entre ${b}: ${a*e+d}/${d*e*b}.`;break;
   case 'geo-rectangulo':prompt=`Base ${a} cm y altura ${b} cm. Escribe el área del rectángulo en cm².`;answer=a*b;explanation=`A = base × altura = ${a} × ${b} = ${answer} cm².`;break;
   case 'geo-circulo':prompt=`Radio ${a} cm. Escribe el área del círculo en cm². Usa π = 3.14.`;answer=Number((3.14*a*a).toFixed(2));explanation=`A = 3.14 × ${a}² = 3.14 × ${a*a} = ${answer} cm².`;break;
   case 'geo-prisma':prompt=`Largo ${a} cm, ancho ${b} cm y alto ${x} cm. Escribe el volumen en cm³.`;answer=a*b*x;explanation=`V = largo × ancho × alto = ${a} × ${b} × ${x} = ${answer} cm³.`;break;
  }
  if(prompts.has(prompt))continue;prompts.add(prompt);result.push({topic:lesson.topic,prompt,answer,explanation});
 }
 return result;
}
const attemptView=row=>({...project(row),lessonId:row.leccion_id,lessonTitle:LESSONS.find(l=>l.id===row.leccion_id)?.title||row.leccion_id});
const problem=(status,message)=>Object.assign(Error(message),{status});
function recommend(lessons,diagnostic){
 const available=lessons.filter(l=>!l.completed);if(!available.length)return null;
 if(diagnostic){
  const qs=JSON.parse(diagnostic.preguntas),as=JSON.parse(diagnostic.respuestas),topics={};
  for(const q of evaluate(qs,as)){topics[q.topic]??={correct:0,total:0};topics[q.topic].total++;if(q.correct)topics[q.topic].correct++;}
  const ordered=Object.entries(topics).sort(([,a],[,b])=>a.correct/a.total-b.correct/b.total);
  for(const [topic] of ordered){const l=available.find(l=>l.topic===topic);if(l)return {id:l.id,reason:'En tu última evaluación inicial conviene reforzar '+topic.toLowerCase()+'.'};}
 }
 return {id:available[0].id,reason:'Continúa con la primera lección que aún no has completado.'};
}
function mountLessons(app,pool,currentUser){
 const student=(req,res,next)=>req.user.role==='student'?next():res.status(403).json({mensaje:'Las lecciones y prácticas de esta sección son para estudiantes.'});
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){if(error.status)return res.status(error.status).json({mensaje:error.message});console.error('Error de lecciones:',error.code||error.name);res.status(503).json({mensaje:'No se pudo consultar o guardar la práctica. Revisa MySQL y conserva tus respuestas para volver a intentar.'});}};
 app.get('/api/lecciones',currentUser,student,wrap(async(req,res)=>{
  const [stats]=await pool.execute("SELECT leccion_id, COUNT(*) AS intentos, MAX(aciertos) AS mejor FROM practicas WHERE usuario_id = ? AND estado = 'terminado' GROUP BY leccion_id",[req.user.id]);
  const [pending]=await pool.execute("SELECT id,leccion_id FROM practicas WHERE usuario_id = ? AND estado = 'pendiente'",[req.user.id]);
  const [history]=await pool.execute('SELECT id,leccion_id,estado,aciertos,creada FROM practicas WHERE usuario_id = ? ORDER BY creada DESC,id DESC LIMIT 20',[req.user.id]);
  const [diagnostics]=await pool.execute("SELECT preguntas,respuestas FROM diagnosticos WHERE usuario_id = ? AND estado = 'terminado' ORDER BY actualizada DESC,id DESC LIMIT 1",[req.user.id]);
  const lessons=LESSONS.map(l=>{const s=stats.find(s=>s.leccion_id===l.id),p=pending.find(p=>p.leccion_id===l.id);return {...l,attempts:Number(s?.intentos||0),best:s?.mejor??null,completed:Number(s?.mejor??0)>=5,pendingId:p?.id??null};});
  res.json({lessons,history,recommended:recommend(lessons,diagnostics[0]),completed:lessons.filter(l=>l.completed).length});
 }));
 app.post('/api/lecciones/:id/practica',currentUser,student,wrap(async(req,res)=>{
  const lesson=LESSONS.find(l=>l.id===req.params.id);if(!lesson)throw problem(404,'No se encontró esa lección.');
  const attempt=await transaction(pool,async db=>{
   await db.execute('SELECT id FROM usuarios WHERE id = ? FOR UPDATE',[req.user.id]);
   const [pending]=await db.execute("SELECT * FROM practicas WHERE usuario_id = ? AND leccion_id = ? AND estado = 'pendiente' LIMIT 1 FOR UPDATE",[req.user.id,lesson.id]);
   if(pending[0])return attemptView(pending[0]);
   const row={id:randomUUID(),usuario_id:req.user.id,leccion_id:lesson.id,preguntas:JSON.stringify(generatePractice(lesson.id)),respuestas:JSON.stringify(Array(6).fill('')),revision:0,aciertos:null,estado:'pendiente'};
   await db.execute('INSERT INTO practicas (id,usuario_id,leccion_id,preguntas,respuestas) VALUES (?,?,?,?,?)',[row.id,row.usuario_id,row.leccion_id,row.preguntas,row.respuestas]);return attemptView(row);
  });res.json({attempt});
 }));
 app.get('/api/practicas/:id',currentUser,student,wrap(async(req,res)=>{
  const [rows]=await pool.execute('SELECT * FROM practicas WHERE id = ? AND usuario_id = ?',[req.params.id,req.user.id]);if(!rows[0])throw problem(404,'No se encontró esa práctica en tu cuenta.');res.json({attempt:attemptView(rows[0])});
 }));
 function save(finish){return wrap(async(req,res)=>{
  const b=req.body||{};
  if(!Array.isArray(b.answers)||b.answers.length!==6||b.answers.some(a=>typeof a!=='string'||a.length>80)||!Number.isInteger(b.revision)||b.revision<0)throw problem(400,'Envía las 6 respuestas y una versión válida.');
  const answers=b.answers.map(a=>a.trim());
  if(answers.some(a=>a!==''&&!Number.isFinite(numeric(a))))throw problem(400,'Responde con números o fracciones, sin unidades.');
  if(finish&&answers.some(a=>a===''))throw problem(400,'Contesta las 6 preguntas antes de entregar.');
  const attempt=await transaction(pool,async db=>{
   const [rows]=await db.execute('SELECT * FROM practicas WHERE id = ? AND usuario_id = ? FOR UPDATE',[req.params.id,req.user.id]);const row=rows[0];if(!row)throw problem(404,'No se encontró esa práctica en tu cuenta.');
   if(row.estado==='terminado')return attemptView(row);
   if(row.revision!==b.revision)throw problem(409,'La práctica cambió en otra pestaña. Copia tus respuestas y vuelve a abrirla antes de guardar.');
   const score=finish?evaluate(JSON.parse(row.preguntas),answers).filter(q=>q.correct).length:null,state=finish?'terminado':'pendiente';
   await db.execute('UPDATE practicas SET respuestas = ?, estado = ?, aciertos = ?, revision = revision + 1 WHERE id = ? AND usuario_id = ?',[JSON.stringify(answers),state,score,row.id,req.user.id]);
   return attemptView({...row,respuestas:JSON.stringify(answers),estado:state,aciertos:score,revision:row.revision+1});
  });res.json({attempt});
 });}
 app.post('/api/practicas/:id/guardar',currentUser,student,save(false));
 app.post('/api/practicas/:id/finalizar',currentUser,student,save(true));
}
module.exports={PRACTICE_SCHEMA,LESSONS,generatePractice,recommend,mountLessons};
