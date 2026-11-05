/* Reglas didácticas compartidas. No contienen soluciones de actividades privadas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RLearn=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const dayKey=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
  function hints(topic,level){
    if(topic==='algebra'){
      const operation=level===1?'Piensa en restar el término que acompaña a x.':level===2?'Usa la división para deshacer la multiplicación de x.':level<=4?'Primero deshaz la suma o resta; después divide por el coeficiente de x.':level===5?'Reúne las x de un lado y los números del otro, aplicando la misma operación a ambos miembros.':level===6?'Puedes dividir primero por el factor exterior para eliminar el paréntesis.':level===7?'Elimina primero la suma exterior y después multiplica por el denominador.':level<=9?'Aísla x² antes de extraer la raíz. Revisa si te piden la raíz positiva.':'Busca dos números que permitan factorizar. Después iguala cada factor a cero.';
      return ['Identifica qué valor de x hace verdadera la igualdad. Cambiar un lado exige cambiar también el otro.',operation,'Comprueba tu candidato sustituyéndolo en la expresión original. Ambos miembros deben dar el mismo valor.'];
    }
    if(topic==='fracciones')return ['Reconoce la operación. El denominador indica en cuántas partes iguales se divide el entero.',level<=2?'Al sumar o restar con igual denominador, opera los numeradores y conserva el denominador.':level===3?'Interpreta la fracción como numerador dividido entre denominador.':level<=5?'Busca un denominador común. Multiplica numerador y denominador por el mismo factor para obtener fracciones equivalentes.':level===6?'Multiplica numeradores entre sí y denominadores entre sí. Puedes simplificar factores antes.':level===7?'Para dividir, invierte la segunda fracción y cambia la división por multiplicación.':level===8?'Convierte el entero en una fracción con el mismo denominador antes de sumar.':'Respeta la jerarquía: resuelve primero el paréntesis y después la multiplicación o división.','Simplifica el resultado si es posible. Comprueba su tamaño aproximado; también se acepta una fracción equivalente.'];
    const formula={1:'Área del rectángulo: A = base × altura.',2:'Perímetro del rectángulo: P = 2(base + altura).',3:'Diámetro del círculo: d = 2r.',4:'Área del triángulo: A = base × altura / 2.',5:'Circunferencia: C = 2πr. Usa el valor de π indicado.',6:'Área del círculo: A = πr². Eleva el radio al cuadrado.',7:'Pitágoras: c² = a² + b². La hipotenusa es el lado mayor.',8:'Volumen del prisma: V = largo × ancho × altura.',9:'Área del trapecio: A = (base mayor + base menor) × altura / 2.',10:'Volumen del cilindro: V = πr²h.'};
    return ['Distingue si buscas longitud, área o volumen. Anota los datos y conserva las unidades.',formula[level]||'Elige la fórmula que corresponde a la figura.','Sustituye los datos y respeta cuadrados y paréntesis. Usa unidades lineales, cuadradas o cúbicas según lo que calcules.'];
  }
  function daily(model,time){const d=model.data(),uid=model.require().id,key=dayKey(time??d.serverNow??Date.now()),activity=d.activities.find(a=>a.owner===uid&&a.dailyKey===key);return {key,activity};}
  function achievements(model){
    const stats=model.stats(),as=stats.visibleActivities,completed=as.filter(a=>a.done),practices=completed.filter(a=>a.mode==='practice'),mastered=new Set(practices.filter(a=>a.lesson&&a.attempts.filter(x=>x.correct).length/a.total>=.8).map(a=>a.lesson));
    const dailyCount=new Set(completed.filter(a=>a.dailyKey).map(a=>a.dailyKey)).size;
    const days=[...new Set(as.flatMap(a=>a.attempts.map(x=>dayKey(x.created))))].sort();let best=0,run=0,previous=null;
    for(const day of days){const current=Date.parse(day+'T12:00:00Z');run=previous!==null&&current-previous===86400000?run+1:1;best=Math.max(best,run);previous=current;}
    return [
      ['first','Primer paso','Termina una práctica personal.',practices.length,1,'book'],
      ['answers','Explorador','Guarda diez respuestas con resultados visibles.',stats.answered,10,'target'],
      ['correct','Ideas claras','Consigue veinte respuestas correctas.',stats.correct,20,'check'],
      ['mastery','Conocimiento firme','Domina tres lecciones: práctica completa con al menos 80% de aciertos.',mastered.size,3,'trophy'],
      ['daily','Reto aceptado','Completa un reto diario.',dailyCount,1,'clock'],
      ['daily7','Siete descubrimientos','Completa retos diarios en siete fechas distintas.',dailyCount,7,'trophy'],
      ['streak','Buen hábito','Practica tres días consecutivos, al menos una vez.',best,3,'clock'],
      ['topics','Sin fronteras','Completa una práctica en cada uno de los tres temas.',new Set(practices.flatMap(a=>a.questions.map(q=>q.topic))).size,3,'book']
    ].map(([id,title,description,current,target,icon])=>({id,title,description,current,target,icon,earned:current>=target})).filter(b=>model.user().role==='student'||!['daily','daily7'].includes(b.id));
  }
  function support(model,group='all'){
    const report=model.report(group),d=model.data();
    return {...report,students:report.students.map(student=>{
      const own=report.deliveries.filter(a=>a.owner===student.id),attempts=own.flatMap(a=>a.attempts.map(x=>({...x,q:a.questions[x.step]})));
      const topics=d.topics.filter(t=>t.active).map(t=>{const rows=attempts.filter(x=>x.q.topic===t.id),correct=rows.filter(x=>x.correct).length,percent=rows.length?Math.round(correct/rows.length*100):null;
        const level=rows.length?Math.max(1,Math.min(10,Math.round(rows.reduce((n,x)=>n+x.q.level,0)/rows.length))):1;
        const lesson=d.lessons.filter(l=>l.active&&l.topic===t.id).sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level)||a.level-b.level)[0];
        return {id:t.id,name:t.name,answered:rows.length,percent,level,lesson,needsSupport:rows.length>=3&&percent<60};
      });
      const weak=topics.filter(t=>t.needsSupport),reason=student.overdue?student.reason:weak.length?'Conviene reforzar '+weak.map(t=>t.name).join(', ')+'.':student.reason;
      return {...student,reason,topics,lastAnswer:attempts.length?Math.max(...attempts.map(x=>x.created)):null,priority:student.overdue>0||weak.length>0||student.needsSupport};
    }).sort((a,b)=>Number(b.priority)-Number(a.priority)||b.overdue-a.overdue||a.name.localeCompare(b.name))};
  }
  return {dayKey,hints,daily,achievements,support};
});
