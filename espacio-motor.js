const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function engine(now=Date.now){
 class ServerDate extends Date{constructor(...args){super(...(args.length?args:[now()]));}static now(){return now();}}
 const context={window:{},crypto:crypto.webcrypto,TextEncoder,TextDecoder,Blob,Date:ServerDate,RDemoUsers:[]};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'public/assets/matematicas.js'),'utf8'),context,{filename:'matematicas.js'});context.RMath=context.window.RMath;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'public/assets/modelo.js'),'utf8'),context,{filename:'modelo.js'});
 const api=context.window.RetamatModel;
 function model(data,actor){
  let raw=JSON.stringify(data);const session=new Map(actor?[['retamat-html-session',JSON.stringify({id:actor.id,version:actor.authVersion||0})]]:[]);
  const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
  const m=new api.Model(storage,{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)});
  return m;
 }
 return {api,math:context.RMath,model};
}
module.exports={engine};
