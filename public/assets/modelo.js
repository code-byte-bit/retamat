/* Modelo de lectura compartido. En esta edición el servidor valida y guarda las operaciones. */
window.RetamatModel = (() => {
  const KEY = 'retamat-html-v1',
    SESSION = 'retamat-html-session';
  const clone = x => JSON.parse(JSON.stringify(x));
  const id = () => crypto.randomUUID();
  const need = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const text = (x, min = 1, max = 200) => {
    need(typeof x === 'string' && x.trim().length >= min && x.trim().length <= max, `Escribe entre ${min} y ${max} caracteres.`);
    return x.trim();
  };
  const integer = (x, min, max) => {
    const n = Number(x);
    need(Number.isInteger(n) && n >= min && n <= max, `Usa un número entero entre ${min} y ${max}.`);
    return n;
  };
  const date = x => {
    const n = Date.parse(x);
    need(Number.isFinite(n), 'Selecciona una fecha válida.');
    return n;
  };
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  async function passwordHash(password, salt) {
    need(crypto.subtle, 'Este navegador no tiene disponible la función criptográfica necesaria.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bytes = Uint8Array.from(salt.match(/.{2}/g), x => parseInt(x, 16));
    return hex(await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: bytes,
      iterations: 120000,
      hash: 'SHA-256'
    }, key, 256));
  }
  const seed = () => ({
    format: 'RETAMAT_HTML',
    version: 1,
    revision: 0,
    users: clone(RDemoUsers),
    topics: clone(RMath.baseTopics).map(t => ({
      ...t,
      active: true
    })),
    lessons: RMath.baseLessons.map((l, i) => ({
      id: 'lesson-' + (i + 1),
      topic: l[0],
      title: l[1],
      level: l[2],
      concept: l[3],
      example: l[4],
      steps: l[5],
      count: 6,
      active: true
    })),
    groups: [],
    tasks: [],
    activities: [],
    rooms: [],
    exercises: [],
    notes: [],
    notifications: [],
    settings: {}
  });
  function validExtras(q) {
    const type = q.type || 'number',
      points = q.points ?? 1;
    if (!['number', 'choice', 'boolean', 'image'].includes(type) || !Number.isFinite(points) || points < .25 || points > 100) return false;
    if (type === 'choice' && (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || new Set(q.options).size !== q.options.length || !q.options.every(x => typeof x === 'string' && x.trim().length > 0 && x.length <= 200) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || q.tolerance !== 0)) return false;
    if (type === 'boolean' && (![0, 1].includes(q.answer) || q.tolerance !== 0)) return false;
    if (q.media) {
      if (typeof q.media.alt !== 'string' || !q.media.alt.trim() || q.media.alt.length > 400) return false;
      if (q.media.kind === 'upload') {
        if (typeof q.media.src !== 'string' || q.media.src.length > 550000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(q.media.src)) return false;
      } else if (!['rectangle', 'circle', 'fraction', 'equation'].includes(q.media.kind) || !Number.isFinite(q.media.a) || !Number.isFinite(q.media.b) || q.media.a < 1 || q.media.a > 100 || q.media.b < 1 || q.media.b > 100 || q.media.kind === 'fraction' && (!Number.isInteger(q.media.a) || !Number.isInteger(q.media.b) || q.media.a > q.media.b || q.media.b > 12)) return false;
    }
    return type !== 'image' || !!q.media;
  }
  function answerLabel(q, value = q.answer) {
    const n = Number(value);
    return q.type === 'choice' ? q.options[n] ?? String(value) : q.type === 'boolean' ? n === 1 ? 'Verdadero' : n === 0 ? 'Falso' : String(value) : String(value);
  }
  function scoreInfo(a) {
    const total = a.questions.reduce((sum, q) => sum + (q.points ?? 1), 0) + Math.max(0, a.total - a.questions.length),
      earned = a.attempts.reduce((sum, x) => sum + (x.correct ? a.questions[x.step].points ?? 1 : 0), 0);
    return {
      earned: Number(earned.toFixed(2)),
      total: Number(total.toFixed(2)),
      percent: total ? Math.round(earned / total * 100) : 0,
      grade: total ? Math.round(earned / total * 100) / 10 : 0
    };
  }
  function resultsVisible(a, user, data) {
    if(a.simulation)return a.owner===user.id && (a.done || a.deadline<=(data.serverView&&Number.isFinite(data.serverNow)?data.serverNow:Date.now()));
    const task = data.tasks.find(t => t.id === a.task);
    return !task?.exam || a.owner !== user.id && user.role !== 'student' || task.reveal && (data.serverView && Number.isFinite(data.serverNow) ? data.serverNow : Date.now()) >= task.due;
  }
  function validate(d) {
    need(d && d.format === 'RETAMAT_HTML' && d.version === 1, 'Este archivo no es un respaldo de la edición HTML de RETAMAT.');
    need(Number.isSafeInteger(d.revision) && d.revision >= 0, 'Revisión de respaldo no válida.');
    for (const k of ['users', 'topics', 'lessons', 'groups', 'tasks', 'activities', 'rooms', 'exercises', 'notes', 'notifications']) need(Array.isArray(d[k]) && d[k].length <= 20000, 'El respaldo contiene una colección no válida.');
    need(d.settings && typeof d.settings === 'object' && !Array.isArray(d.settings), 'Preferencias no válidas.');
    for (const key of ['users', 'topics', 'lessons', 'groups', 'tasks', 'activities', 'rooms', 'exercises']) {
      need(d[key].every(x => x && typeof x.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(x.id) && !['__proto__', 'constructor', 'prototype'].includes(x.id)) && new Set(d[key].map(x => x.id)).size === d[key].length, 'Identificadores repetidos o inválidos.');
    }
    const users = new Set(d.users.map(x => x.id)),
      topics = new Set(d.topics.map(x => x.id)),
      groups = new Set(d.groups.map(x => x.id)),
      tasks = new Set(d.tasks.map(x => x.id)),
      rooms = new Set(d.rooms.map(x => x.id));
    for (const u of d.users) need(typeof u.name === 'string' && typeof u.email === 'string' && ['student', 'teacher', 'admin'].includes(u.role) && typeof u.active === 'boolean' && /^[a-f0-9]{32}$/.test(u.salt) && /^[a-f0-9]{64}$/.test(u.password), 'Cuenta no válida.');
    for (const u of d.users) need(u.authVersion === undefined || Number.isSafeInteger(u.authVersion) && u.authVersion >= 0, 'Versión de cuenta no válida.');
    need((d.serverView === true || new Set(d.users.map(x => x.email)).size === d.users.length) && (d.serverManaged === true || d.users.some(x => x.role === 'admin' && x.active)), 'Falta un administrador activo o hay correos repetidos.');
    for (const l of d.lessons) need(topics.has(l.topic) && Array.isArray(l.steps) && typeof l.title === 'string' && typeof l.concept === 'string' && typeof l.example === 'string' && Number.isInteger(l.level) && l.level >= 1 && l.level <= 10, 'Lección no válida.');
    for (const g of d.groups) need(users.has(g.owner) && Array.isArray(g.members) && g.members.every(m => users.has(m)) && typeof g.name === 'string' && /^[A-F0-9]{8,12}$/.test(g.code), 'Grupo no válido.');
    for (const g of d.groups) need((g.enrollmentOpen === undefined || typeof g.enrollmentOpen === 'boolean') && (g.description === undefined || typeof g.description === 'string' && g.description.length <= 1000), 'Configuración del grupo no válida.');
    const validQ = q => q && typeof q.prompt === 'string' && typeof q.instruction === 'string' && typeof q.explanation === 'string' && Number.isFinite(q.answer) && validExtras(q) && Number.isFinite(q.tolerance) && q.tolerance >= 0 && q.tolerance <= 1 && Array.isArray(q.solution_steps) && q.solution_steps.length >= 2 && q.solution_steps.length <= 12 && q.solution_steps.every(s => typeof s === 'string') && topics.has(q.topic) && Number.isInteger(q.level) && q.level >= 1 && q.level <= 10;
    for (const e of d.exercises) need(users.has(e.owner) && validQ(e), 'Ejercicio no válido.');
    for (const t of d.tasks) need(groups.has(t.group) && Number.isFinite(t.due) && typeof t.title === 'string' && typeof t.instructions === 'string' && Array.isArray(t.questions) && t.questions.length >= 3 && t.questions.length <= 8 && t.questions.every(validQ) && typeof t.active === 'boolean' && (!t.exam || Number.isFinite(t.opens) && Number.isFinite(t.duration) && t.duration >= 1 && t.duration <= 180 && t.opens < t.due), 'Actividad asignada no válida.');
    for (const room of d.rooms) need(users.has(room.owner) && typeof room.name === 'string' && Array.isArray(room.members) && room.members.every(m => users.has(m)) && Array.isArray(room.questions) && room.questions.every(validQ) && Array.isArray(room.messages) && ['waiting', 'active', 'closed'].includes(room.status), 'Sala no válida.');
    for (const a of d.activities) need(users.has(a.owner) && (!a.task || tasks.has(a.task)) && (!a.room || rooms.has(a.room)) && Array.isArray(a.questions) && a.questions.every(validQ) && Array.isArray(a.attempts) && a.attempts.length <= a.total && a.questions.length >= a.attempts.length && a.questions.length <= a.total && ['practice', 'diagnostic', 'assignment', 'challenge'].includes(a.mode) && a.attempts.every((x, i) => x.step === i && typeof x.answer === 'string' && typeof x.correct === 'boolean' && Number.isFinite(x.created)) && Number.isInteger(a.total) && a.total >= 3 && a.total <= 10 && typeof a.done === 'boolean', 'Entrega no válida.');
    for (const a of d.activities) need((a.review === undefined || typeof a.review === 'boolean') && (!a.review || a.mode === 'practice' && !a.task && !a.room && Number.isInteger(a.reviewOriginals) && a.reviewOriginals >= 1 && a.reviewOriginals <= a.total), 'Repaso dirigido no válido.');
    for (const a of d.activities) {
      if (a.simulation !== undefined) need(typeof a.simulation === 'boolean' && (!a.simulation || a.mode === 'practice' && !a.task && !a.room && Number.isFinite(a.deadline) && Number.isInteger(a.simulationMinutes) && a.simulationMinutes >= 1 && a.simulationMinutes <= 90), 'Simulacro no válido.');
      if (a.practiceDraftVersion !== undefined) need(Number.isSafeInteger(a.practiceDraftVersion) && a.practiceDraftVersion >= 0, 'Versión de borrador no válida.');
      if (a.practiceDraft !== undefined) {
        const b=a.practiceDraft;let count=0;
        need(a.mode==='practice' && !a.simulation && !a.task && !a.room && !a.done && b && b.step===a.attempts.length && typeof b.answer==='string' && b.answer.length<=80 && typeof b.work==='string' && b.work.length<=8000 && Number.isFinite(b.updated) && Array.isArray(b.strokes) && b.strokes.length<=80 && b.strokes.every(s=>s && ['#276457','#315ff4','#ae5279'].includes(s.color) && [2,4,7].includes(s.width) && Array.isArray(s.points) && s.points.length>=1 && s.points.length<=1500 && (count+=s.points.length)<=3000 && s.points.every(p=>Array.isArray(p) && p.length===2 && p.every((v,i)=>Number.isFinite(v) && v>=0 && v<=(i?320:900)))), 'Borrador de práctica no válido.');
      }
      if (a.dailyKey !== undefined) need(a.mode === 'practice' && !a.task && !a.room && /^\d{4}-\d{2}-\d{2}$/.test(a.dailyKey) && a.total === 3, 'Reto diario no válido.');
      if (a.smartReview !== undefined) need(typeof a.smartReview === 'boolean' && (!a.smartReview || a.review), 'Repaso inteligente no válido.');
      if (a.hints !== undefined) need(a.mode === 'practice' && !a.task && !a.room && a.hints && typeof a.hints === 'object' && !Array.isArray(a.hints) && Object.entries(a.hints).every(([step,value]) => /^\d+$/.test(step) && Number(step) < a.total && value && Number.isInteger(value.count) && value.count >= 1 && value.count <= 3 && Number.isFinite(value.updated)), 'Pistas no válidas.');
      if (a.examReview) need(a.mode === 'assignment' && d.tasks.some(t => t.id === a.task && t.exam) && Number.isSafeInteger(a.draftVersion) && a.draftVersion >= 0, 'Borrador de examen no válido.');
      if (a.drafts !== undefined) need(a.drafts && typeof a.drafts === 'object' && !Array.isArray(a.drafts) && Object.entries(a.drafts).every(([i,v]) => /^\d+$/.test(i) && Number(i) < a.total && typeof v === 'string' && v.length <= 80), 'Respuestas de borrador no válidas.');
      if (a.examOrder !== undefined) need(Array.isArray(a.examOrder) && a.examOrder.length === a.total && new Set(a.examOrder).size === a.total && a.examOrder.every(i => Number.isInteger(i) && i >= 0 && i < a.total), 'Orden del examen no válido.');
    }
    for (const row of [...d.tasks, ...d.activities]) if (row.attachments !== undefined) need(Array.isArray(row.attachments) && row.attachments.length <= 5 && row.attachments.every(f => f && /^[A-Za-z0-9_-]{1,100}$/.test(f.id) && typeof f.name === 'string' && f.name.length <= 160 && ['application/pdf','image/png','image/jpeg','image/webp'].includes(f.mime) && Number.isInteger(f.size) && f.size > 0 && f.size <= 5242880 && Number.isFinite(f.created)), 'Archivo adjunto no válido.');
    for (const n of d.notes) need(users.has(n.user) && d.lessons.some(l => l.id === n.lesson) && typeof n.text === 'string' && n.text.length <= 6000, 'Apunte no válido.');
    for (const n of d.notifications) need(users.has(n.user) && typeof n.title === 'string' && typeof n.body === 'string' && Array.isArray(n.target) && typeof n.read === 'boolean', 'Aviso no válido.');
    for (const [user, s] of Object.entries(d.settings)) need(users.has(user) && s && typeof s === 'object' && (!s.bookmarks || Array.isArray(s.bookmarks)) && (!s.feedback || typeof s.feedback === 'object'), 'Preferencias de cuenta no válidas.');
    return d;
  }
  class Model {
    constructor(storage = localStorage, session = sessionStorage) {
      this.storage = storage;
      this.session = session;
      if (!storage.getItem(KEY)) this.save(seed());
      this.data();
    }
    data() {
      try {
        return validate(JSON.parse(this.storage.getItem(KEY)));
      } catch (e) {
        throw Error('No se pudieron leer los datos locales. Conserva un respaldo antes de borrar el almacenamiento. ' + e.message);
      }
    }
    save(d) {
      try {
        this.storage.setItem(KEY, JSON.stringify(d));
      } catch {
        throw Error('No se pudo guardar. El navegador puede bloquear el almacenamiento o estar lleno. Exporta un respaldo.');
      }
    }
    update(fn) {
      const d = this.data(),
        r = fn(d);
      d.revision++;
      validate(d);
      this.save(d);
      return r;
    }
    user() {
      const raw = this.session.getItem(SESSION);
      if (!raw) return null;
      let info;
      try {
        info = JSON.parse(raw);
      } catch {
        info = {
          id: raw,
          version: 0
        };
      }
      if (!info || typeof info.id !== 'string') return null;
      return this.data().users.find(u => u.id === info.id && u.active && (u.authVersion || 0) === info.version) || null;
    }
    require() {
      const u = this.user();
      need(u, 'Inicia sesión para continuar.');
      return u;
    }
    manager() {
      const u = this.require();
      need(u.role !== 'student', 'Esta opción corresponde al docente o administrador.');
      return u;
    }
    admin() {
      const u = this.require();
      need(u.role === 'admin', 'Esta opción corresponde al administrador.');
      return u;
    }
    async login(email, password) {
      const u = this.data().users.find(u => u.email === String(email).trim().toLowerCase() && u.active);
      need(u && (await passwordHash(password, u.salt)) === u.password, 'Correo o contraseña incorrectos.');
      this.session.setItem(SESSION, JSON.stringify({
        id: u.id,
        version: u.authVersion || 0
      }));
      return u;
    }
    logout() {
      this.session.removeItem(SESSION);
    }
    async register(name, email, password, role = 'student') {
      need(['student', 'teacher'].includes(role), 'Elige Estudiante o Docente para crear una cuenta.');
      name = text(name, 2, 80);
      email = text(email, 5, 150).toLowerCase();
      need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Escribe un correo válido.');
      need(password.length >= 10 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password), 'Usa de 10 a 128 caracteres, con letras y números.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16))),
        hash = await passwordHash(password, salt);
      const uid = id();
      this.update(d => {
        need(!d.users.some(u => u.email === email), 'Este correo ya tiene una cuenta.');
        d.users.push({
          id: uid,
          name,
          email,
          salt,
          password: hash,
          role,
          active: true
        });
      });
      this.session.setItem(SESSION, JSON.stringify({
        id: uid,
        version: 0
      }));
      return this.user();
    }
    group(gid, manage = false, d = this.data()) {
      const u = this.require(),
        g = d.groups.find(g => g.id === gid);
      need(g, 'Grupo no encontrado.');
      need(u.role === 'admin' || g.owner === u.id || !manage && g.members.includes(u.id), 'Este grupo no pertenece a tu espacio.');
      return g;
    }
    groups() {
      const u = this.require();
      return this.data().groups.filter(g => u.role === 'admin' || g.owner === u.id || g.members.includes(u.id));
    }
    notify(d, user, title, body, target) {
      d.notifications.unshift({
        id: id(),
        user,
        title,
        body,
        target,
        read: false,
        created: Date.now()
      });
    }
    createGroup(name, description = '') {
      const u = this.manager(),
        g = {
          id: id(),
          owner: u.id,
          name: text(name, 2, 80),
          description: String(description).trim().slice(0, 1000),
          enrollmentOpen: true,
          code: hex(crypto.getRandomValues(new Uint8Array(4))).toUpperCase(),
          members: [],
          created: Date.now()
        };
      this.update(d => d.groups.push(g));
      return g.id;
    }
    setEnrollment(gid, open) {
      this.group(gid, true);
      need(typeof open === 'boolean', 'Estado de inscripción no válido.');
      this.update(d => d.groups.find(g => g.id === gid).enrollmentOpen = open);
    }
    groupRoster(gid) {
      const d = this.data(), g = this.group(gid, true, d);
      return g.members.map(uid => d.users.find(u => u.id === uid)).map(u => ({name: u.name, email: u.email, active: u.active}));
    }
    postGroupNotice(gid, title, body) {
      const actor = this.manager();
      this.group(gid, true);
      title = text(title, 2, 100); body = text(body, 2, 2000);
      let count = 0;
      this.update(d => {
        const g = this.group(gid, true, d);
        for (const uid of g.members) if (d.users.some(u => u.id === uid && u.active)) {
          this.notify(d, uid, 'Aviso: ' + title, g.name + ' · ' + actor.name + '\n' + body, ['group', gid]);
          count++;
        }
      });
      return count;
    }
    joinGroup(code) {
      const u = this.require();
      need(u.role === 'student', 'Usa una cuenta de estudiante para inscribirte.');
      let gid;
      this.update(d => {
        const g = d.groups.find(g => g.code === String(code).trim().toUpperCase());
        need(g, 'Código no encontrado en el servidor.');
        need(g.enrollmentOpen !== false || g.members.includes(u.id), 'El docente pausó las nuevas inscripciones de este grupo.');
        gid = g.id;
        if (!g.members.includes(u.id)) g.members.push(u.id);
      });
      return gid;
    }
    editGroup(gid, name, renew, description) {
      this.group(gid, true);
      this.update(d => {
        const g = d.groups.find(g => g.id === gid);
        g.name = text(name, 2, 80);
        if (description !== undefined) g.description = String(description).trim().slice(0, 1000);
        if (renew) g.code = hex(crypto.getRandomValues(new Uint8Array(4))).toUpperCase();
      });
    }
    saveExercise(b, eid) {
      const u = this.manager();
      const type = b.type || 'number';
      need(['number', 'choice', 'boolean', 'image'].includes(type), 'Tipo de pregunta no válido.');
      const options = type === 'choice' ? String(b.options || '').split('\n').map(x => x.trim()).filter(Boolean) : undefined;
      const answer = type === 'choice' ? Number(b.correct_option) : type === 'boolean' ? Number(b.truth) : RMath.parseAnswer(String(b.answer));
      need(Number.isFinite(answer), 'La respuesta debe ser un número o una fracción válida.');
      const steps = String(b.steps).split('\n').map(x => x.trim()).filter(Boolean);
      need(steps.length >= 2 && steps.length <= 12, 'Incluye entre 2 y 12 pasos.');
      const e = {
        id: eid || id(),
        owner: u.id,
        topic: b.topic,
        level: integer(b.level, 1, 10),
        prompt: text(b.prompt, 2, 1000),
        instruction: text(b.instruction, 2, 500),
        answer,
        tolerance: ['choice', 'boolean'].includes(type) ? 0 : .001,
        type,
        options,
        points: Number(b.points ?? 1),
        media: b.media || undefined,
        solution_steps: steps,
        explanation: text(b.explanation, 2, 2000),
        hint: String(b.hint || '').slice(0, 500),
        active: true
      };
      need(validExtras(e), 'Revisa las opciones, la respuesta, el puntaje o la imagen de la pregunta.');
      this.update(d => {
        need(d.topics.some(t => t.id === e.topic && t.active), 'Tema no disponible.');
        const old = d.exercises.find(x => x.id === eid);
        if (old) {
          need(old.owner === u.id || u.role === 'admin', 'Sólo puedes editar tus preguntas.');
          Object.assign(old, e, {
            owner: old.owner
          });
        } else d.exercises.push(e);
      });
      return e.id;
    }
    questions(topic, level, count, seedValue = Date.now() % 1000000) {
      level = integer(level, 1, 10);
      count = integer(count, 3, 8);
      const d = this.data();
      const own = d.exercises.filter(e => e.topic === topic && e.active && e.owner === this.require().id);
      if (!RMath.baseTopics.some(t => t.id === topic) && own.length >= count) return clone(own.slice(0, count));
      need(RMath.baseTopics.some(t => t.id === topic), 'Agrega suficientes ejercicios a tu banco para este tema personalizado.');
      return Array.from({
        length: count
      }, (_, i) => ({
        ...RMath.generateQuestion(topic, level, seedValue + i * 71),
        topic,
        level
      }));
    }
    createTask(gid, b, questions) {
      this.group(gid, true);
      const exam = !!b.exam,
        due = date(b.due),
        opens = exam ? date(b.opens) : Date.now();
      need(due > Date.now() && opens < due, 'El cierre debe ser futuro y posterior a la apertura.');
      const t = {
        id: id(),
        group: gid,
        title: text(b.title, 2, 100),
        instructions: String(b.instructions || '').slice(0, 2000),
        due,
        opens,
        exam,
        duration: exam ? integer(b.duration, 1, 180) : 0,
        reveal: !!b.reveal,
        active: true,
        questions: clone(questions),
        created: Date.now()
      };
      need(t.questions.length >= 3 && t.questions.length <= 8, 'Selecciona de 3 a 8 preguntas.');
      this.update(d => {
        d.tasks.unshift(t);
        for (const user of d.groups.find(g => g.id === gid).members) this.notify(d, user, exam ? 'Examen publicado' : 'Nueva tarea', t.title, ['group', gid]);
      });
      return t.id;
    }
    duplicateTask(tid, gid, title, due, opens) {
      const t = this.data().tasks.find(t => t.id === tid);
      need(t, 'Actividad no encontrada.');
      this.group(t.group, true);
      return this.createTask(gid, {
        ...t,
        title,
        due,
        opens,
        duration: t.duration,
        exam: t.exam
      }, t.questions);
    }
    closeTask(tid) {
      const t = this.data().tasks.find(t => t.id === tid);
      need(t, 'Actividad no encontrada.');
      this.group(t.group, true);
      this.update(d => {
        d.tasks.find(t => t.id === tid).active = false;
      });
    }
    start(options) {
      const u = this.require(),
        d = this.data();
      let qs = [],
        total = 6,
        deadline = null,
        level = Number(options.level || 1),
        topic = options.topic || 'algebra',
        task = null,
        room = null;
      if (options.mode === 'assignment') {
        task = d.tasks.find(t => t.id === options.task);
        need(task, 'Actividad no encontrada.');
        const g = this.group(task.group);
        need(g.members.includes(u.id), 'Inscríbete como estudiante para resolver.');
        const existing = d.activities.find(a => a.owner === u.id && a.task === task.id);
        if (existing) return existing.id;
        need(task.active && Date.now() < task.due, 'Esta actividad ya está cerrada.');
        need(!task.exam || Date.now() >= task.opens, 'El examen todavía no abre.');
        qs = clone(task.questions);
        total = qs.length;
        topic = qs[0].topic;
        level = qs[0].level;
        deadline = task.exam ? Math.min(task.due, Date.now() + task.duration * 60000) : task.legacyNoDue ? null : task.due;
      } else if (options.mode === 'challenge') {
        room = d.rooms.find(r => r.id === options.room);
        need(room && room.members.includes(u.id) && room.status === 'active', 'La sala no está disponible.');
        const existing = d.activities.find(a => a.owner === u.id && a.room === room.id);
        if (existing) return existing.id;
        qs = clone(room.questions);
        total = qs.length;
        topic = qs[0].topic;
        level = qs[0].level;
      } else if (options.mode === 'diagnostic') {
        total = 10;
        level = 3;
        qs = [{
          ...RMath.generateQuestion('algebra', 3, Date.now() % 1000000),
          topic: 'algebra',
          level: 3
        }];
      } else {
        const l = d.lessons.find(l => l.id === options.lesson);
        if (l) {
          need(l.active, 'Esta lección está archivada.');
          topic = l.topic;
          level = l.level;
        }
        qs = options.format && options.format !== 'number' ? this.buildQuestions({
          source: 'generated',
          topics: [topic],
          level,
          count: total,
          format: options.format
        }) : this.questions(topic, level, total);
      }
      const a = {
        id: id(),
        owner: u.id,
        mode: options.mode || 'practice',
        examReview: !!task?.exam,
        ...(task?.exam ? {drafts:{},draftVersion:0} : {}),
        lesson: options.lesson || null,
        task: task?.id || null,
        room: room?.id || null,
        topic,
        level,
        total,
        questions: qs,
        attempts: [],
        done: false,
        deadline,
        created: Date.now(),
        seed: Date.now() % 1000000
      };
      this.update(d => d.activities.unshift(a));
      return a.id;
    }
    expireExams() {
      const due = this.data().activities.filter(a => !a.done && a.deadline && a.deadline <= Date.now()).map(a => a.id);
      if (due.length) this.update(d => {
        for (const a of d.activities) if (due.includes(a.id)) a.done = true;
      });
    }
    activity(aid) {
      const u = this.require();
      let a = this.data().activities.find(a => a.id === aid);
      need(a, 'Actividad no encontrada.');
      let allowed = a.owner === u.id;
      if (!allowed && a.task) {
        const t = this.data().tasks.find(t => t.id === a.task);
        allowed = u.role === 'admin' || this.data().groups.some(g => g.id === t.group && g.owner === u.id);
      }
      need(allowed, 'Esta entrega pertenece a otra cuenta.');
      if (!this.data().serverView && !a.done && a.deadline && Date.now() >= a.deadline) {
        this.update(d => d.activities.find(x => x.id === aid).done = true);
        a = this.data().activities.find(x => x.id === aid);
      }
      return a;
    }
    answer(aid, raw, step) {
      const u = this.require();
      this.activity(aid);
      const n = RMath.parseAnswer(raw);
      need(Number.isFinite(n), 'Escribe un número o una fracción, por ejemplo 3/4.');
      let feedback;
      this.update(d => {
        const a = d.activities.find(a => a.id === aid);
        need(a.owner === u.id && !a.done, 'No hay una respuesta pendiente en esta actividad.');
        need(a.attempts.length === Number(step), 'Esta pregunta ya se respondió. Actualiza la actividad.');
        if (a.task) {
          const t = d.tasks.find(t => t.id === a.task),
            g = d.groups.find(g => g.id === t.group);
          need(g.members.includes(u.id) && t.active && Date.now() < t.due, 'La actividad está cerrada o tu inscripción cambió.');
        }
        if (a.room) need(d.rooms.find(r => r.id === a.room).status === 'active', 'El desafío terminó.');
        const q = a.questions[step];
        if (q.type === 'choice') need(Number.isInteger(n) && n >= 0 && n < q.options.length, 'Selecciona una opción válida.');
        if (q.type === 'boolean') need([0, 1].includes(n), 'Selecciona Verdadero o Falso.');
        const correct = Math.abs(n - q.answer) <= q.tolerance;
        feedback = {
          correct,
          q
        };
        if(a.practiceDraft){delete a.practiceDraft;a.practiceDraftVersion=Number(a.practiceDraftVersion||0)+1;}
        a.attempts.push({
          step: Number(step),
          answer: String(raw),
          correct,
          created: Date.now()
        });
        if (a.mode === 'diagnostic' && !a.legacy) {
          a.level = Math.max(1, Math.min(10, a.level + (correct ? 1 : -1)));
          if (a.attempts.length < a.total) {
            const topic = RMath.baseTopics[a.attempts.length % 3].id;
            a.questions.push({
              ...RMath.generateQuestion(topic, a.level, a.seed + a.attempts.length * 71),
              topic,
              level: a.level
            });
          }
        }
        a.done = a.attempts.length === a.total;
      });
      return feedback;
    }
    released(a) {
      return resultsVisible(a, this.require(), this.data());
    }
    stats(uid = this.require().id) {
      const u = this.require();
      if (uid !== u.id) {
        need(u.role !== 'student' && (u.role === 'admin' || this.groups().some(g => g.owner === u.id && g.members.includes(uid))), 'Estudiante fuera de tus grupos.');
      }
      const d = this.data(), activities = d.activities.filter(a => a.owner === uid),
        visible = activities.filter(a => resultsVisible(a, u, d)),
        attempts = visible.flatMap(a => a.attempts),
        correct = attempts.filter(x => x.correct).length;
      return {
        activities,
        visibleActivities: visible,
        answered: attempts.length,
        correct,
        percent: attempts.length ? Math.round(correct / attempts.length * 100) : 0,
        completed: activities.filter(a => a.done).length,
        weekly: attempts.filter(x => x.created >= Date.now() - 7 * 86400000).length,
        topics: RMath.baseTopics.map(t => {
          const rows = visible.flatMap(a => a.attempts.filter((x, i) => a.questions[i].topic === t.id));
          return {
            ...t,
            answered: rows.length,
            percent: rows.length ? Math.round(rows.filter(x => x.correct).length / rows.length * 100) : 0
          };
        })
      };
    }
    activityReview(aid) {
      const a = this.activity(aid), u = this.require();
      need(a.done || a.owner !== u.id, 'Termina la actividad antes de revisar todas sus respuestas.');
      need(this.released(a), 'Los resultados todavía no están disponibles para esta cuenta.');
      return a.questions.map((question, index) => {
        const attempt = a.attempts.find(x => x.step === index) || null;
        return {index, question: clone(question), attempt: attempt ? clone(attempt) : null, earned: attempt?.correct ? question.points ?? 1 : 0, points: question.points ?? 1};
      }).sort((a,b)=>(a.question.originalNumber||a.index+1)-(b.question.originalNumber||b.index+1));
    }
    reviewCandidates(topic = 'all', aid = '') {
      const uid = this.require().id, d = this.data();
      need(topic === 'all' || d.topics.some(t => t.id === topic), 'Tema no encontrado.');
      if (aid) need(d.activities.some(a => a.id === aid && a.owner === uid), 'La actividad no pertenece a esta cuenta.');
      const visible = this.stats().visibleActivities.filter(a => !aid || a.id === aid);
      const rows = visible.flatMap(a => a.attempts.filter(x => !x.correct && (topic === 'all' || a.questions[x.step].topic === topic)).map(x => ({question: a.questions[x.step], created: x.created}))).sort((a,b) => b.created - a.created);
      const seen = new Set();
      return rows.filter(row => {
        const q = row.question;
        const fingerprint = JSON.stringify([q.topic, q.type || 'number', q.prompt, q.options || [], q.answer, q.media || null]);
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint); return true;
      }).map(row => clone(row.question));
    }
    startReview(topic = 'all', aid = '') {
      const actor = this.require(), candidates = this.reviewCandidates(topic, aid);
      need(candidates.length, 'Todavía no hay errores con resultados visibles para este repaso.');
      const questions = candidates.slice(0, 6).map(q => ({...q, points: 1})), originalCount = questions.length;
      const seed = Date.now() % 1000000;
      while (questions.length < 3) {
        const source = questions.find(q => RMath.baseTopics.some(t => t.id === q.topic));
        need(source, 'Reúne al menos tres errores distintos de este tema para preparar un repaso.');
        questions.push({...RMath.generateQuestion(source.topic, source.level, seed + questions.length * 101), topic: source.topic, level: source.level, points: 1});
      }
      const activity = {
        id: id(), owner: actor.id, mode: 'practice', lesson: null, task: null, room: null,
        topic: questions[0].topic, level: questions[0].level, total: questions.length, questions,
        attempts: [], done: false, deadline: null, created: Date.now(), seed,
        review: true, reviewOriginals: originalCount
      };
      this.update(d => d.activities.unshift(activity));
      return activity.id;
    }
    settings() {
      return this.data().settings[this.require().id] || {};
    }
    setSettings(patch) {
      const u = this.require();
      this.update(d => d.settings[u.id] = {
        ...(d.settings[u.id] || {}),
        ...patch
      });
    }
    bookmark(lid) {
      const bookmarks = this.settings().bookmarks || [];
      this.setSettings({
        bookmarks: bookmarks.includes(lid) ? bookmarks.filter(x => x !== lid) : [...bookmarks, lid]
      });
    }
    note(lid, value, expected) {
      const u = this.require();
      need(typeof value === 'string' && value.length <= 6000, 'El apunte admite hasta 6000 caracteres.');
      this.update(d => {
        need(d.lessons.some(l => l.id === lid), 'Lección no encontrada.');
        const old = d.notes.find(n => n.user === u.id && n.lesson === lid);
        need(expected === undefined || (old?.text || '') === expected, 'Este apunte cambió en otra pestaña. Copia tu texto antes de actualizar la pantalla para comparar los cambios.');
        if (!value.trim()) {
          d.notes = d.notes.filter(n => n.user !== u.id || n.lesson !== lid);
        } else if (old) {
          old.text = value;
          old.updated = Date.now();
        } else d.notes.push({user: u.id, lesson: lid, text: value, created: Date.now(), updated: Date.now()});
      });
    }
    personalNotes(query = '') {
      const uid = this.require().id, d = this.data();
      const normalized = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const term = normalized(query).trim();
      return d.notes.filter(n => n.user === uid && n.text.trim()).map(n => ({
        ...n, title: d.lessons.find(l => l.id === n.lesson)?.title || 'Lección archivada'
      })).filter(n => normalized(n.title + ' ' + n.text).includes(term)).sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0));
    }
    studyPlan(now = Date.now()) {
      this.require();
      const localKey = value => {
        const date = new Date(value);
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      };
      const stats = this.stats(), visible = stats.visibleActivities;
      const attempts = visible.flatMap(a => a.attempts), counts = new Map();
      for (const attempt of attempts) counts.set(localKey(attempt.created), (counts.get(localKey(attempt.created)) || 0) + 1);
      const cursor = new Date(now);
      if (!counts.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (counts.has(localKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
      const days = Array.from({length: 7}, (_, i) => {
        const day = new Date(now); day.setDate(day.getDate() - (6 - i));
        return {date: localKey(day), label: day.toLocaleDateString('es-MX', {weekday: 'short'}), count: counts.get(localKey(day)) || 0};
      });
      return {
        streak, today: counts.get(localKey(now)) || 0, days,
        pending: stats.activities.filter(a => !a.done && ['practice', 'diagnostic'].includes(a.mode)).sort((a, b) => b.created - a.created),
        upcoming: this.calendarItems().filter(t => t.active && t.due > now && t.due <= now + 7 * 86400000 && t.status.code === 'pending').sort((a, b) => a.due - b.due),
        achievements: [
          {title: 'Primera práctica', detail: 'Termina una práctica personal.', earned: stats.activities.some(a => a.mode === 'practice' && a.done)},
          {title: 'Diez aciertos', detail: 'Acumula diez respuestas correctas con resultados visibles.', earned: attempts.filter(a => a.correct).length >= 10},
          {title: 'Tres días seguidos', detail: 'Responde durante tres días consecutivos.', earned: streak >= 3}
        ]
      };
    }
    storageReport() {
      this.admin();
      const d = this.data(), raw = JSON.stringify(d);
      return {
        revision: d.revision, jsonBytes: new Blob([raw]).size, estimatedBytes: raw.length * 2,
        collections: ['users', 'groups', 'lessons', 'exercises', 'tasks', 'activities', 'notes', 'rooms', 'notifications'].map(key => ({key, count: d[key].length})),
        images: d.exercises.filter(q => q.media?.kind === 'upload').length + d.tasks.flatMap(t => t.questions).filter(q => q.media?.kind === 'upload').length + d.activities.flatMap(a => a.questions).filter(q => q.media?.kind === 'upload').length + d.rooms.flatMap(r => r.questions).filter(q => q.media?.kind === 'upload').length
      };
    }
    feedback(aid, value) {
      const u = this.manager(),
        a = this.activity(aid);
      need(a.task, 'Comenta una entrega de grupo.');
      const t = this.data().tasks.find(t => t.id === a.task);
      this.group(t.group, true);
      this.update(d => {
        const settings = d.settings[a.owner] || {};
        settings.feedback = {
          ...(settings.feedback || {}),
          [aid]: {
            text: text(value, 2, 2000),
            author: u.name,
            created: Date.now()
          }
        };
        d.settings[a.owner] = settings;
        this.notify(d, a.owner, 'Comentario del docente', t.title, ['activity', aid]);
      });
    }
    readNotice(nid) {
      const u = this.require();
      this.update(d => {
        for (const n of d.notifications) if (n.user === u.id && (!nid || n.id === nid)) n.read = true;
      });
    }
    createRoom(name, topic, level) {
      const u = this.manager(),
        rid = id();
      const r = {
        id: rid,
        owner: u.id,
        name: text(name, 2, 80),
        code: hex(crypto.getRandomValues(new Uint8Array(4))).toUpperCase(),
        status: 'waiting',
        members: [],
        questions: this.questions(topic, integer(level, 1, 10), 6),
        messages: [],
        created: Date.now()
      };
      this.update(d => d.rooms.push(r));
      return rid;
    }
    joinRoom(code) {
      const u = this.require();
      need(u.role === 'student', 'Únete con una cuenta de estudiante.');
      let rid;
      this.update(d => {
        const r = d.rooms.find(r => r.code === String(code).trim().toUpperCase());
        need(r && r.status === 'waiting', 'No hay una sala en espera con ese código.');
        if (!r.members.includes(u.id)) r.members.push(u.id);
        rid = r.id;
      });
      return rid;
    }
    room(rid) {
      const u = this.require(),
        r = this.data().rooms.find(r => r.id === rid);
      need(r && (r.owner === u.id || u.role === 'admin' || r.members.includes(u.id)), 'Sala no disponible para esta cuenta.');
      return r;
    }
    controlRoom(rid, status) {
      const u = this.manager();
      this.room(rid);
      this.update(d => {
        const r = d.rooms.find(r => r.id === rid);
        need(r.owner === u.id || u.role === 'admin', 'No diriges esta sala.');
        need(['active', 'closed'].includes(status) && r.status !== 'closed', 'La sala ya terminó.');
        need(status !== 'active' || r.status === 'waiting', 'La sala ya está en curso.');
        need(status !== 'active' || r.members.length > 0, 'Espera a que se inscriba un estudiante.');
        r.status = status;
        if (status === 'closed') for (const a of d.activities) if (a.room === rid) a.done = true;
      });
    }
    chat(rid, value) {
      const u = this.require();
      this.room(rid);
      this.update(d => {
        const r = d.rooms.find(r => r.id === rid);
        need(r.status !== 'closed', 'La conversación está cerrada.');
        r.messages.push({
          name: u.name,
          text: text(value, 1, 500),
          created: Date.now()
        });
        r.messages = r.messages.slice(-100);
      });
    }
    editUser(uid, role, active) {
      const admin = this.admin();
      this.update(d => {
        const u = d.users.find(u => u.id === uid);
        need(u && ['student', 'teacher', 'admin'].includes(role), 'Cuenta no válida.');
        need(uid !== admin.id || active && role === 'admin', 'Conserva tu cuenta administradora activa.');
        need(!(u.role === 'admin' && (!active || role !== 'admin')) || d.users.some(x => x.id !== uid && x.role === 'admin' && x.active), 'Debe permanecer un administrador activo.');
        u.role = role;
        u.active = !!active;
      });
    }
    editLesson(lid, b) {
      this.admin();
      this.update(d => {
        const l = d.lessons.find(l => l.id === lid);
        need(l, 'Lección no encontrada.');
        Object.assign(l, {
          title: text(b.title, 2, 150),
          concept: text(b.concept, 2, 3000),
          example: text(b.example, 2, 1000),
          steps: text(b.steps, 2, 6000).split('\n').filter(Boolean),
          level: integer(b.level, 1, 10),
          active: !!b.active
        });
      });
    }
    buildQuestions(b) {
      const u = this.require(),
        d = this.data();
      if (b.source === 'bank') {
        need(u.role !== 'student', 'El banco de preguntas corresponde al docente.');
        need(Array.isArray(b.exerciseIds) && b.exerciseIds.length >= 3 && b.exerciseIds.length <= 8 && new Set(b.exerciseIds).size === b.exerciseIds.length, 'Elige de 3 a 8 preguntas diferentes.');
        return b.exerciseIds.map(id => {
          const e = d.exercises.find(e => e.id === id && e.active && (e.owner === u.id || u.role === 'admin'));
          need(e, 'Una pregunta no está disponible en tu banco.');
          return clone(e);
        });
      }
      need(b.source === 'generated' || !b.source, 'Origen no válido.');
      const topics = b.topics;
      need(Array.isArray(topics) && topics.length >= 1 && topics.length <= 3 && new Set(topics).size === topics.length, 'Selecciona de uno a tres temas.');
      for (const topic of topics) need(RMath.baseTopics.some(t => t.id === topic) && d.topics.some(t => t.id === topic && t.active), 'Tema no disponible en el generador.');
      const count = integer(b.count, 3, 8),
        level = integer(b.level, 1, 10),
        format = b.format || 'number',
        seedValue = Date.now() % 1000000;
      need(['number', 'choice', 'boolean', 'image', 'mixed'].includes(format), 'Formato no válido.');
      return Array.from({
        length: count
      }, (_, i) => {
        const topic = topics[i % topics.length],
          seed = seedValue + i * 71,
          type = format === 'mixed' ? ['number', 'choice', 'boolean', 'image'][i % 4] : format;
        let q = {
          ...RMath.generateQuestion(topic, level, seed),
          topic,
          level,
          type,
          points: 1
        };
        const show = n => String(Number(n.toFixed(4)));
        if (type === 'choice') {
          const value = q.answer,
            offset = seed % 4,
            list = [show(value), show(value + 1), show(value + 2.5), show(value - 1.5)];
          q.options = Array.from({
            length: 4
          }, (_, j) => list[(j - offset + 4) % 4]);
          q.answer = offset;
          q.tolerance = 0;
          q.instruction = q.instruction + ' Selecciona la respuesta correcta.';
        }
        if (type === 'boolean') {
          const real = q.answer,
            truth = seed % 2 === 0,
            candidate = truth ? real : real + 2;
          q.prompt = q.prompt + ' ¿Su respuesta es ' + show(candidate) + '?';
          q.answer = truth ? 1 : 0;
          q.tolerance = 0;
          q.instruction = q.instruction + ' Indica si la afirmación es verdadera o falsa.';
          q.explanation = (truth ? 'La afirmación es verdadera.' : 'La afirmación es falsa.') + ' El resultado correcto es ' + show(real) + '. ' + q.explanation;
        }
        if (type === 'image') {
          const a = 3 + seed % 7,
            b = 2 + seed % 5;
          q.media = {
            kind: 'rectangle',
            a,
            b,
            alt: 'Rectángulo con base ' + a + ' y altura ' + b + '.'
          };
          if (topic === 'geometria') {
            if (level >= 6) {
              q.media = {
                kind: 'circle',
                a,
                b: 1,
                alt: 'Círculo con radio ' + a + '.'
              };
              q.answer = 3.14 * a * a;
              q.prompt = 'Calcula el área del círculo mostrado. Usa π = 3.14.';
              q.solution_steps = ['Identifica el radio: ' + a + '.', 'Aplica A = πr²: 3.14 × ' + a + '² = ' + q.answer + '.', 'Expresa el resultado en unidades cuadradas.'];
            } else {
              q.answer = level >= 4 ? 2 * (a + b) : a * b;
              q.prompt = level >= 4 ? 'Calcula el perímetro del rectángulo mostrado.' : 'Calcula el área del rectángulo mostrado.';
              q.solution_steps = level >= 4 ? ['Identifica base ' + a + ' y altura ' + b + '.', 'Aplica P = 2(b + h): 2(' + a + ' + ' + b + ').', 'El perímetro es ' + q.answer + '.'] : ['Identifica base ' + a + ' y altura ' + b + '.', 'Multiplica base por altura: ' + a + ' × ' + b + '.', 'El área es ' + q.answer + '.'];
            }
          }
          if (topic === 'fracciones') {
            const numerator = 1 + seed % 5,
              denominator = numerator + 1 + seed % 4;
            q.media = {
              kind: 'fraction',
              a: numerator,
              b: denominator,
              alt: numerator + ' de ' + denominator + ' partes iguales están coloreadas.'
            };
            q.answer = numerator / denominator;
            q.prompt = '¿Qué fracción de la figura está coloreada? Escribe una fracción o decimal.';
            q.solution_steps = ['Cuenta ' + denominator + ' partes iguales.', 'Identifica ' + numerator + ' partes coloreadas.', 'La fracción es ' + numerator + '/' + denominator + '.'];
          }
          if (topic === 'algebra') {
            q.media = {
              kind: 'equation',
              a,
              b,
              alt: 'Una incógnita más ' + b + ' equivale a ' + (a + b) + '.'
            };
            q.answer = a;
            q.prompt = 'Observa la balanza: x + ' + b + ' = ' + (a + b) + '. Calcula x.';
            q.solution_steps = ['La igualdad representa x + ' + b + ' = ' + (a + b) + '.', 'Resta ' + b + ' en ambos lados.', 'x = ' + (a + b) + ' − ' + b + ' = ' + a + '.'];
          }
          q.instruction = 'Resuelve a partir de la imagen y de sus datos.';
          q.explanation = q.solution_steps.join(' ');
          q.hint = 'Relaciona la imagen con la fórmula o igualdad del tema.';
        }
        need(validExtras(q), 'No se pudo construir la pregunta.');
        return q;
      });
    }
    taskStatus(t, uid = this.require().id, d = this.data()) {
      const a = d.activities.find(a => a.task === t.id && a.owner === uid);
      if (a && (a.done || a.deadline && a.deadline <= Date.now())) return {
        code: 'done',
        label: 'Entregada',
        activity: a
      };
      if (!t.active) return {
        code: 'closed',
        label: 'Cerrada',
        activity: a || null
      };
      if (t.due <= Date.now()) return {
        code: 'expired',
        label: 'Vencida',
        activity: a || null
      };
      return {
        code: 'pending',
        label: t.exam && t.opens > Date.now() ? 'Programada' : a ? 'En curso' : 'Pendiente',
        activity: a || null
      };
    }
    calendarItems() {
      const u = this.require(),
        d = this.data(),
        groups = this.groups();
      return d.tasks.filter(t => groups.some(g => g.id === t.group)).map(t => {
        const g = groups.find(g => g.id === t.group),
          allDone = g.members.length > 0 && g.members.every(uid => this.taskStatus(t, uid, d).code === 'done');
        const status = u.role === 'student' ? this.taskStatus(t, u.id, d) : allDone ? {
          code: 'done',
          label: 'Todos entregaron'
        } : !t.active ? {
          code: 'closed',
          label: 'Cerrada'
        } : t.due <= Date.now() ? {
          code: 'expired',
          label: 'Plazo terminado'
        } : {
          code: 'pending',
          label: t.exam && t.opens > Date.now() ? 'Programada' : 'Abierta'
        };
        return {
          ...t,
          groupName: g.name,
          status
        };
      });
    }
    recommendations() {
      const u = this.require(),
        d = this.data(),
        as = d.activities.filter(a => a.owner === u.id && resultsVisible(a, u, d));
      const diagnostic = as.filter(a => a.mode === 'diagnostic' && a.done).sort((a, b) => b.created - a.created)[0];
      const rows = as.flatMap(a => a.attempts.map(x => ({
        ...x,
        question: a.questions[x.step],
        activityCreated: a.created
      }))).sort((a, b) => b.created - a.created || b.activityCreated - a.activityCreated || b.step - a.step);
      return d.topics.filter(t => t.active).map(t => {
        const recent = rows.filter(x => x.question.topic === t.id).slice(0, 20),
          correct = recent.filter(x => x.correct).length,
          percent = recent.length ? Math.round(correct / recent.length * 100) : null;
        let level = recent.length ? Math.round(recent.reduce((n, x) => n + x.question.level, 0) / recent.length) : diagnostic?.level || 1;
        if (recent.length >= 3 && percent < 60) level--;else if (recent.length >= 3 && percent >= 80) level++;
        level = Math.max(1, Math.min(10, level));
        const mastered = new Set(as.filter(a => a.mode === 'practice' && a.done && scoreInfo(a).percent >= 80).map(a => a.lesson));
        const lessons = d.lessons.filter(l => l.topic === t.id && l.active).sort((a, b) => Number(mastered.has(a.id)) - Number(mastered.has(b.id)) || Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level);
        const priority = recent.length >= 3 && percent < 60 ? 'reinforce' : recent.length < 3 ? 'explore' : 'advance';
        return {
          topic: t.id,
          name: t.name,
          level,
          answered: recent.length,
          percent,
          priority,
          lesson: lessons[0] || null,
          reason: priority === 'reinforce' ? 'En tus últimas ' + recent.length + ' respuestas de este tema tienes ' + percent + '% de aciertos. Conviene reforzar el procedimiento.' : priority === 'explore' ? 'Faltan respuestas para valorar este tema. Empieza con una explicación cercana a tu nivel.' : 'Tus respuestas recientes orientan esta sugerencia. Continúa con una lección cercana al nivel ' + level + '.'
        };
      }).sort((a, b) => ({
        reinforce: 0,
        explore: 1,
        advance: 2
      })[a.priority] - {
        reinforce: 0,
        explore: 1,
        advance: 2
      }[b.priority] || (a.percent ?? 0) - (b.percent ?? 0));
    }
    report(groupId = 'all') {
      const u = this.manager(),
        d = this.data();
      let groups = d.groups.filter(g => u.role === 'admin' || g.owner === u.id);
      if (groupId !== 'all') {
        this.group(groupId, true);
        groups = groups.filter(g => g.id === groupId);
      }
      const tasks = d.tasks.filter(t => groups.some(g => g.id === t.group)),
        deliveries = d.activities.filter(a => tasks.some(t => t.id === a.task));
      const members = [...new Set(groups.flatMap(g => g.members))],
        topicRows = d.topics.map(t => {
          const attempts = deliveries.flatMap(a => a.attempts.filter(x => a.questions[x.step].topic === t.id));
          return {
            id: t.id,
            name: t.name,
            answered: attempts.length,
            correct: attempts.filter(x => x.correct).length,
            percent: attempts.length ? Math.round(attempts.filter(x => x.correct).length / attempts.length * 100) : null
          };
        }).filter(t => t.answered).sort((a, b) => a.percent - b.percent);
      const students = members.map(uid => {
        const account = d.users.find(u => u.id === uid),
          ownGroups = groups.filter(g => g.members.includes(uid)),
          ownTasks = tasks.filter(t => ownGroups.some(g => g.id === t.group)),
          own = deliveries.filter(a => a.owner === uid),
          attempts = own.flatMap(a => a.attempts),
          answered = attempts.length,
          correct = attempts.filter(x => x.correct).length;
        const states = ownTasks.map(t => this.taskStatus(t, uid, d));
        const overdue = states.filter(s => s.code === 'expired').length,
          pending = states.filter(s => s.code === 'pending').length,
          completed = states.filter(s => s.code === 'done').length,
          percent = answered ? Math.round(correct / answered * 100) : null;
        const grades = own.filter(a => a.done || a.deadline && a.deadline <= Date.now()).map(scoreInfo),
          grade = grades.length ? Math.round(grades.reduce((n, g) => n + g.grade, 0) / grades.length * 10) / 10 : null;
        const needsSupport = overdue > 0 || answered >= 3 && percent < 60 || grades.length > 0 && grade < 6;
        return {
          id: uid,
          name: account.name,
          email: account.email,
          groups: ownGroups.map(g => g.name),
          answered,
          correct,
          percent,
          pending,
          overdue,
          completed,
          grade,
          needsSupport,
          reason: overdue ? 'Tiene ' + overdue + ' entrega(s) vencida(s).' : grades.length && grade < 6 ? 'Promedio de entregas menor a 6/10.' : answered >= 3 && percent < 60 ? 'Menos de 60% de aciertos con al menos tres respuestas.' : answered < 3 ? 'Aún faltan respuestas para valorar.' : 'Avance dentro del criterio de seguimiento.'
        };
      });
      return {
        groups,
        tasks,
        deliveries,
        students,
        topics: topicRows
      };
    }
    async resetPassword(uid, currentPassword, newPassword) {
      const actor = this.admin(),
        before = this.data();
      need(before.users.some(u => u.id === uid), 'Cuenta no encontrada.');
      need(typeof newPassword === 'string' && newPassword.length >= 10 && newPassword.length <= 128 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword), 'Usa de 10 a 128 caracteres, letras y números.');
      need((await passwordHash(currentPassword, actor.salt)) === actor.password, 'Tu contraseña administrativa no coincide.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16))),
        hash = await passwordHash(newPassword, salt);
      need(this.admin().id === actor.id, 'La sesión cambió.');
      this.update(d => {
        const target = d.users.find(u => u.id === uid);
        target.password = hash;
        target.salt = salt;
        target.authVersion = (target.authVersion || 0) + 1;
        this.notify(d, uid, 'Contraseña restablecida', 'El administrador actualizó tu acceso local.', ['profile', '']);
      });
    }
    async profile(name, current, next) {
      const u = this.require();
      let hash;
      if (next) {
        need(next.length >= 10 && next.length <= 128 && /[A-Za-z]/.test(next) && /\d/.test(next), 'Usa al menos 10 caracteres, letras y números.');
        need((await passwordHash(current, u.salt)) === u.password, 'La contraseña actual no coincide.');
        hash = await passwordHash(next, u.salt);
      }
      this.update(d => {
        const user = d.users.find(x => x.id === u.id);
        user.name = text(name, 2, 80);
        if (hash) {
          user.password = hash;
          user.authVersion = (user.authVersion || 0) + 1;
        }
      });
      if (hash) {
        const updated = this.data().users.find(x => x.id === u.id);
        this.session.setItem(SESSION, JSON.stringify({
          id: u.id,
          version: updated.authVersion || 0
        }));
      }
    }
    async restore(payload, password) {
      const u = this.admin();
      need((await passwordHash(password, u.salt)) === u.password, 'La contraseña actual no coincide.');
      const d = validate(clone(payload)),
        saved = d.users.find(x => x.email === u.email && x.active && x.role === 'admin');
      need(saved, 'Tu cuenta debe ser administradora activa en la copia.');
      const currentAccounts = this.data().users;
      for (const account of d.users) {
        const current = currentAccounts.find(x => x.email === account.email);
        account.authVersion = Math.max(account.authVersion || 0, current?.authVersion || 0) + 1;
      }
      validate(d);
      saved.password = u.password;
      saved.salt = u.salt;
      this.save(d);
      this.logout();
    }
    export() {
      this.admin();
      return clone(this.data());
    }
  }
  return {
    Model,
    validate,
    passwordHash,
    scoreInfo,
    answerLabel,
    validExtras,
    seed,
    KEY
  };
})();
