const PDFDocument=require('pdfkit'),path=require('node:path');
const problem=(status,message)=>Object.assign(Error(message),{status});
const clean=x=>String(x??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
async function report(model,query={},time=Date.now()){
 const d=model.data(),actor=model.require(),mode=query.tipo||'personal';let title,subtitle,headers,widths,rows;
 const score=a=>{if(!model.released(a))return 'Por publicar';const earned=a.attempts.reduce((n,x)=>n+(x.correct?(a.questions[x.step].points??1):0),0),total=a.questions.reduce((n,q)=>n+(q.points??1),0);return total?(earned/total*10).toFixed(1)+'/10':'—';};
 if(mode==='personal'){
  title='Mi progreso';subtitle=actor.name+' · '+actor.email;headers=['Actividad','Fecha','Estado','Calificación'];widths=[210,110,100,80];
  rows=d.activities.filter(a=>a.owner===actor.id).map(a=>[d.tasks.find(t=>t.id===a.task)?.title||d.lessons.find(l=>l.id===a.lesson)?.title||({diagnostic:'Evaluación inicial',challenge:'Desafío',practice:'Práctica'}[a.mode]||a.mode),new Date(a.created).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'}),a.done?'Completada':'En curso',a.done?score(a):'Pendiente']);
 }else if(mode==='grupo'){
  if(actor.role==='student')throw problem(403,'El reporte de grupo corresponde al docente.');model.manager();const group=query.grupo||'all';if(group!=='all')model.group(group,true);const r=model.report(group);title='Seguimiento de estudiantes';subtitle=group==='all'?'Grupos de '+actor.name:model.group(group,true).name;headers=['Estudiante','Entregadas','Pendientes','Promedio'];widths=[260,80,80,80];rows=r.students.map(u=>[u.name,u.completed,u.pending,u.grade==null?'Sin resultados':u.grade+'/10']);
 }else if(mode==='actividad'){
  const a=model.activity(query.id);title=d.tasks.find(t=>t.id===a.task)?.title||'Detalle de actividad';subtitle=(d.users.find(u=>u.id===a.owner)?.name||actor.name)+' · '+(a.done?'Completada':'En curso')+' · '+(a.done?score(a):'Sin entrega final');
  headers=['Pregunta','Respuesta','Resultado'];widths=[310,110,80];
  if(!model.released(a))rows=[['Los resultados aún no se publican.','—','Pendiente']];
  else if(!a.done&&a.owner===actor.id)rows=[['Termina la actividad para descargar la revisión completa.','—','En curso']];
  else rows=model.activityReview(a.id).map(r=>[(r.question.originalNumber||r.index+1)+'. '+r.question.prompt,r.attempt?require('./espacio-motor').engine().api.answerLabel(r.question,r.attempt.answer):'Sin responder',r.attempt?.correct?'Correcta':'Por reforzar']);
 }else throw problem(400,'Tipo de reporte no válido.');
 const doc=new PDFDocument({size:'A4',margin:45,bufferPages:true,info:{Title:'RETAMAT · '+title,Author:'RETAMAT'}}),chunks=[];
 const result=new Promise((resolve,reject)=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 doc.registerFont('Normal',path.join(__dirname,'fuentes','DejaVuSans.ttf'));doc.registerFont('Bold',path.join(__dirname,'fuentes','DejaVuSans-Bold.ttf'));
 function heading(){doc.rect(0,0,doc.page.width,12).fill('#6338d6');doc.font('Bold').fontSize(23).fillColor('#101b35').text('RETAMAT',45,38);doc.fontSize(15).text(title,45,76,{width:500});doc.font('Normal').fontSize(9).fillColor('#535d73').text(clean(subtitle),45,doc.y+8,{width:500});doc.text('Generado: '+new Date(time).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}),45,doc.y+9,{width:500});doc.y+=18;}
 function header(){const y=doc.y;doc.rect(45,y,500,28).fill('#101b35');let x=45;headers.forEach((h,i)=>{doc.font('Bold').fontSize(9).fillColor('white').text(h,x+8,y+8,{width:widths[i]-16,lineBreak:false});x+=widths[i];});doc.y=y+28;}
 heading();header();if(!rows.length)rows=[headers.map((_,i)=>i===0?'Todavía no hay registros para este reporte.':'—')];
 rows.forEach((row,index)=>{doc.font('Normal').fontSize(9);const values=row.map(clean),height=Math.max(34,...values.map((v,i)=>doc.heightOfString(v,{width:widths[i]-16})+18));if(doc.y+height>doc.page.height-65){doc.addPage();heading();header();}const y=doc.y;doc.rect(45,y,500,height).fill(index%2?'#ffffff':'#f3f2fb');let x=45;values.forEach((value,i)=>{doc.fillColor('#101b35').font('Normal').fontSize(9).text(value,x+8,y+8,{width:widths[i]-16});x+=widths[i];});doc.y=y+height;});
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);const oldBottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.font('Normal').fontSize(8).fillColor('#626b80').text('RETAMAT · Reporte educativo',45,doc.page.height-38,{lineBreak:false});doc.text('Página '+(i+1)+' de '+pages.count,410,doc.page.height-38,{lineBreak:false,width:135,align:'right'});doc.page.margins.bottom=oldBottom;}
 doc.end();return result;
}
module.exports={report};
