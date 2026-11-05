/* Adaptador de la interfaz original: sesiones HTTP y operaciones guardadas en MySQL. */
window.RetamatServer = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const methods = ['savePracticeDraft','startSimulation','finishSimulation','startDaily','startSmartReview','nextHint','saveExamDraft','submitExam','attachFile','createGroup','joinGroup','editGroup','setEnrollment','postGroupNotice','saveExercise','createTask','duplicateTask','closeTask','start','answer','startReview','setSettings','bookmark','note','feedback','readNotice','createRoom','joinRoom','controlRoom','chat','editLesson','archiveExercise','export','restore'];
  async function create() {
    if (location.protocol === 'file:') throw Error('Inicia INICIAR_RETAMAT.bat y abre http://127.0.0.1:3001. MySQL necesita el servidor encendido.');
    const model = Object.create(RetamatModel.Model.prototype);
    let cache = {...RetamatModel.seed(),users:[],serverManaged:true,serverView:true}, actor = null, tail = Promise.resolve();
    const pending = new Map();
    let live = null, liveCallback = null, liveTimer = null;
    function stopLive() { clearTimeout(liveTimer); live?.close(); live=null; }
    function ensureLive() {
      if (!actor) {stopLive(); return;}
      if (!liveCallback || live || typeof EventSource === 'undefined') return;
      live=new EventSource('/api/espacio/eventos');
      const update=()=>{clearTimeout(liveTimer);liveTimer=setTimeout(async()=>{if(!actor)return;try{const result=await model.refresh();liveCallback?.(result);}catch{}},250);};
      live.addEventListener('ready',()=>{window.dispatchEvent(new CustomEvent('retamat-live',{detail:'connected'}));update();});
      live.addEventListener('changed',update);
      live.addEventListener('expired',()=>{actor=null;stopLive();window.dispatchEvent(new Event('retamat-session-lost'));});
      live.onerror=()=>{window.dispatchEvent(new CustomEvent('retamat-live',{detail:'reconnecting'}));update();};
    }
    model.watch = callback => { liveCallback=callback;ensureLive(); };
    window.addEventListener('pagehide',stopLive);
    window.addEventListener('pageshow',ensureLive);
    model.pending = 0;
    model.data = () => ({...clone(cache),serverNow:Date.now()+(model.clockOffset||0)});
    model.user = () => actor && clone(cache.users.find(u => u.id === actor.id) || null);
    model.save = model.update = () => { throw Error('Guarda los cambios mediante el servidor.'); };
    model.expireExams = () => {};
    function accept(body) {
      if (body.data) { RetamatModel.validate(body.data); cache = body.data; actor = body.user; model.clockOffset = body.serverNow - Date.now(); ensureLive(); }
    }
    async function request(url, body, {anonymous = false} = {}) {
      let response;
      const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),20000);
      try { response = await fetch(url,{signal:controller.signal,credentials:'same-origin',headers:body === undefined?{}:{'Content-Type':'application/json'},method:body === undefined?'GET':'POST',...(body === undefined?{}:{body:JSON.stringify(body)})}); }
      catch { throw Object.assign(Error('No se pudo contactar al servidor. Comprueba que siga encendido y vuelve a intentar; tu texto pendiente se conserva.'),{network:true}); }
      finally { clearTimeout(timeout); }
      let data; try { data = await response.json(); } catch { throw Object.assign(Error('No se pudo leer la confirmación del servidor. Vuelve a intentar la misma operación.'),{network:true}); }
      accept(data);
      if (!response.ok) {
        if (response.status === 401 && !anonymous) { actor = null; stopLive(); window.dispatchEvent(new Event('retamat-session-lost')); }
        throw Object.assign(Error(data.mensaje || 'No se pudo completar la operación.'),{status:response.status});
      }
      return data;
    }
    function enqueue(fn) {
      model.pending++;
      const result = tail.then(fn); tail = result.catch(() => {});
      return result.finally(() => model.pending--);
    }
    const refresh = () => request('/api/espacio');
    model.refresh = () => enqueue(refresh);
    for (const method of methods) model[method] = (...args) => enqueue(async () => {
      const key = JSON.stringify([actor?.id,method,args]), command = pending.get(key) || {id:crypto.randomUUID(),method,args};
      pending.set(key,command);
      let body;
      try { body = await request('/api/espacio/comando',command); }
      catch(error) { if (!error.network) pending.delete(key); throw error; }
      pending.delete(key); return body.result;
    });
    model.login = (email,password) => enqueue(async () => { await request('/api/auth/login',{email,password},{anonymous:true}); await refresh(); });
    model.register = (name,email,password,role) => enqueue(async () => { await request('/api/auth/register',{name,email,password,role},{anonymous:true}); await request('/api/auth/login',{email,password},{anonymous:true}); await refresh(); });
    model.logout = () => enqueue(async () => { stopLive(); await request('/api/auth/logout',{}); actor = null; cache = {...RetamatModel.seed(),users:[],serverManaged:true,serverView:true}; pending.clear(); });
    async function credentials(url,body) {
      const result = await request(url,body);
      if (result.reauthenticate) { actor = null; stopLive(); window.dispatchEvent(new Event('retamat-session-lost')); }
      else await refresh();
      return result;
    }
    model.profile = (name,current,next) => enqueue(() => credentials('/api/espacio/perfil',{name,current,next}));
    model.resetPassword = (id,current,next) => enqueue(() => credentials('/api/espacio/restablecer',{id,current,next}));
    model.editUser = (id,role,active) => enqueue(() => {
      const target = cache.users.find(u => u.id === id);
      if (!target) throw Error('Cuenta no encontrada.');
      return credentials('/api/admin/usuarios/'+encodeURIComponent(id)+'/actualizar',{role,active,revision:target.authVersion || 0});
    });
    model.recoveryStatus = () => request('/api/auth/recuperacion/estado',undefined,{anonymous:true});
    model.requestRecovery = email => request('/api/auth/recuperacion/solicitar',{email},{anonymous:true});
    model.applyRecovery = (token,password) => request('/api/auth/recuperacion/restablecer',{token,password},{anonymous:true});
    model.studentPreview = id => request('/api/espacio/vista-previa/'+encodeURIComponent(id));
    try { await request('/api/espacio',undefined,{anonymous:true}); } catch(error) { if (error.status !== 401) throw error; }
    return model;
  }
  return {create};
})();
