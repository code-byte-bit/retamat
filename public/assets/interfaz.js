/* Interfaz original conectada al servidor mediante RetamatServer. */
(() => {
  const $ = (s) => document.querySelector(s),
    app = $('#app'),
    dialog = $('#modal');
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  const icons = {
    home: 'M3 10l9-7 9 7v11H4z M9 21v-8h6v8',
    book: 'M12 5v16 M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
    target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
    chart: 'M4 20V11 M10 20V4 M16 20V8 M22 20H2',
    users: 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-4a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v4 M16 3a4 4 0 0 1 0 8 M19 13a4 4 0 0 1 3 4v4',
    trophy: 'M8 3h8v7a4 4 0 0 1-8 0z M8 5H3v3a4 4 0 0 0 5 4 M16 5h5v3a4 4 0 0 1-5 4 M12 14v6 M7 21h10',
    user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    check: 'M5 12l4 4L19 6',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    plus: 'M12 4v16 M4 12h16',
    search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M17 17l5 5',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',
    shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6',
    close: 'M5 5l14 14 M19 5L5 19',
    moon: 'M21 12.6A9 9 0 0 1 11.4 3 9 9 0 1 0 21 12.6',
    save: 'M5 3h14l2 2v16H3V3z M7 3v6h10V3 M7 21v-8h10v8',
    logout: 'M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" class="icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[n] || icons.book}"/></svg>`;
  const btn = (label, action, key = '', style = 'primary') => {
    const names = {
      menu: 'Abrir o cerrar menú',
      compact: 'Contraer o ampliar menú',
      theme: 'Alternar modo claro y oscuro',
      close: 'Cerrar ventana',
      password: 'Mostrar u ocultar contraseña',
      lesson: 'Abrir lección',
      group: 'Abrir grupo',
      room: 'Abrir sala',
      activity: 'Abrir actividad',
      bookmark: 'Cambiar favorita'
    };
    const onlyIcon = !String(label).replace(/<[^>]*>/g, '').trim();
    const name = names[action] || (action === 'nav' ? 'Abrir ' + (titles[key]?.[1] || key) : 'Abrir');
    return `<button type="button" class="${style}" data-action="${action}" data-id="${esc(key)}" ${onlyIcon ? `aria-label="${esc(name)}" title="${esc(name)}"` : ''}>${label}</button>`;
  };
  const field = (label, name, value = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const area = (label, name, value = '', max = 3000) => `<label>${label}<textarea name="${name}" rows="4" maxlength="${max}" required>${esc(value)}</textarea></label>`;
  const select = (label, name, items, current) => `<label>${label}<select name="${name}">${items.map(([id, title]) => `<option value="${esc(id)}" ${String(id) === String(current) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
  const roleLabel = (r) => ({
    student: 'Estudiante',
    teacher: 'Docente',
    admin: 'Administrador'
  })[r];
  const date = (n) => new Date(n).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const localDate = (n) => {
    const d = new Date(n);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const empty = (title, description, action = '') => `<section class="panel empty"><span class="empty-symbol">${icon('book')}</span><h2>${esc(title)}</h2><p>${esc(description)}</p>${action}</section>`;
  const score = (a) => a.attempts.filter((x) => x.correct).length;
  const steps = (qs) => `<ol class="solution-steps">${(qs || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
  let model,
    view = 'home',
    key = '',
    feedback = null,
    timer = null,
    preview = null,
    lessonQuery = '',
    noteQuery = '',
    historyMode = 'all',
    historyState = 'all',
    historyPage = 0,
    bankQuery = '',
    bankType = 'all',
    bankState = 'all',
    userQuery = '',
    userRole = 'all',
    topicFilter = 'all',
    favoritesOnly = false,
    mistakeTopic = 'all',
    calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calendarFilter = 'all',
    reportGroup = 'all',
    reportFilter = 'all';
  const user = () => model?.user() || null,
    manage = () => user()?.role !== 'student';
  function notice(message, bad = false) {
    const t = $('#toast');
    t.textContent = message;
    t.className = bad ? 'bad' : '';
    t.hidden = false;
    clearTimeout(notice.timeout);
    notice.timeout = setTimeout(() => t.hidden = true, 5000);
  }
  function modal(title, body, persistent = false) {
    if (persistent) dialog.dataset.persistent = 'yes';
    else delete dialog.dataset.persistent;
    dialog.innerHTML = `<header class="modal-heading"><div><p class="eyebrow">RETAMAT</p><h2 id="modal-title">${esc(title)}</h2></div>${btn(icon('close'), 'close', '', 'icon-button')}</header>${body}`;
    if (dialog.open) dialog.close();
    dialog.showModal();
  }
  function form(title, type, body, extra = '', label = 'Guardar cambios') {
    modal(title, `<form data-form="${type}" ${extra}>${body}<p class="form-error" hidden role="alert"></p><footer class="form-actions">${btn('Cancelar', 'close', '', 'secondary')}<button class="primary" type="submit">${label} ${icon('arrow')}</button></footer></form>`);
  }
  function go(next, id = '') {
    if (dialog.dataset.persistent !== 'yes') dialog.close();
    feedback = null;
    preview = null;
    location.hash = '#' + next + (id ? '/' + encodeURIComponent(id) : '');
    if (view === next && key === id) render();
  }
  function download(name, data, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
      type
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csv(name, rows) {
    const cell = (x) => '"' + String(x ?? '').replace(/^[\s]*[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    download(name, '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  function mathArt() {
    return `<div class="math-art" aria-hidden="true"><svg class="studio-art" viewBox="0 0 440 300" fill="none"><path d="M20 50H420M20 100H420M20 150H420M20 200H420M20 250H420M70 20V280M120 20V280M170 20V280M220 20V280M270 20V280M320 20V280M370 20V280" stroke="currentColor" opacity=".07"/><ellipse cx="221" cy="160" rx="175" ry="102" stroke="currentColor" stroke-dasharray="4 7" opacity=".25" transform="rotate(-18 221 160)"/><path d="M293 48L362 83V158L293 123Z" fill="#b3ccba" stroke="#608779" stroke-width="2"/><path d="M293 48L228 85L293 123L362 83Z" fill="#def0c4" stroke="#608779" stroke-width="2"/><path d="M228 85V158L293 197V123Z" fill="#e6f0dd" stroke="#608779" stroke-width="2"/><path d="M293 123V197L362 158V83" stroke="#608779" stroke-width="2"/><circle cx="76" cy="101" r="29" fill="#e2edb3"/><text x="76" y="111" text-anchor="middle" fill="#315448" font-size="30" font-family="Manrope, sans-serif">π</text><rect x="64" y="146" width="261" height="119" rx="19" fill="#142f29" opacity=".12"/><rect x="58" y="136" width="261" height="119" rx="19" fill="#fffef8" stroke="#d5dfd0"/><text x="81" y="163" fill="#728076" font-size="9" font-weight="700" letter-spacing="1.7" font-family="Manrope, sans-serif">ENCUENTRA EL EQUILIBRIO</text><text x="81" y="201" fill="#1c4037" font-size="29" font-weight="700" font-family="Manrope, sans-serif">2x + 4 = 14</text><path d="M81 216H296" stroke="#e2e8df"/><text x="81" y="238" fill="#286251" font-size="16" font-weight="700" font-family="Manrope, sans-serif">x = 5</text><circle cx="283" cy="233" r="12" fill="#dcedc0"/><path d="M278 233L282 237L288 229" stroke="#315448" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M358 217H386M372 203V231" stroke="currentColor" opacity=".5" stroke-width="2"/><circle cx="155" cy="49" r="5" fill="#e1b595"/><circle cx="388" cy="149" r="5" fill="#9fbca3"/></svg></div>`;
  }
  function topicArt(topic) {
    const drawings = {
      algebra: '<path d="M20 90H140M45 108V18" stroke="currentColor" opacity=".25"/><path d="M26 81C53 99 69 91 84 63S111 20 137 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="84" cy="63" r="5" fill="currentColor"/><text x="98" y="97" fill="currentColor" font-size="23" font-weight="700">x²</text>',
      fracciones: '<circle cx="61" cy="61" r="38" stroke="currentColor" stroke-width="2" opacity=".3"/><path d="M61 23A38 38 0 0 1 94 80L61 61Z" fill="currentColor" opacity=".6"/><path d="M61 61L28 80M61 61V23M61 61L94 80" stroke="currentColor" stroke-width="2"/><text x="109" y="77" fill="currentColor" font-size="39" font-weight="600">⅓</text>',
      geometria: '<path d="M73 19L119 45V96L73 121L27 96V45Z" fill="currentColor" opacity=".09"/><path d="M73 19L119 45L73 71L27 45ZM73 71V121M27 45V96L73 121L119 96V45" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M73 19V71" stroke="currentColor" stroke-dasharray="3 5" opacity=".4"/>'
    };
    return `<svg class="topic-art" viewBox="0 0 160 140" fill="none" aria-hidden="true">${drawings[topic] || drawings.algebra}</svg>`;
  }
  function auth(mode = 'login') {
    clearInterval(timer);
    timer = null;
    study?.reset();
    app.innerHTML = `<div class="auth-layout"><section class="auth-story"><div class="brand"><span class="brand-mark">∑</span><div>RETAMAT<small>RETOS MATEMÁTICOS</small></div></div><span class="pill auth-pill">TU APRENDIZAJE, A TU RITMO</span><h1>Aprende con intención.<br><em>Resuelve con confianza.</em></h1><p>Comprende cada paso, encuentra tu nivel y construye el hábito de avanzar.</p>${mathArt()}<div class="auth-features"><span>${icon('book')} Lecciones guiadas</span><span>${icon('target')} 10 niveles</span><span>${icon('chart')} Tu progreso</span></div></section><section class="auth-entry"><div class="auth-top">Tu espacio para aprender <span>CRECE A TU RITMO</span></div><div class="auth-card"><p class="eyebrow">BIENVENIDO A TU SIGUIENTE LOGRO</p><h2>${mode === 'register' ? 'Crea tu espacio' : 'Qué gusto verte de nuevo'}</h2><p>${mode === 'register' ? 'Elige tu tipo de cuenta y empieza tu recorrido.' : 'Entra y continúa justo donde te quedaste.'}</p><div class="auth-tabs">${btn('Iniciar sesión', 'auth', 'login', mode === 'login' ? 'active' : '')}${btn('Crear cuenta', 'auth', 'register', mode === 'register' ? 'active' : '')}</div><form data-form="${mode}">${mode === 'register' ? field('Nombre completo', 'name', '', 'text', 'required minlength="2" maxlength="80" autocomplete="name"') : ''}${mode === 'register' ? `<fieldset class="role-selector"><legend>¿Cómo usarás RETAMAT?</legend><label class="role-option"><input type="radio" name="role" value="student" checked required><span><strong>Estudiante</strong><small>Aprender, practicar y resolver actividades.</small></span></label><label class="role-option"><input type="radio" name="role" value="teacher" required><span><strong>Docente</strong><small>Crear grupos, preparar retos y revisar entregas.</small></span></label></fieldset><p class="small role-note">El rol de administrador lo asigna una cuenta administradora.</p>` : ''}${field('Correo electrónico', 'email', '', 'email', 'required maxlength="150" autocomplete="email"')}<div class="password-wrap">${field('Contraseña', 'password', '', 'password', `required maxlength="128" ${mode === 'register' ? 'minlength="10"' : ''} autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"`)}${btn(icon('eye'), 'password', '', 'icon-button password-toggle')}</div>${mode === 'register' ? '<p class="small">Al menos diez caracteres, letras y números.</p>' : ''}<p class="form-error" hidden role="alert"></p><button class="primary auth-submit">${mode === 'register' ? 'Crear mi cuenta' : 'Entrar a mi espacio'} ${icon('arrow')}</button></form>${mode === 'login' ? btn('¿Olvidaste tu contraseña?', 'recovery', '', 'text-button recovery-link') : ''}</div><footer class="auth-footer">Andrés Garcia Hernández · Maximiliano Garcia Pérez<br>Kevin Alexander Roman Lopez</footer></section></div>`;
  }
  function navigation() {
    const items = [['home', 'home', 'Inicio', 'MI ESPACIO'], ['topics', 'book', 'Temas y lecciones', 'APRENDIZAJE'], ['library','book','Biblioteca de apoyo','APRENDIZAJE'], ...(!manage() ? [['simulation','clock','Simulacro de examen','APRENDIZAJE']] : []), ['path', 'target', 'Mi ruta', 'APRENDIZAJE'], ['plan', 'clock', 'Mi plan de estudio', 'APRENDIZAJE'], ['diagnostic', 'target', 'Evaluación inicial', 'APRENDIZAJE'], ['progress', 'chart', 'Mi progreso', 'APRENDIZAJE'], ['mistakes', 'book', 'Cuaderno de errores', 'APRENDIZAJE'], ['notes', 'save', 'Mis apuntes', 'APRENDIZAJE'], ...(!manage() ? [['daily','clock','Reto diario','APRENDIZAJE']] : []), ['achievements','trophy','Mis logros','APRENDIZAJE'], ['groups', 'users', manage() ? 'Mis grupos' : 'Grupos y tareas', 'AULA'], ['calendar', 'clock', 'Calendario', 'AULA'], ['rooms', 'trophy', 'Desafíos', 'AULA'], ['notices', 'bell', 'Notificaciones', 'AULA'], ...(manage() ? [['bank', 'book', 'Banco de preguntas', 'ENSEÑANZA'], ['reports', 'chart', 'Reporte de alumnos', 'ENSEÑANZA'], ['support','target','Seguimiento docente','ENSEÑANZA'], ['comparison','chart','Comparar actividades','ENSEÑANZA']] : []), ...(user().role === 'admin' ? [['users', 'users', 'Usuarios', 'ADMINISTRACIÓN'], ['content', 'book', 'Contenido', 'ADMINISTRACIÓN'], ['backups', 'shield', 'Respaldos', 'ADMINISTRACIÓN'], ['storage', 'save', 'Estado de los datos', 'ADMINISTRACIÓN']] : []), ['guide', 'book', 'Guía de uso', 'MI CUENTA'], ['profile', 'user', 'Perfil y ajustes', 'MI CUENTA']];
    let last = '';
    return items.map(([v, i, label, section]) => {
      const header = last !== section ? `<p class="nav-section-label">${section}</p>` : '';
      last = section;
      const selected = view === v || v === 'topics' && view === 'lesson' || v === 'groups' && view === 'group' || v === 'rooms' && view === 'room';
      return header + `<button class="nav-link ${selected ? 'selected' : ''}" title="${label}" aria-label="${label}" ${selected ? 'aria-current="page"' : ''} data-action="nav" data-id="${v}">${icon(i)}<span>${label}</span>${selected ? '<i></i>' : ''}</button>`;
    }).join('');
  }
  const titles = {
    lesson: ['Comprende la idea y prueba una estrategia.', 'Lección'],
    library: ['Ejemplos, guías y videos organizados por tema.', 'Biblioteca de apoyo'],
    simulation: ['Practica con tiempo y revisa tus resultados al terminar.', 'Simulacro de examen'],
    comparison: ['Compara dos actividades de un mismo grupo.', 'Comparación del grupo'],
    daily: ['Tres preguntas para avanzar hoy. La fecha usa la hora del centro de México.', 'Reto diario'],
    achievements: ['Cada insignia representa un avance guardado en tu cuenta.', 'Mis logros'],
    support: ['Detecta necesidades por tema usando las actividades de tus grupos.', 'Seguimiento docente'],
    home: ['Tu aprendizaje empieza con el siguiente paso.', 'Inicio'],
    topics: ['Explicaciones claras para entender y practicar.', 'Temas y lecciones'],
    plan: ['Organiza tus prácticas y reconoce tu constancia.', 'Mi plan de estudio'],
    storage: ['Consulta el contenido guardado en la plataforma.', 'Estado de los datos'],
    path: ['Un recorrido construido a partir de tus prácticas.', 'Mi ruta'],
    diagnostic: ['Encuentra tu punto de partida con diez preguntas.', 'Evaluación inicial'],
    progress: ['Cada respuesta forma parte de tu avance.', 'Mi progreso'],
    mistakes: ['Vuelve a una idea y aprende de cada intento.', 'Cuaderno de errores'],
    notes: ['Tus ideas y procedimientos en un mismo lugar.', 'Mis apuntes'],
    groups: ['Organiza el aprendizaje y las próximas entregas.', 'Grupos y tareas'],
    calendar: ['Organiza tareas y exámenes por fecha y estado.', 'Calendario'],
    group: ['Un espacio para aprender y compartir retos.', 'Detalle del grupo'],
    activity: ['Lee, resuelve y comprende el procedimiento.', 'Actividad'],
    rooms: ['Mismas preguntas, distintas estrategias.', 'Desafíos'],
    room: ['Comparte una estrategia y alcanza el siguiente reto.', 'Sala de desafío'],
    notices: ['Nuevas tareas y comentarios que merecen tu atención.', 'Notificaciones'],
    bank: ['Diseña tus propias preguntas y sus soluciones.', 'Banco de preguntas'],
    reports: ['Acompaña a tus alumnos con información de sus entregas.', 'Reporte de alumnos'],
    users: ['Gestiona las cuentas registradas en la plataforma.', 'Usuarios'],
    content: ['Mantén las lecciones claras y actualizadas.', 'Contenido'],
    backups: ['Conserva una copia del contenido educativo.', 'Respaldos'],
    profile: ['Personaliza tu experiencia y cuida tu acceso.', 'Mi perfil'],
    guide: ['Todo lo que necesitas para comenzar.', 'Guía de uso']
  };
  function shell(body) {
    const u = user(),
      [sub, title] = titles[view] || titles.home,
      d = model.data(),
      unread = d.notifications.filter((n) => n.user === u.id && !n.read).length;
    document.title = 'RETAMAT · ' + title;
    app.innerHTML = `<a class="skip-link" href="#main" data-action="skip">Saltar al contenido</a><div class="shell"><aside id="retamat-menu" class="sidebar"><div class="brand"><span class="brand-mark">∑</span><div>RETAMAT<small>RETOS MATEMÁTICOS</small></div></div><nav aria-label="Menú principal">${navigation()}</nav><div class="sidebar-bottom"><div class="account"><span class="avatar">${esc(u.name[0])}</span><div><strong>${esc(u.name)}</strong><small>${roleLabel(u.role)}</small></div></div>${btn(icon('logout') + '<span>Cerrar sesión</span>', 'logout', '', 'logout')}</div></aside>${btn('Cerrar menú', 'menu', '', 'mobile-shade')}<div class="workspace"><header class="topbar"><div class="topbar-left">${btn(icon('menu'), 'menu', '', 'icon-button mobile-toggle')}${btn(icon('menu'), 'compact', '', 'icon-button desktop-toggle')}<span class="top-context">${manage() ? 'Mi espacio de enseñanza' : 'Mi espacio de aprendizaje'}</span></div>${btn(icon('search') + '<span>Buscar en RETAMAT</span><kbd>Ctrl K</kbd>', 'search', '', 'search-trigger')}<div class="topbar-right"><button type="button" class="icon-button reader-opener" data-study-action="read" aria-label="Escuchar instrucciones" title="Escuchar instrucciones"><svg viewBox="0 0 24 24" class="icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 9h4l5-5v16l-5-5H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14"/></svg></button>${btn(icon('moon'), 'theme', '', 'icon-button')}${btn(icon('bell') + (unread ? `<span class="notice-dot">${unread > 9 ? '9+' : unread}</span>` : ''), 'nav', 'notices', 'icon-button notification-button')}${btn('<span class="avatar">' + esc(u.name[0]) + '</span>', 'nav', 'profile', 'avatar-button')}</div></header><aside class="reader-controls" hidden aria-label="Controles de lectura"><span class="reader-status" role="status"></span><button type="button" class="secondary" data-study-action="pause-read">Pausar / reanudar</button><button type="button" class="secondary" data-study-action="stop-read">Detener</button></aside><main id="main" tabindex="-1"><div class="breadcrumb">${btn('Mi espacio', 'nav', 'home', 'text-button')}<span>/</span><span>${title}</span></div><div class="page-heading"><div><p class="eyebrow">${manage() ? 'ACOMPAÑA CADA AVANCE' : 'UN PASO MÁS CERCA'}</p><h1>${view === 'home' ? 'Hola, ' + esc(u.name.split(' ')[0]) : view === 'group' ? esc(model.group(key).name) : title}</h1><p>${sub}</p></div>${['progress','reports','group','activity'].includes(view)?btn('Descargar PDF','download-pdf',view,'secondary'):''}<span class="role-chip">${icon(manage() ? 'users' : 'target')}${roleLabel(u.role)}</span></div>${body}</main><footer class="app-footer"><strong>RETAMAT</strong><span>Un paso a la vez. Un logro más.</span><span>Comprende · Practica · Avanza</span></footer></div></div>`;
  }
  const topicName = (id) => model.data().topics.find((t) => t.id === id)?.name || id;
  const lessonCard = (l) => `<article class="panel lesson-card" data-topic="${esc(l.topic)}"><div class="lesson-visual">${topicArt(l.topic)}<span class="visual-label">EXPLORA / ${esc(topicName(l.topic))}</span></div><div class="card-top"><span class="tag">${esc(topicName(l.topic))}</span>${btn((model.settings().bookmarks || []).includes(l.id) ? '★' : '☆', 'bookmark', l.id, 'bookmark-button')}</div><span class="lesson-level">NIVEL ${l.level.toString().padStart(2, '0')}</span><h3>${esc(l.title)}</h3><p>${esc(l.concept.slice(0, 125))}…</p><footer><small>${l.count} preguntas · práctica guiada</small>${btn(icon('arrow'), 'lesson', l.id, 'circle-button')}</footer></article>`;
  function metrics(rows) {
    return `<section class="metrics">${rows.map(([label, value, note, i]) => `<article class="panel metric"><div><p>${label}</p><span class="metric-value">${value}</span><small>${note}</small></div><span class="metric-symbol">${icon(i)}</span></article>`).join('')}</section>`;
  }
  function home() {
    const d = model.data(), u = user(), p = model.stats(), groups = model.groups(), plan = model.studyPlan();
    const mytasks = d.tasks.filter(t => t.active && t.due > Date.now() && groups.some(g => g.id === t.group));
    const pending = mytasks.filter(t => !d.activities.some(a => a.task === t.id && a.owner === u.id && a.done));
    const agenda = (manage() ? mytasks : pending).filter(t => t.due <= Date.now() + 7 * 86400000).sort((a,b) => a.due - b.due);
    const goal = model.settings().goal || 20, ratio = Math.min(100, Math.round(p.weekly / goal * 100));
    const next = model.recommendations().find(r => r.lesson)?.lesson;
    const resume = plan.pending[0];
    const hero = `<div class="welcome-grid"><section class="dashboard-hero"><div class="hero-copy"><span class="pill">${manage() ? 'TU AULA, LLENA DE POSIBILIDADES' : 'PEQUEÑOS PASOS. GRANDES IDEAS.'}</span><h2>${manage() ? 'Enseñar también<br>es inspirar.' : 'Entenderlo<br>cambia todo.'}</h2><p>${manage() ? 'Prepara retos que despierten la curiosidad y acompaña cada descubrimiento.' : 'Un espacio para pensar, equivocarte y descubrir de lo que eres capaz.'}</p>${manage() ? btn('Ir a mis grupos ' + icon('arrow'),'nav','groups','yellow') : resume ? btn('Retomar mi práctica ' + icon('arrow'),'activity',resume.id,'yellow') : next ? btn('Comenzar una lección ' + icon('arrow'),'lesson',next.id,'yellow') : btn('Explorar los temas ' + icon('arrow'),'nav','topics','yellow')}<span class="hero-footnote">${icon('check')} ${manage() ? 'Todo lo que necesitas, en tu aula.' : 'Aprende con explicaciones, no sólo respuestas.'}</span></div>${mathArt()}</section><section class="panel weekly-focus"><div class="section-top"><span class="eyebrow">${manage() ? 'TU CENTRO DE ENSEÑANZA' : 'TU META SEMANAL'}</span>${icon('target')}</div>${manage() ? `<div class="teacher-focus-icon">${icon('users')}</div><h2>Ideas que se<br>convierten en retos.</h2><p>Diseña preguntas, organiza actividades y revisa resultados.</p>${btn('Preparar preguntas ' + icon('arrow'),'nav','bank','secondary')}` : `<div class="goal-ring" style="--completion:${ratio}%" role="img" aria-label="${ratio}% de la meta semanal"><div><strong>${ratio}<small>%</small></strong><span>de tu meta</span></div></div><h3>${p.weekly} de ${goal} respuestas</h3><p>${p.weekly >= goal ? '¡Meta alcanzada! Cada práctica cuenta.' : 'Avanza un poco cada día. Tú marcas el ritmo.'}</p><div class="goal-footer"><span>${plan.streak} ${plan.streak === 1 ? 'día' : 'días'} de constancia</span>${btn('Ajustar','goal','','text-button')}</div>`}</section></div>`;
    const overview = manage() ? metrics([['Estudiantes',new Set(groups.flatMap(g => g.members)).size,'En tus grupos','users'],['Grupos',groups.length,'Espacios compartidos','book'],['Actividades abiertas',mytasks.length,'Con plazo disponible','clock'],['Preguntas propias',d.exercises.filter(e => e.owner === u.id && e.active).length,'En tu banco','target']]) : metrics([['Respuestas',p.answered,'Intentos que te hacen avanzar','book'],['Aciertos',p.percent + '%',p.correct + ' respuestas correctas','target'],['Completadas',p.completed,'Actividades terminadas','trophy'],['Constancia',plan.streak + (plan.streak === 1 ? ' día' : ' días'),'Tu racha de estudio','clock']]);
    const topics = `<div class="section-title"><div><p class="eyebrow">UN MUNDO POR DESCUBRIR</p><h2>¿Qué quieres aprender?</h2></div>${btn('Ver lecciones ' + icon('arrow'),'nav','topics','text-button')}</div><div class="subject-grid">${d.topics.filter(t => t.active).map(t => `<article class="topic-card" data-topic="${esc(t.id)}"><div class="topic-illustration">${topicArt(t.id)}</div><span class="eyebrow">${d.lessons.filter(l => l.topic === t.id && l.active).length} LECCIONES</span><h3>${esc(t.name)}</h3><p>${esc(t.subtitle)}</p><footer><small>Descubre el tema</small>${btn(icon('arrow'),'topic',t.id,'circle-button')}</footer></article>`).join('')}</div>`;
    const actions = `<div class="section-title"><div><p class="eyebrow">DA FORMA A TUS IDEAS</p><h2>El siguiente paso de tu aula</h2></div></div><div class="three-grid">${[['users','Organiza tu grupo','Un código para reunir a tus estudiantes.','groups'],['book','Diseña tus preguntas','Retos con respuestas y procedimientos.','bank'],['trophy','Comparte un desafío','Una nueva forma de practicar juntos.','rooms']].map(([i,t,p,v]) => `<article class="panel action-card"><span class="action-icon">${icon(i)}</span><h3>${t}</h3><p>${p}</p>${btn('Comenzar ' + icon('arrow'),'nav',v,'text-button')}</article>`).join('')}</div>`;
    const agendaPanel = `<section class="panel agenda"><div class="section-top"><div><p class="eyebrow">QUE NO SE TE PASE</p><h2>${manage() ? 'Agenda del aula' : 'Próximas entregas'}</h2></div>${icon('clock')}</div>${agenda.slice(0,3).map(t => `<div class="agenda-row"><span class="agenda-icon">${icon(t.exam ? 'clock' : 'book')}</span><div><strong>${esc(t.title)}</strong><small>${date(t.due)}</small></div>${btn(icon('arrow'),'group',t.group,'icon-button')}</div>`).join('') || `<div class="designed-empty"><span>${icon('check')}</span><strong>Todo en orden</strong><p>No tienes entregas en los próximos siete días.</p></div>`}${btn('Abrir calendario ' + icon('arrow'),'nav','calendar','text-button')}</section>`;
    const max = Math.max(1,...plan.days.map(day => day.count));
    const weekly = `<section class="panel weekly-chart"><div class="section-top"><div><p class="eyebrow">LA CONSTANCIA SUMA</p><h2>Tu semana</h2></div>${icon('chart')}</div><div class="mini-bars" role="img" aria-label="Respuestas por día: ${esc(plan.days.map(day => day.label + ' ' + day.count).join(', '))}">${plan.days.map(day => `<div class="mini-day"><span>${day.count}</span><div class="bar-track"><i style="height:${day.count / max * 100}%"></i></div><small>${esc(day.label.replace('.',''))}</small></div>`).join('')}</div><p class="small">Respuestas guardadas de los últimos siete días.</p>${btn('Ver mi progreso ' + icon('arrow'),'nav','progress','text-button')}</section>`;
    return `<div class="home-dashboard">${hero}${overview}${learningHome()}<div class="home-content"><div class="home-main">${manage() ? actions : topics}${!manage() ? recommendationCards() : `<section class="panel teacher-report-callout"><span class="action-icon">${icon('chart')}</span><div><p class="eyebrow">ACOMPAÑA CADA AVANCE</p><h2>El progreso cuenta una historia.</h2><p>Consulta las entregas y detecta qué necesita refuerzo.</p></div>${btn('Ver reportes ' + icon('arrow'),'nav','reports','secondary')}</section>`}</div><aside class="home-aside">${agendaPanel}${!manage() ? weekly : `<section class="panel mentor-note"><span class="eyebrow">UNA IDEA PARA TU CLASE</span><h3>Pregunta también<br>“¿cómo lo pensaste?”</h3><p>Un procedimiento explica mucho más que una respuesta.</p>${btn('Abrir desafíos ' + icon('arrow'),'nav','rooms','text-button')}</section>`}</aside></div></div>`;
  }
  function topics() {
    const d = model.data();
    const ls = d.lessons.filter((l) => l.active && d.topics.some((t) => t.id === l.topic && t.active) && (topicFilter === 'all' || l.topic === topicFilter) && (!favoritesOnly || (model.settings().bookmarks || []).includes(l.id)) && normalize(l.title + ' ' + l.concept).includes(normalize(lessonQuery)));
    return `<form data-form="filter" class="panel filter-bar">${field('Buscar una idea', 'query', lessonQuery, 'search', 'placeholder="Ecuaciones, círculo, fracciones…"')}${select('Tema', 'topic', [['all', 'Todos los temas'], ...d.topics.filter((t) => t.active).map((t) => [t.id, t.name])], topicFilter)}<button class="primary">Buscar</button>${btn(favoritesOnly ? 'Ver todas' : 'Mis favoritas', 'favorites', '', 'secondary')}</form><div class="section-title"><h2>${ls.length} lecciones disponibles</h2><span class="small">Tres temas · diez niveles de dificultad</span></div><div class="three-grid">${ls.map(lessonCard).join('')}</div>${!ls.length ? empty('No encontramos una lección', 'Prueba otra palabra o quita los filtros.', btn('Limpiar filtros', 'clear-filters')) : ''}`;
  }
  function lesson() {
    const l = model.data().lessons.find((l) => l.id === key && l.active);
    if (!l) throw Error('Esta lección no está disponible.');
    const savedNote = model.data().notes.find((n) => n.user === user().id && n.lesson === l.id);
    const note = noteDraft && noteDraft.user === user().id && noteDraft.lesson === l.id ? { text: noteDraft.text } : savedNote;
    return `<div class="lesson-layout"><aside class="panel lesson-index"><span class="tag">NIVEL ${l.level}</span><h3>${esc(topicName(l.topic))}</h3><ol><li>El concepto</li><li>Ejemplo resuelto</li><li>Tu práctica</li><li>Tus apuntes</li></ol>${btn('Volver a lecciones', 'nav', 'topics', 'text-button')}</aside><article class="panel lesson-body"><p class="eyebrow">COMPRENDE EL PORQUÉ</p><h2>${esc(l.title)}</h2><p>${esc(l.concept)}</p><div class="equation-block">${esc(l.example)}</div><h3>Un paso a la vez</h3>${steps(l.steps)}<div class="quick-actions">${btn('Ver explicación animada', 'explain', l.id, 'secondary')}${btn('Practicar ' + icon('arrow'), 'practice', l.id)}${btn('Elegir formato', 'practice-format', l.id, 'secondary')}${btn('Guardar en favoritas', 'bookmark', l.id, 'secondary')}</div><section class="note-editor"><h3>Tu espacio de apuntes</h3><p class="small">Tus apuntes son personales y se guardan en tu cuenta.</p><form data-form="note" data-id="${l.id}" data-original="${esc(noteDraft && noteDraft.user === user().id && noteDraft.lesson === l.id ? noteDraft.original : savedNote?.text || '')}">${area('Mi apunte', 'text', note?.text || '', 6000).replace(' required', '')}<p class="small note-save-status" role="status">${noteDraft && noteDraft.user === user().id && noteDraft.lesson === l.id ? 'Tienes un apunte pendiente de guardar. Copia el texto si existe un conflicto antes de volver a la versión guardada.' : 'Guardado automático al dejar de escribir.'}</p><button class="secondary">Guardar apunte</button>${btn('Volver al texto guardado', 'discard-note-draft', l.id, 'text-button')}<p class="form-error" role="alert" hidden></p></form></section></article></div>`;
  }
  function path() {
    const d = model.data(),
      p = model.stats();
    return recommendationCards() + `<section class="panel intro-panel spacer"><span class="tag">COMPRENDE · PRACTICA · REFUERZA</span><h2>Una ruta construida contigo</h2><p>Se considera dominada una lección con una práctica completa de al menos 80% de aciertos. Las siguientes sugerencias usan tus resultados guardados.</p>${btn('Actualizar evaluación', 'nav', 'diagnostic', 'secondary')}</section><div class="path-grid">${d.topics.filter((t) => t.active).map((t) => {
      const ls = d.lessons.filter((l) => l.topic === t.id && l.active).sort((a, b) => a.level - b.level),
        mastered = ls.filter((l) => p.activities.some((a) => a.lesson === l.id && a.done && score(a) / a.total >= .8));
      const next = ls.find((l) => !mastered.includes(l)) || ls[0];
      return `<article class="panel"><span class="topic-mini" data-topic="${t.id}">${esc(t.symbol)}</span><h2>${esc(t.name)}</h2><p>${mastered.length} de ${ls.length} lecciones dominadas</p><progress aria-label="Lecciones dominadas de ${esc(t.name)}" value="${mastered.length}" max="${Math.max(1, ls.length)}"></progress><ol class="path-list">${ls.map((l) => `<li class="${mastered.includes(l) ? 'mastered' : ''}"><span>${mastered.includes(l) ? icon('check') : l.level}</span><div><strong>${esc(l.title)}</strong><small>${mastered.includes(l) ? 'Dominada' : next?.id === l.id ? 'Siguiente paso' : 'Para explorar'}</small></div>${btn(icon('arrow'), 'lesson', l.id, 'icon-button')}</li>`).join('')}</ol></article>`;
    }).join('')}</div>`;
  }
  const typeLabel = (q) => ({
    number: 'Respuesta numérica',
    choice: 'Opción múltiple',
    boolean: 'Verdadero / falso',
    image: 'Ejercicio con imagen'
  })[q.type || 'number'];
  const answerText = (q, value) => RetamatModel.answerLabel(q, value);
  const grade = (a) => RetamatModel.scoreInfo(a);
  const activityTopic = (a) => a.mode === 'diagnostic' ? 'Evaluación inicial' : new Set(a.questions.map((q) => q.topic)).size > 1 ? 'Temas combinados' : topicName(a.topic);
  function questionMedia(q) {
    const m = q.media;
    if (!m) return '';
    if (m.kind === 'upload') return `<figure class="question-image"><img src="${esc(m.src)}" alt="${esc(m.alt)}"><figcaption>${esc(m.alt)}</figcaption></figure>`;
    const a = m.a,
      b = m.b;
    let drawing = '';
    if (m.kind === 'rectangle') {
      const k = 130 / Math.max(a, b),
        w = a * k,
        h = b * k,
        x = (400 - w) / 2,
        y = (180 - h) / 2;
      drawing = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#dce6ff" stroke="#315ff4" stroke-width="3"/><text x="200" y="${y - 12}" text-anchor="middle">${a} unidades</text><text x="${x + w + 12}" y="${y + h / 2}" text-anchor="start">${b}</text>`;
    }
    if (m.kind === 'circle') drawing = `<circle cx="200" cy="100" r="65" fill="#e7f4ee" stroke="#158571" stroke-width="3"/><line x1="200" y1="100" x2="265" y2="100" stroke="#158571" stroke-width="3"/><circle cx="200" cy="100" r="4" fill="#158571"/><text x="224" y="87">r = ${a}</text>`;
    if (m.kind === 'fraction') {
      const w = Math.min(36, 340 / b),
        left = (400 - w * b) / 2;
      drawing = Array.from({
        length: b
      }, (_, i) => `<rect x="${left + i * w}" y="60" width="${w - 3}" height="65" rx="4" fill="${i < a ? '#7959e8' : '#f0ecff'}" stroke="#7959e8"/>`).join('');
    }
    if (m.kind === 'equation') drawing = `<path d="M200 30v115 M130 145h140 M75 55h250 M90 55l-35 70h70z M310 55l-35 70h70z" fill="none" stroke="#315ff4" stroke-width="3"/><rect x="62" y="78" width="34" height="27" rx="6" fill="#dce6ff"/><text x="79" y="97" text-anchor="middle">x</text><text x="109" y="80" text-anchor="middle">+${b}</text><text x="310" y="100" text-anchor="middle">${a + b}</text>`;
    return `<figure class="question-image"><svg viewBox="0 0 400 190" role="img" aria-label="${esc(m.alt)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(m.alt)}</title>${drawing}</svg><figcaption>${esc(m.alt)}</figcaption></figure>`;
  }
  function answerControl(q) {
    if (!['choice', 'boolean'].includes(q.type)) return field('Tu respuesta', 'answer', '', 'text', 'required maxlength="80" placeholder="Un número o una fracción, por ejemplo 3/4" autocomplete="off"');
    const options = q.type === 'boolean' ? ['Falso', 'Verdadero'] : q.options;
    return `<fieldset class="answer-options"><legend>Selecciona una respuesta</legend>${options.map((option, i) => `<label class="answer-option"><input type="radio" name="answer" value="${i}" required><span class="option-letter">${q.type === 'boolean' ? i ? 'V' : 'F' : String.fromCharCode(65 + i)}</span><span>${esc(option)}</span></label>`).join('')}</fieldset>`;
  }

  let studentPreview = null;
  const reportURL = (type, extra = {}) => '/api/espacio/reporte.pdf?' + new URLSearchParams({tipo:type,...extra});
  function examControl(q,index,value='') {
    if (!['choice','boolean'].includes(q.type)) return field('Tu respuesta','answer_'+index,value,'text','maxlength="80" placeholder="Puedes dejarla pendiente" autocomplete="off"');
    const options=q.type==='boolean'?['Falso','Verdadero']:q.options;
    return `<fieldset class="answer-options"><legend>Tu respuesta</legend>${options.map((option,i)=>`<label class="answer-option"><input type="radio" name="answer_${index}" value="${i}" ${String(value)===String(i)?'checked':''}><span>${esc(option)}</span></label>`).join('')}<label class="answer-option"><input type="radio" name="answer_${index}" value="" ${value===''?'checked':''}><span>Dejar pendiente</span></label></fieldset>`;
  }
  function examEditor(a) {
    const saved=Object.values(a.drafts||{}).filter(x=>String(x).trim()).length;
    return `<div class="exam-intro"><span class="tag">BORRADOR DEL EXAMEN</span><h2>Revisa antes de entregar</h2><p>Hay ${saved} de ${a.total} respuestas guardadas. Puedes modificar cualquier respuesta mientras quede tiempo. Al vencer el plazo se entregan las respuestas guardadas.</p></div><form data-form="exam-review" data-id="${a.id}" data-version="${a.draftVersion||0}"><div class="exam-question-list">${a.questions.map((q,i)=>`<section class="exam-question" id="pregunta-${i+1}"><span class="tag">PREGUNTA ${i+1} · ${q.points??1} PUNTO(S)</span><h3>${esc(q.prompt)}</h3><p>${esc(q.instruction)}</p>${questionMedia(q)}${examControl(q,i,a.drafts?.[i]||'')}</section>`).join('')}</div><p class="form-error" hidden role="alert"></p><div class="exam-actions"><button class="secondary" type="submit">Guardar borrador</button>${btn('Revisar y entregar examen','final-exam',a.id)}</div><p class="small">Guardar borrador permite seguir editando. Entregar examen cierra tu intento definitivamente.</p></form>`;
  }
  function examAnswers(f,a) {const data=new FormData(f);return a.questions.map((_,i)=>String(data.get('answer_'+i)||''));}
  let examFlushPromise=null;
  async function flushExamDraft(force=false) {
    const f=document.querySelector('form[data-form="exam-review"]');if(!f)return;
    if(force)f.dataset.dirty='yes';
    if(examFlushPromise)return examFlushPromise;
    examFlushPromise=(async()=>{while(f.isConnected&&f.dataset.dirty==='yes'){
      const a=model.activity(f.dataset.id),answers=examAnswers(f,a),version=Number(f.dataset.version);f.dataset.dirty='saving';
      try{await model.saveExamDraft(a.id,answers,version);f.dataset.version=String(model.activity(a.id).draftVersion);if(f.dataset.dirty==='saving')f.dataset.dirty='no';}
      catch(e){f.dataset.dirty='yes';throw e;}
    }})();
    try{await examFlushPromise;}finally{examFlushPromise=null;}
  }
  function filesDialog(type,id) {
    const d=model.data(),row=(type==='task'?d.tasks:d.activities).find(x=>x.id===id);
    if(!row)throw Error('Actividad no encontrada.');
    const t=type==='task'?row:d.tasks.find(t=>t.id===row.task),g=d.groups.find(g=>g.id===t?.group),now=Date.now()+(model.clockOffset||0);
    const upload=type==='task'?(user().role==='admin'||user().role==='teacher'&&g?.owner===user().id):row.owner===user().id&&t&&!t.exam&&t.active&&(t.legacyNoDue||t.due>now);
    const list=(row.attachments||[]).map(f=>`<li><a href="/api/espacio/archivos/${encodeURIComponent(f.id)}" download>${esc(f.name)}</a><small>${(f.size/1024).toFixed(1)} KB</small></li>`).join('');
    modal(type==='task'?'Archivos de la actividad':'Evidencias de la entrega',`<ul class="attachment-list">${list||'<li>Todavía no hay archivos.</li>'}</ul>${upload?`<form data-form="attach-file" data-type="${type}" data-id="${id}"><label>Adjuntar archivo<input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required></label><p class="small">PDF o imagen, máximo 5 MB por archivo y cinco archivos por actividad o entrega.</p><p class="form-error" hidden role="alert"></p><button class="primary" type="submit">Guardar archivo</button></form>`:''}`);
  }
  function readFileBase64(file) {return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.readAsDataURL(file);});}
  function previewStudent(index=0) {
    if(!studentPreview)return;const t=studentPreview.task,q=t.questions[index];
    modal('Vista previa como estudiante',`<div class="preview-student"><span class="tag">SIMULACIÓN · NO CREA ENTREGAS</span><h2>${esc(t.title)}</h2><p>${esc(studentPreview.group)} · ${t.exam?'Examen de '+t.duration+' minutos':'Tarea'}</p><p>${esc(t.instructions)}</p><p class="small">${t.attachments?.length||0} archivo(s) de instrucciones · Cierre: ${date(t.due)}</p><div class="question-stage"><span class="tag">PREGUNTA ${index+1} DE ${t.questions.length}</span><h3>${esc(q.prompt)}</h3>${questionMedia(q)}<fieldset disabled>${examControl(q,index)}</fieldset></div><div class="quick-actions">${index?btn('Anterior','preview-page',String(index-1),'secondary'):''}${index+1<t.questions.length?btn('Siguiente','preview-page',String(index+1)):''}</div><p class="small">Las soluciones están ocultas. Esta vista no guarda respuestas ni consume intentos.</p></div>`);
  }
  function recoveryCodeForm(email='',info='') {
    form('Restablecer contraseña con código de respaldo','recovery-reset',(info?`<p>${esc(info)}</p>`:'<p>Ingresa el correo de tu cuenta, tu código de recuperación (de 8 caracteres generado al registrarte) y tu nueva contraseña.</p>')+field('Correo de tu cuenta','email',email,'email','required maxlength="150" autocomplete="email"')+field('Código de recuperación','code','','text','required minlength="6" maxlength="12" autocomplete="off" placeholder="Ejemplo: A7K2-9M4P"')+field('Nueva contraseña','password','','password','required minlength="10" maxlength="128" autocomplete="new-password"')+field('Repite la contraseña','repeat','','password','required minlength="10" maxlength="128" autocomplete="new-password"')+'<p class="small">Usa al menos diez caracteres con letras y números. Al restablecerla recibirás un nuevo código de respaldo.</p>','','Actualizar contraseña');
  }
  function recoveryReset(token) {
    auth();if(!/^[a-f0-9]{64}$/.test(token)){notice('El enlace de recuperación no es válido.',true);return;}
    form('Crea tu nueva contraseña','recovery-reset',field('Nueva contraseña','password','','password','required minlength="10" maxlength="128" autocomplete="new-password"')+field('Repite la contraseña','repeat','','password','required minlength="10" maxlength="128" autocomplete="new-password"')+'<p class="small">Usa letras y números.</p>',`data-token="${token}"`,'Actualizar contraseña');
  }
  function liveUpdate() {
    if(!user())return;
    const bell=document.querySelector('.notification-button'),count=model.data().notifications.filter(n=>n.user===user().id&&!n.read).length;
    if(bell){bell.querySelector('.notice-dot')?.remove();if(count)bell.insertAdjacentHTML('beforeend',`<span class="notice-dot">${count>9?'9+':count}</span>`);}
    const chat=document.querySelector('[data-form="chat"] [name="text"]'),text=chat?.value,focused=chat===document.activeElement;
    if(dialog.open||noteDraft||noteFlushPromise||view==='activity'&&!model.activity(key).done)return;
    if(view==='room'){render();const input=document.querySelector('[data-form="chat"] [name="text"]');if(input&&text){input.value=text;if(focused)input.focus();}return;}
    if(document.activeElement?.matches('input,textarea,select')||document.querySelector('form[data-form="profile"]:focus-within'))return;
    if(['home','groups','group','rooms','notices','reports','progress','calendar'].includes(view))render();
  }

  function activity() {
    const a = model.activity(key),
      released = model.released(a),
      owner = a.owner === user().id,
      t = model.data().tasks.find((t) => t.id === a.task),
      comment = model.data().settings[a.owner]?.feedback?.[a.id];
    let body;
    if (a.examReview && !a.done && owner) { body=examEditor(a); } else if (feedback) {
      body = `<div class="answer-feedback ${(t?.exam || a.simulation) && !released ? 'neutral' : feedback.correct ? 'correct' : 'incorrect'}"><span class="feedback-symbol">${icon((t?.exam || a.simulation) && !released ? 'save' : feedback.correct ? 'check' : 'book')}</span><h2>${(t?.exam || a.simulation) && !released ? 'Respuesta registrada' : feedback.correct ? '¡Respuesta correcta!' : 'Vamos a comprenderlo'}</h2>${(t?.exam || a.simulation) && !released ? '<p>La respuesta quedó guardada. Los resultados se mostrarán cuando corresponda: al terminar el simulacro o según la configuración del docente.</p>' : `<p>${esc(feedback.q.explanation)}</p><p>Respuesta correcta: <strong>${esc(answerText(feedback.q))}</strong></p>${steps(feedback.q.solution_steps)}`} ${btn(a.done ? 'Ver resultado' : 'Siguiente pregunta ' + icon('arrow'), 'next')}</div>`;
    } else if (a.done || !owner) {
      body = `<div class="result-summary"><span class="tag">${a.done ? 'ACTIVIDAD COMPLETADA' : 'REVISIÓN DOCENTE'}</span><div class="score-circle"><strong>${released ? score(a) + '/' + a.total : icon('shield')}</strong><span>${released ? 'aciertos' : 'registrado'}</span></div>${released ? `<p class="weighted-grade">${grade(a).earned}/${grade(a).total} puntos · Calificación ${grade(a).grade}/10</p>` : ''}<h2>${!released ? 'Tu entrega está guardada' : score(a) / a.total >= .8 ? '¡Un logro más!' : 'Cada intento te ayuda a avanzar'}</h2><p>${a.mode === 'diagnostic' ? 'Nivel recomendado: ' + a.level + ' de 10. ' : ''}${!released ? 'Los resultados se habilitan después del cierre si el docente activa su publicación.' : a.attempts.length + ' respuestas enviadas. Las preguntas sin responder cuentan como cero aciertos.'}</p><div class="quick-actions">${btn('Mi progreso', 'nav', 'progress')}${released ? btn('Exportar revisión CSV', 'export-review', a.id, 'secondary') : ''}${btn('Seguir aprendiendo', 'nav', 'topics', 'secondary')}${owner && released && a.attempts.some((x) => !x.correct) ? btn('Repasar mis errores', 'review-activity', a.id, 'secondary') + btn('Ejercicios nuevos de refuerzo', 'smart-review-activity', a.id, 'secondary') : ''}${!owner && a.task ? btn('Comentar entrega', 'comment', a.id, 'secondary') : ''}</div></div>${released ? `<div class="review-list"><h3>Revisa tus respuestas</h3>${model.activityReview(a.id).map((row) => {
        const q = row.question,x = row.attempt;
        return `<details class="answer-review"><summary><span class="${x?.correct ? 'correct-text' : 'incorrect-text'}">${x?.correct ? '✓' : x ? '○' : '—'}</span> Pregunta ${row.question.originalNumber || row.index + 1}: ${esc(q.prompt)}</summary><div class="review-meta"><span class="badge ${x?.correct ? 'success' : 'waiting'}">${x ? x.correct ? 'Correcta' : 'Por reforzar' : 'Sin responder'}</span><strong>${row.earned}/${row.points} puntos</strong></div>${questionMedia(q)}${q.type === 'choice' ? `<ol class="review-options" type="A">${q.options.map((option, index) => `<li class="${index === q.answer ? 'correct-text' : ''}">${esc(option)}${index === q.answer ? ' · Respuesta correcta' : ''}</li>`).join('')}</ol>` : ''}<p>${owner ? 'Tu respuesta' : 'Respuesta registrada'}: ${x ? esc(answerText(q, x.answer)) : 'No se registró una respuesta.'}</p><p>Respuesta correcta: ${esc(answerText(q))}</p><p>${esc(q.explanation)}</p>${steps(q.solution_steps)}</details>`;
      }).join('')}</div>` : ''}`;
    } else {
      const q = a.questions[a.attempts.length];
      body = `<div class="question-stage"><p class="eyebrow">PREGUNTA ${(a.attempts.length + 1).toString().padStart(2, '0')}</p><p>${esc(q.instruction)}</p><h2>${esc(q.prompt)}</h2><div class="question-meta"><span class="tag">${typeLabel(q)}</span><span class="tag">${esc(topicName(q.topic))} · NIVEL ${q.level}</span><span>${q.points ?? 1} punto(s)</span></div>${questionMedia(q)}<form data-form="answer" data-id="${a.id}" data-step="${a.attempts.length}">${answerControl(q)}<p class="form-error" hidden role="alert"></p><button class="primary">${t?.exam || a.simulation ? 'Guardar respuesta' : 'Comprobar respuesta'} ${icon('arrow')}</button></form>${a.mode === 'practice' && !a.simulation ? RetamatStudy.toolsMarkup(a) + `<aside id="guided-hints" class="guided-hints" aria-live="polite">${hintContent(a,q,a.attempts.length)}</aside>` : ''}<p class="small">Acepta punto o coma decimal. Puedes escribir fracciones como 3/4.</p></div>`;
    }
    if (a.deadline && !a.done && owner) {
      timer = setInterval(async () => {
        const seconds = Math.max(0, Math.ceil((a.deadline - Date.now() - (model.clockOffset || 0)) / 1000));
        const el = $('#exam-clock');
        if (el) el.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
        if (!seconds) {
          clearInterval(timer);
          try {await model.refresh();feedback = null;render();} catch (e) {notice(e.message, true);}
        }
      }, 1000);
    }
    return `<div class="activity-layout"><aside class="panel activity-guide"><span class="tag">${a.simulation ? 'SIMULACRO' : a.dailyKey ? 'RETO DIARIO' : a.smartReview ? 'REPASO INTELIGENTE' : a.review ? 'REPASO DIRIGIDO' : t?.exam ? 'EXAMEN' : a.mode === 'diagnostic' ? 'EVALUACIÓN' : a.mode === 'challenge' ? 'DESAFÍO' : 'PRÁCTICA'}</span><h3>${esc(activityTopic(a))}</h3><p>Nivel ${a.level} / 10</p>${a.smartReview ? `<p class="small">Preguntas nuevas de los temas y niveles en los que fallaste. Tus entregas anteriores se conservan.</p>` : a.review ? `<p class="small">${a.reviewOriginals} pregunta(s) de tus errores${a.total > a.reviewOriginals ? ' y ' + (a.total - a.reviewOriginals) + ' de refuerzo del mismo nivel' : ''}. Este repaso no cambia la entrega original.</p>` : ''}<div class="activity-position"><strong>${a.examReview&&!a.done?Object.values(a.drafts||{}).filter(x=>String(x).trim()).length:a.attempts.length}</strong><span>/ ${a.total} respondidas</span></div><progress aria-label="Preguntas respondidas" value="${a.examReview&&!a.done?Object.values(a.drafts||{}).filter(x=>String(x).trim()).length:a.attempts.length}" max="${a.total}"></progress>${a.simulation && !a.done ? btn('Finalizar simulacro','finish-simulation',a.id,'secondary') : ''}${a.deadline && !a.done ? '<div class="exam-clock"><small>Tiempo restante</small><strong id="exam-clock">' + Math.max(0, Math.ceil((a.deadline - Date.now() - (model.clockOffset || 0)) / 60000)) + ' min</strong><p>El tiempo continúa al salir de la pantalla. El servidor comprueba el plazo antes de aceptar cada respuesta.</p></div>' : '<p class="small">Lee con calma. Una estrategia clara vale más que memorizar.</p>'}</aside><section class="panel activity-panel">${body}${a.task?`<div class="quick-actions spacer">${btn(owner?'Mis evidencias':'Ver evidencias','files-activity',a.id,'secondary')}${btn('Instrucciones adjuntas','files-task',a.task,'secondary')}</div>`:''}${comment ? `<aside class="teacher-comment"><h3>Comentario de ${esc(comment.author)}</h3><p>${esc(comment.text)}</p></aside>` : ''}</section></div>`;
  }
  function progress() {
    const p = model.stats();
    const history = p.activities.filter((a) => (historyMode === 'all' || a.mode === historyMode) && (historyState === 'all' || (historyState === 'done' ? a.done : !a.done)));
    historyPage = Math.max(0, Math.min(historyPage, Math.ceil(history.length / 20) - 1));
    const visibleHistory = history.slice(historyPage * 20, (historyPage + 1) * 20);
    return metrics([['Respuestas', p.answered, 'Con resultados visibles', 'book'], ['Aciertos', p.percent + '%', p.correct + ' correctas', 'target'], ['Completadas', p.completed, 'Actividades de tu cuenta', 'trophy']]) + `<div class="dashboard-columns"><section class="panel"><h2>Avance por tema</h2><div class="topic-progress">${p.topics.map((t) => `<div><div class="section-top"><strong>${t.name}</strong><span>${t.answered ? t.percent + '%' : 'Sin respuestas'}</span></div><progress aria-label="${esc(t.name)}" value="${t.percent}" max="100"></progress><small>${t.answered} respuestas visibles</small></div>`).join('')}</div></section><section class="panel"><span class="eyebrow">LA CONSTANCIA SUMA</span><h2>Últimos siete días</h2><div class="week-chart" role="img" aria-label="Respuestas por día durante la última semana">${Array.from({
      length: 7
    }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (6 - i));
      const end = new Date(start);end.setDate(end.getDate() + 1);
      const count = p.visibleActivities.flatMap((a) => a.attempts).filter((x) => x.created >= start.getTime() && x.created < end.getTime()).length;
      return `<div><span style="height:${Math.max(4, Math.min(120, count * 8))}px" title="${count} respuestas"></span><strong>${count}</strong><small>${start.toLocaleDateString('es-MX', {
        weekday: 'narrow'
      })}</small></div>`;
    }).join('')}</div><p class="small">El avance refleja respuestas guardadas, sin cifras de ejemplo.</p></section></div><div class="section-title"><h2>Tu historial</h2>${btn('Exportar CSV', 'export-progress', '', 'secondary')}</div><form data-form="history-filter" class="panel filter-bar">${select('Tipo de actividad', 'mode', [['all', 'Todas'], ['practice', 'Prácticas'], ['diagnostic', 'Evaluaciones iniciales'], ['assignment', 'Tareas y exámenes'], ['challenge', 'Desafíos']], historyMode)}${select('Estado', 'state', [['all', 'Todos'], ['done', 'Completadas'], ['pending', 'En curso']], historyState)}<button class="primary">Filtrar historial</button></form><p class="small spacer">${history.length} actividades encontradas. Hasta veinte por página.</p>${history.length ? activityTable(visibleHistory) + `<div class="history-pagination"><button type="button" class="secondary" data-action="history-page" data-id="-1" ${historyPage === 0 ? 'disabled' : ''}>Anterior</button><span>Página ${historyPage + 1} de ${Math.ceil(history.length / 20)}</span><button type="button" class="secondary" data-action="history-page" data-id="1" ${(historyPage + 1) * 20 >= history.length ? 'disabled' : ''}>Siguiente</button></div>` : empty('Sin actividades con estos filtros', 'Cambia el tipo o el estado para consultar tu historial.', btn('Explorar lecciones', 'nav', 'topics'))}`;
  }
  function activityTable(rows, teacher = false) {
    const snapshot = model.data();
    return `<section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>${teacher ? 'Estudiante' : 'Actividad'}</th><th>Fecha</th><th>Avance</th><th>Resultado</th><th></th></tr></thead><tbody>${rows.map((a) => `<tr><td><strong>${teacher ? esc(snapshot.users.find((u) => u.id === a.owner)?.name) : esc(snapshot.topics.find((t) => t.id === a.topic)?.name || a.topic)}</strong><small>${a.task ? esc(snapshot.tasks.find((t) => t.id === a.task)?.title) : a.mode === 'diagnostic' ? 'Evaluación inicial' : a.room ? 'Desafío' : a.review ? 'Repaso de errores' : 'Práctica'}</small></td><td>${date(a.created)}</td><td><span class="badge ${a.done ? 'success' : 'waiting'}">${a.done ? 'Completada' : a.attempts.length + '/' + a.total}</span></td><td>${model.released(a) ? score(a) + '/' + a.total + `<small>${grade(a).earned}/${grade(a).total} puntos · ${grade(a).grade}/10</small>` : 'Pendiente de publicación'}</td><td>${btn(teacher ? 'Revisar' : 'Abrir', 'activity', a.id, 'text-button')}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function mistakes() {
    const rows = model.reviewCandidates(mistakeTopic),d = model.data();
    return `<form data-form="mistake-filter" class="panel filter-bar">${select('Tema que quieres reforzar', 'topic', [['all', 'Todos los temas'], ...d.topics.map((t) => [t.id, t.name])], mistakeTopic)}<button class="primary">Filtrar errores</button>${rows.length ? btn('Crear repaso dirigido', 'review-errors', mistakeTopic, 'secondary') + btn('Repaso con ejercicios nuevos', 'smart-review', mistakeTopic, 'primary') : ''}</form><p class="small spacer">Errores distintos con resultados visibles, ordenados del más reciente al más antiguo. El repaso toma hasta seis; si hay menos de tres, agrega preguntas de refuerzo del mismo tema y nivel.</p>${rows.length ? `<div class="two-grid">${rows.map((q) => `<article class="panel"><span class="tag">${esc(topicName(q.topic))} · NIVEL ${q.level}</span><h3>${esc(q.prompt)}</h3>${questionMedia(q)}<details><summary>Comprender el procedimiento</summary><p>Respuesta correcta: ${esc(answerText(q))}</p><p>${esc(q.explanation)}</p>${steps(q.solution_steps)}</details><div class="quick-actions spacer">${btn('Practicar este nivel', 'practice-topic', q.topic + '/' + q.level, 'secondary')}</div></article>`).join('')}</div>` : empty('Sin errores visibles para este filtro', 'Prueba otro tema o continúa con tus prácticas. Los exámenes todavía no publicados no se incluyen.', btn('Practicar', 'nav', 'topics'))}`;
  }
  function notes() {
    const rows = model.personalNotes(noteQuery);
    return `<form data-form="note-filter" class="panel filter-bar">${field('Buscar en tus apuntes', 'query', noteQuery, 'search', 'maxlength="150" placeholder="Título o contenido…"')}<button class="primary">Buscar</button>${btn('Exportar todos mis apuntes', 'export-notes', '', 'secondary')}</form><div class="section-title"><h2>${rows.length} apuntes encontrados</h2></div>${rows.length ? `<div class="two-grid">${rows.map((n) => `<article class="panel note-card"><span class="tag">MI APUNTE</span><h3>${esc(n.title)}</h3><p class="note-content">${esc(n.text)}</p><small>Guardado: ${date(n.updated || n.created)}</small><div class="quick-actions spacer">${btn('Editar apunte', 'lesson', n.lesson, 'secondary')}${btn('Eliminar', 'delete-note', n.lesson, 'text-button')}</div></article>`).join('')}</div>` : empty('No hay apuntes para mostrar', 'Prueba otra búsqueda o escribe un apunte desde una lección.', btn('Abrir lecciones', 'nav', 'topics'))}`;
  }
  function plan() {
    const p = model.studyPlan();
    return metrics([['Tu racha', p.streak + (p.streak === 1 ? ' día' : ' días'), 'Hasta hoy o ayer; respuestas visibles', 'trophy'], ['Hoy', p.today + ' respuestas', 'Un paso diario para aprender', 'target'], ['Por continuar', p.pending.length, 'Prácticas y evaluaciones personales', 'book']]) + `<section class="panel study-week"><div class="section-title"><div><p class="eyebrow">TU CONSTANCIA</p><h2>Últimos siete días</h2></div>${btn('Ver progreso', 'nav', 'progress', 'secondary')}</div><div class="study-days">${p.days.map((day) => `<div class="study-day ${day.count ? 'studied' : ''}"><span>${esc(day.label)}</span><strong>${day.count}</strong><small>respuestas</small></div>`).join('')}</div><p class="small spacer">La racha cuenta días del calendario de este dispositivo. Los exámenes sin resultados publicados no se incluyen.</p></section><div class="section-title"><h2>Continúa donde te quedaste</h2></div>${p.pending.length ? activityTable(p.pending) : empty('Sin prácticas pendientes', 'Elige una lección y comienza con seis preguntas.', btn('Abrir lecciones', 'nav', 'topics'))}<div class="section-title"><h2>Entregas de los próximos siete días</h2>${btn('Abrir calendario', 'nav', 'calendar', 'text-button')}</div>${p.upcoming.length ? `<div class="two-grid">${p.upcoming.map((t) => `<article class="panel"><span class="badge waiting">${esc(t.status.label)}</span><h3>${esc(t.title)}</h3><p>${esc(t.groupName)}</p><p>Cierre: ${date(t.due)}</p>${btn('Abrir grupo', 'group', t.group, 'secondary')}</article>`).join('')}</div>` : empty('Sin entregas pendientes esta semana', 'Las tareas y exámenes de tus grupos aparecerán aquí.')}<div class="section-title"><h2>Logros de tu cuenta</h2></div><div class="three-grid">${p.achievements.map((a) => `<article class="panel achievement ${a.earned ? 'earned' : ''}"><span class="badge ${a.earned ? 'success' : 'waiting'}">${a.earned ? 'Alcanzado' : 'Por alcanzar'}</span><h3>${esc(a.title)}</h3><p>${esc(a.detail)}</p></article>`).join('')}</div>${recommendationCards()}`;
  }
  function storage() {
    const r = model.storageReport(),labels = { users: 'Cuentas', groups: 'Grupos', lessons: 'Lecciones', exercises: 'Preguntas del banco', tasks: 'Tareas y exámenes', activities: 'Prácticas y entregas', notes: 'Apuntes', rooms: 'Salas', notifications: 'Notificaciones' };
    const size = (bytes) => (bytes / 1024).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' KB';
    return metrics([['Respaldo JSON', size(r.jsonBytes), 'Tamaño del archivo que se exporta', 'save'], ['Revisión', r.revision, 'Cambios guardados en esta instalación', 'check'], ['Imágenes almacenadas', r.images, 'Incluye copias de evaluaciones', 'book']]) + `<section class="panel intro-panel horizontal"><div><h2>Conserva una copia de tu trabajo</h2><p>El JSON exportado ocupa ${size(r.jsonBytes)}; su representación de texto se estima en ${size(r.estimatedBytes)}.</p></div>${btn('Exportar respaldo', 'backup', '', 'secondary')}</section><section class="panel table-panel spacer"><div class="table-wrap"><table><thead><tr><th>Colección</th><th>Registros</th></tr></thead><tbody>${r.collections.map((c) => `<tr><td>${labels[c.key]}</td><td>${c.count}</td></tr>`).join('')}</tbody></table></div></section><p class="small spacer">Cada lectura comprueba el formato y las referencias básicas. El respaldo contiene datos personales; las contraseñas reales no se exportan. No se eliminan registros desde esta pantalla.</p>`;
  }
  function groups() {
    const groups = model.groups();
    return `<section class="panel intro-panel horizontal"><div><span class="eyebrow">APRENDER TAMBIÉN ES COMPARTIR</span><h2>${manage() ? 'Construye tu próximo grupo' : 'Tu aula, tus retos'}</h2><p>${manage() ? 'Comparte un código y prepara tareas o exámenes.' : 'Pide al docente el código de tu grupo.'}</p></div>${btn(manage() ? 'Crear grupo ' + icon('plus') : 'Unirme a un grupo ' + icon('plus'), manage() ? 'new-group' : 'join-group')}</section><div class="section-title"><h2>${groups.length} grupos en tu espacio</h2></div>${groups.length ? `<div class="three-grid">${groups.map((g) => `<article class="panel group-card"><span class="action-icon">${icon('users')}</span><span class="tag">${g.members.length} ESTUDIANTES</span><h3>${esc(g.name)}</h3><p>${esc((g.description || '').slice(0, 140))}</p><span class="badge ${g.enrollmentOpen === false ? 'waiting' : 'success'}">Inscripciones ${g.enrollmentOpen === false ? 'pausadas' : 'abiertas'}</span><p>${model.data().tasks.filter((t) => t.group === g.id && t.active).length} actividades abiertas</p><footer><span class="invite-code">${g.code}</span>${btn('Entrar ' + icon('arrow'), 'group', g.id, 'secondary')}</footer></article>`).join('')}</div>` : empty('Tu grupo empieza con un código', manage() ? 'Crea un grupo y comparte su código con tus estudiantes.' : 'Tu docente puede crear un grupo y compartir su código.')}`;
  }
  function group() {
    const g = model.group(key),
      d = model.data(),
      manager = user().role === 'admin' || g.owner === user().id,
      tasks = d.tasks.filter((t) => t.group === g.id),
      deliveries = d.activities.filter((a) => tasks.some((t) => t.id === a.task));
    return `<section class="invite-panel"><div><span class="eyebrow">COMPARTE EL SIGUIENTE RETO</span><h2>Código de invitación</h2><p>Inscripciones ${g.enrollmentOpen === false ? 'pausadas para nuevos miembros' : 'abiertas'}. Los miembros actuales conservan su acceso.</p></div><span class="invite-code large">${g.code}</span><div class="quick-actions">${btn('Copiar código', 'copy', g.code, 'secondary')}${manager ? btn('Editar grupo', 'edit-group', g.id, 'secondary') + btn(g.enrollmentOpen === false ? 'Abrir inscripciones' : 'Pausar inscripciones', 'enrollment', g.id, 'secondary') : ''}</div></section>${g.description ? `<section class="panel spacer"><h2>Acerca de este grupo</h2><p class="note-content">${esc(g.description)}</p></section>` : ''}${manager ? `<div class="section-title"><h2>${g.members.length} estudiantes</h2><div class="quick-actions">${btn('Exportar lista CSV', 'group-roster', g.id, 'secondary')}${btn('Publicar aviso', 'group-notice', g.id, 'secondary')}</div></div><section class="panel"><div class="member-chips">${g.members.map((uid) => {
      const u = d.users.find((u) => u.id === uid);
      return `<span class="member-chip"><span class="avatar">${esc(u.name[0])}</span>${esc(u.name)}</span>`;
    }).join('') || '<p>Comparte el código para recibir a tus alumnos.</p>'}</div></section>` : ''}<div class="section-title"><h2>Tareas y exámenes</h2>${manager ? '<div class="quick-actions">' + btn('Asignar tarea', 'new-task', g.id, 'secondary') + btn('Crear examen', 'new-exam', g.id) + '</div>' : ''}</div>${tasks.length ? `<div class="two-grid">${tasks.map((t) => {
      const mine = deliveries.find((a) => a.owner === user().id && a.task === t.id),
        expired = t.due <= Date.now(),
        scheduled = t.exam && t.opens > Date.now();
      return `<article class="panel task-card"><div class="card-top"><span class="tag">${t.exam ? 'EXAMEN' : 'TAREA'} · ${t.questions.length} PREGUNTAS</span><span class="badge ${!t.active || expired ? 'closed' : scheduled ? 'waiting' : 'success'}">${!t.active ? 'Cerrada' : expired ? 'Plazo terminado' : scheduled ? 'Programada' : 'Disponible'}</span></div><h3>${esc(t.title)}</h3><p>${esc(t.instructions || 'Resuelve con calma y revisa tu procedimiento.')}</p><div class="task-dates"><span>${icon('clock')} Cierre: ${date(t.due)}</span>${t.exam ? '<span>Apertura: ' + date(t.opens) + ' · ' + t.duration + ' minutos</span>' : ''}</div><div class="quick-actions">${btn('Archivos', 'files-task', t.id, 'secondary')}${manager ? btn('Vista como alumno','student-preview',t.id,'secondary')+btn('Duplicar', 'duplicate', t.id, 'secondary') + (t.exam ? btn('Ver preguntas', 'questions', t.id, 'text-button') : '') + (t.active ? btn('Cerrar actividad', 'close-task', t.id, 'text-button') : '') : mine ? btn(mine.done ? 'Ver entrega' : 'Continuar', 'activity', mine.id) : t.active && !expired && !scheduled ? btn(t.exam ? 'Comenzar examen' : 'Resolver tarea', 'start-task', t.id) : '<small>Consulta las fechas y el estado de la actividad.</small>'}</div></article>`;
    }).join('')}</div>` : empty('El próximo reto llegará aquí', manager ? 'Asigna un tema o prepara un examen con tu banco.' : 'Tu docente publicará las actividades en este espacio.')}${manager && deliveries.length ? '<div class="section-title"><h2>Entregas del grupo</h2></div>' + activityTable(deliveries, true) : ''}`;
  }
  function bank() {
    const d = model.data(),
      u = user(),
      es = d.exercises.filter((e) => (u.role === 'admin' || e.owner === u.id) && (!bankQuery || normalize(e.prompt + ' ' + e.instruction + ' ' + topicName(e.topic)).includes(normalize(bankQuery))) && (bankType === 'all' || (e.type || 'number') === bankType) && (bankState === 'all' || (bankState === 'active' ? e.active : !e.active)));
    return `<section class="panel intro-panel horizontal"><div><p class="eyebrow">TUS PREGUNTAS, TU MANERA DE ENSEÑAR</p><h2>Diseña una buena pregunta</h2><p>Prepara respuestas numéricas, opción múltiple, verdadero/falso o imágenes con su procedimiento.</p></div>${btn('Crear pregunta ' + icon('plus'), 'new-exercise')}</section><form data-form="bank-filter" class="panel filter-bar spacer">${field('Buscar en tu banco', 'query', bankQuery, 'search', 'maxlength="150"')}${select('Formato', 'type', [['all', 'Todos'], ['number', 'Numérica'], ['choice', 'Opción múltiple'], ['boolean', 'Verdadero / falso'], ['image', 'Imagen']], bankType)}${select('Estado', 'state', [['all', 'Todas'], ['active', 'Activas'], ['archived', 'Archivadas']], bankState)}<button class="primary">Filtrar preguntas</button></form><div class="section-title"><h2>${es.length} preguntas encontradas</h2></div>${es.length ? `<div class="two-grid">${es.map((e) => `<article class="panel"><div class="card-top"><span class="tag">${esc(topicName(e.topic))} · NIVEL ${e.level}</span><span class="badge ${e.active ? 'success' : 'closed'}">${e.active ? 'Activa' : 'Archivada'}</span></div><h3>${esc(e.prompt)}</h3><p>${esc(e.instruction)}</p><p class="small">${typeLabel(e)} · ${e.points ?? 1} punto(s)</p>${questionMedia(e)}<details><summary>Respuesta y procedimiento</summary><p>Respuesta: ${esc(answerText(e))}</p>${steps(e.solution_steps)}<p>${esc(e.explanation)}</p></details><div class="quick-actions spacer">${btn('Editar', 'edit-exercise', e.id, 'secondary')}${btn('Usar como plantilla', 'template', e.id, 'text-button')}${e.active ? btn('Archivar', 'archive-exercise', e.id, 'text-button') : ''}</div></article>`).join('')}</div>` : empty('Sin preguntas para mostrar', 'Cambia los filtros o crea una pregunta para tu banco.')}`;
  }
  function recommendationCards() {
    const rows = model.recommendations();
    return `<section class="recommendations"><div class="section-title"><div><p class="eyebrow">SEGÚN TUS RESPUESTAS RECIENTES</p><h2>Tu siguiente paso recomendado</h2></div>${btn('Abrir mi ruta', 'nav', 'path', 'text-button')}</div><div class="three-grid">${rows.map((r) => `<article class="panel recommendation-card"><span class="badge ${r.priority === 'reinforce' ? 'waiting' : 'success'}">${r.priority === 'reinforce' ? 'Reforzar' : r.priority === 'explore' ? 'Explorar' : 'Avanzar'}</span><h3>${esc(r.name)}</h3><p>${esc(r.reason)}</p>${r.lesson ? `<div class="recommended-lesson"><small>LECCIÓN SUGERIDA · NIVEL ${r.lesson.level}</small><strong>${esc(r.lesson.title)}</strong>${btn('Abrir lección ' + icon('arrow'), 'lesson', r.lesson.id, 'secondary')}</div>` : '<p>No hay una lección activa para este tema.</p>'}</article>`).join('')}</div><p class="small spacer">Se usan hasta veinte respuestas visibles por tema. Las soluciones de exámenes todavía no publicados se excluyen.</p></section>`;
  }
  function calendarDateKey(value) {
    const d = new Date(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function calendar() {
    const all = model.calendarItems(),
      items = all.filter((t) => calendarFilter === 'all' || t.status.code === calendarFilter),
      start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1),
      offset = (start.getDay() + 6) % 7,
      gridStart = new Date(start.getFullYear(), start.getMonth(), 1 - offset),
      today = calendarDateKey(Date.now());
    const monthLabel = start.toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric'
      }),
      current = items.filter((t) => new Date(t.due).getFullYear() === start.getFullYear() && new Date(t.due).getMonth() === start.getMonth()).sort((a, b) => a.due - b.due);
    return `<section class="panel calendar-panel"><header class="calendar-toolbar"><div><p class="eyebrow">ORGANIZA TU SIGUIENTE RETO</p><h2>${esc(monthLabel)}</h2></div><div class="quick-actions">${btn('Anterior', 'calendar-month', '-1', 'secondary')}${btn('Hoy', 'calendar-today', '', 'secondary')}${btn('Siguiente', 'calendar-month', '1', 'secondary')}</div></header><form data-form="calendar-filter" class="calendar-filter">${select('Mostrar actividades', 'status', [['all', 'Todas'], ['pending', manage() ? 'Abiertas' : 'Pendientes'], ['done', 'Entregadas'], ['expired', manage() ? 'Plazo terminado' : 'Vencidas'], ['closed', 'Cerradas']], calendarFilter)}<button class="secondary">Aplicar</button></form><div class="calendar-scroll"><div class="calendar-weekdays" aria-hidden="true">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((x) => '<span>' + x + '</span>').join('')}</div><div class="calendar-grid" role="list" aria-label="Actividades de ${esc(monthLabel)}">${Array.from({
      length: 42
    }, (_, i) => {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
        dayKey = calendarDateKey(d),
        events = items.filter((t) => calendarDateKey(t.due) === dayKey);
      return `<article class="calendar-day ${d.getMonth() !== start.getMonth() ? 'outside' : ''} ${dayKey === today ? 'today' : ''}" role="listitem"><span class="day-number">${d.getDate()}</span>${events.slice(0, 2).map((t) => `<button class="calendar-event ${t.status.code}" data-action="group" data-id="${t.group}" title="${esc(t.title + ' · ' + t.status.label)}"><span>${t.exam ? 'EXAMEN' : 'TAREA'}</span><strong>${esc(t.title)}</strong><small>${t.status.label}</small></button>`).join('')}${events.length > 2 ? btn('+' + (events.length - 2) + ' más', 'calendar-day', dayKey, 'text-button') : ''}</article>`;
    }).join('')}</div></div><div class="calendar-legend"><span><i class="pending"></i>${manage() ? 'Abierta' : 'Pendiente'}</span><span><i class="done"></i>Entregada</span><span><i class="expired"></i>${manage() ? 'Plazo terminado' : 'Vencida'}</span><span><i class="closed"></i>Cerrada</span></div></section><div class="section-title"><h2>${current.length} cierres en este mes</h2></div>${current.length ? `<div class="calendar-agenda">${current.map((t) => `<article class="panel agenda-row"><span class="agenda-icon">${icon(t.exam ? 'clock' : 'book')}</span><div><strong>${esc(t.title)}</strong><small>${esc(t.groupName)} · Cierre: ${date(t.due)}${t.exam ? ' · Apertura: ' + date(t.opens) : ''}</small></div><span class="badge ${t.status.code === 'done' ? 'success' : t.status.code === 'closed' ? 'closed' : 'waiting'}">${t.status.label}</span>${btn('Abrir grupo', 'group', t.group, 'secondary')}</article>`).join('')}</div>` : empty('Sin actividades en este mes', 'Cambia de mes o revisa el filtro para consultar otros plazos.')}`;
  }
  function calendarDay(dayKey) {
    const items = model.calendarItems().filter((t) => calendarDateKey(t.due) === dayKey && (calendarFilter === 'all' || t.status.code === calendarFilter));
    modal('Actividades del ' + dayKey, items.map((t) => `<article class="calendar-modal-item"><span class="tag">${t.exam ? 'EXAMEN' : 'TAREA'}</span><h3>${esc(t.title)}</h3><p>${esc(t.groupName)} · ${t.status.label}</p><p>Cierre: ${date(t.due)}</p>${btn('Abrir grupo', 'group', t.group, 'secondary')}</article>`).join(''));
  }
  function reports() {
    const d = model.report(reportGroup),
      students = d.students.filter((r) => reportFilter === 'all' || reportFilter === 'support' && r.needsSupport || reportFilter === 'pending' && r.pending || reportFilter === 'overdue' && r.overdue);
    return `<section class="panel intro-panel horizontal"><div><p class="eyebrow">ACOMPAÑA CON INFORMACIÓN</p><h2>Seguimiento de tus alumnos</h2><p>Se consideran únicamente las tareas y exámenes de los grupos seleccionados. Puedes identificar pendientes y temas que necesitan refuerzo.</p></div>${btn('Exportar seguimiento', 'export-followup', '', 'secondary')}</section><form data-form="report-filter" class="panel filter-bar spacer">${select('Grupo', 'group', [['all', 'Todos mis grupos'], ...model.groups().filter((g) => user().role === 'admin' || g.owner === user().id).map((g) => [g.id, g.name])], reportGroup)}${select('Estudiantes', 'status', [['all', 'Todos'], ['support', 'Necesitan seguimiento'], ['pending', 'Con actividades pendientes'], ['overdue', 'Con entregas vencidas']], reportFilter)}<button class="primary">Filtrar</button></form>${metrics([['Estudiantes', d.students.length, 'En los grupos seleccionados', 'users'], ['Necesitan seguimiento', d.students.filter((r) => r.needsSupport).length, 'Según entregas y resultados', 'target'], ['Entregas registradas', d.deliveries.length, 'De actividades asignadas', 'book']])}<section class="panel report-criteria"><h3>Cómo se identifica el seguimiento</h3><p>Se señala cuando hay una entrega vencida sin completar, menos de 60% de aciertos con al menos tres respuestas, o un promedio de entregas menor a 6/10. Es una ayuda para acompañar al alumno, no un diagnóstico.</p></section><div class="section-title"><h2>Temas que conviene reforzar</h2></div><div class="three-grid">${d.topics.map((t) => `<article class="panel"><span class="tag">${esc(t.name)}</span><h2 class="spacer">${t.percent}%</h2><p>${t.correct}/${t.answered} respuestas correctas</p><progress class="spacer" value="${t.percent}" max="100" aria-label="Aciertos en ${esc(t.name)}"></progress></article>`).join('') || '<p>Aún no hay respuestas en los grupos seleccionados.</p>'}</div><div class="section-title"><h2>${students.length} estudiantes en esta vista</h2></div><section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Completadas</th><th>Pendientes</th><th>Vencidas</th><th>Aciertos</th><th>Promedio</th><th>Seguimiento</th></tr></thead><tbody>${students.map((r) => `<tr><td><strong>${esc(r.name)}</strong><small>${esc(r.groups.join(', '))}</small></td><td>${r.completed}</td><td>${r.pending}</td><td>${r.overdue}</td><td>${r.percent === null ? 'Sin respuestas' : r.percent + '%'}</td><td>${r.grade === null ? 'Sin entregas' : r.grade + '/10'}</td><td><span class="badge ${r.needsSupport ? 'waiting' : 'success'}">${r.needsSupport ? 'Revisar' : 'En seguimiento'}</span><small>${esc(r.reason)}</small></td></tr>`).join('') || '<tr><td colspan="7">No hay estudiantes con este filtro.</td></tr>'}</tbody></table></div></section><div class="section-title"><h2>Entregas de tus grupos</h2>${btn('Exportar reporte', 'export-report', '', 'secondary')}</div>${d.deliveries.length ? activityTable(d.deliveries, true) : empty('Cada avance aparecerá aquí', 'Publica una actividad y resuélvela desde una cuenta de estudiante.')}`;
  }
  function rooms() {
    const u = user(),
      rs = model.data().rooms.filter((r) => u.role === 'admin' || r.owner === u.id || r.members.includes(u.id));
    return `<section class="panel intro-panel horizontal"><div><p class="eyebrow">UN MISMO RETO, DISTINTAS ESTRATEGIAS</p><h2>Aprender puede ser un desafío</h2><p>Los participantes reciben las mismas preguntas. La clasificación usa las respuestas registradas.</p></div>${btn(manage() ? 'Crear sala' : 'Unirme a una sala', manage() ? 'new-room' : 'join-room')}</section><div class="section-title"><h2>Mis salas</h2></div>${rs.length ? `<div class="three-grid">${rs.map((r) => `<article class="panel group-card"><span class="action-icon">${icon('trophy')}</span><span class="badge ${r.status === 'closed' ? 'closed' : 'success'}">${r.status === 'waiting' ? 'En espera' : r.status === 'active' ? 'En curso' : 'Finalizada'}</span><h3>${esc(r.name)}</h3><p>${r.members.length} participantes · ${r.questions.length} preguntas</p><footer><span class="invite-code">${r.code}</span>${btn('Entrar', 'room', r.id, 'secondary')}</footer></article>`).join('')}</div>` : empty('Todavía no hay salas', 'Inscribe a los estudiantes antes de iniciar. Las respuestas se guardan automáticamente; pulsa Actualizar para ver nuevos resultados.')}`;
  }
  function room() {
    const r = model.room(key),
      d = model.data(),
      manager = r.owner === user().id || user().role === 'admin',
      ranking = r.members.map((uid) => {
        const a = d.activities.find((a) => a.owner === uid && a.room === r.id);
        return {
          name: d.users.find((u) => u.id === uid).name,
          points: a ? score(a) : 0,
          answered: a?.attempts.length || 0
        };
      }).sort((a, b) => b.points - a.points);
    return `<section class="panel room-header"><div><span class="tag">${r.status === 'waiting' ? 'EN ESPERA' : r.status === 'active' ? 'EN CURSO' : 'FINALIZADA'}</span><h2>${esc(r.name)}</h2></div><span class="invite-code">${r.code}</span><div class="quick-actions">${manager && r.status === 'waiting' ? btn('Iniciar desafío', 'control-room', 'active') : ''}${manager && r.status !== 'closed' ? btn('Cerrar sala', 'control-room', 'closed', 'secondary') : ''}${r.members.includes(user().id) && r.status === 'active' ? btn('Resolver desafío', 'start-room', r.id) : ''}${btn('Actualizar', 'refresh', '', 'secondary')}</div></section><div class="dashboard-columns"><section class="panel leaderboard"><h2>Clasificación</h2>${ranking.map((x, i) => `<div class="ranking-row"><span class="rank">${i + 1}</span><div><strong>${esc(x.name)}</strong><small>${x.answered}/${r.questions.length} respondidas</small></div><strong>${x.points}<small> puntos</small></strong></div>`).join('') || '<p>Comparte el código para recibir participantes.</p>'}<p class="small">Un punto por acierto. Se conserva el mismo puntaje en un empate.</p></section><section class="panel"><h2>Comparte una estrategia</h2><div class="chat-messages">${r.messages.map((m) => `<article><strong>${esc(m.name)}</strong><p>${esc(m.text)}</p></article>`).join('') || '<p class="small">La conversación de esta sala empieza aquí.</p>'}</div>${r.status !== 'closed' ? `<form data-form="chat" data-id="${r.id}">${field('Mensaje', 'text', '', 'text', 'required maxlength="500"')}<button class="primary">Enviar</button><p class="form-error" hidden role="alert"></p></form>` : '<p>La conversación está cerrada.</p>'}</section></div>`;
  }
  function notices() {
    const ns = model.data().notifications.filter((n) => n.user === user().id);
    return `<div class="section-title"><h2>${ns.filter((n) => !n.read).length} avisos sin leer</h2>${btn('Marcar todos como leídos', 'read-all', '', 'secondary')}</div>${ns.length ? `<div class="notice-list">${ns.map((n) => `<article class="panel notice-card ${n.read ? '' : 'unread'}"><span class="action-icon">${icon('bell')}</span><div><span class="tag">${n.read ? 'LEÍDA' : 'NUEVA'}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${date(n.created)}</small></div>${btn('Abrir', 'notice', n.id, 'secondary')}</article>`).join('')}</div>` : empty('Estás al día', 'Aquí aparecerán actividades de tus grupos y comentarios del docente.')}`;
  }
  function users() {
    const rows = model.data().users.filter((u) => (!userQuery || normalize(u.name + ' ' + u.email).includes(normalize(userQuery))) && (userRole === 'all' || u.role === userRole));
    return `<form data-form="user-filter" class="panel filter-bar">${field('Buscar cuenta', 'query', userQuery, 'search', 'maxlength="150"')}${select('Tipo de cuenta', 'role', [['all', 'Todas'], ['student', 'Estudiante'], ['teacher', 'Docente'], ['admin', 'Administrador']], userRole)}<button class="primary">Buscar usuarios</button></form><p class="small spacer">${rows.length} cuentas encontradas.</p><section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Cuenta</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map((u) => `<tr><td><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></td><td>${roleLabel(u.role)}</td><td><span class="badge ${u.active ? 'success' : 'closed'}">${u.active ? 'Activa' : 'Desactivada'}</span></td><td><div class="quick-actions">${btn('Editar permisos', 'edit-user', u.id, 'text-button')}${btn('Restablecer contraseña', 'reset-password', u.id, 'text-button')}</div></td></tr>`).join('')}</tbody></table></div></section><p class="small spacer">Cambiar roles o contraseñas invalida las sesiones anteriores.</p>`;
  }
  function content() {
    return `<section class="panel intro-panel"><p class="eyebrow">UN CONTENIDO MÁS CLARO</p><h2>Lecciones de la plataforma</h2><p>Los cambios de contenido se guardan y se muestran al actualizar RETAMAT.</p></section><div class="two-grid spacer">${model.data().lessons.map((l) => `<article class="panel"><div class="card-top"><span class="tag">${esc(topicName(l.topic))} · NIVEL ${l.level}</span><span class="badge ${l.active ? 'success' : 'closed'}">${l.active ? 'Activa' : 'Archivada'}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.concept.slice(0, 150))}…</p>${btn('Editar lección', 'edit-lesson', l.id, 'secondary')}</article>`).join('')}</div>`;
  }
  function backups() {
    return `<section class="panel backup-hero"><span class="action-icon">${icon('shield')}</span><div><p class="eyebrow">CONSERVA LO QUE HAS CONSTRUIDO</p><h2>Una copia para seguir avanzando</h2><p>Exporta cuentas, grupos, preguntas, actividades y apuntes de esta edición. El archivo contiene información privada y contenido educativo; no incluye las contraseñas reales.</p>${btn('Exportar respaldo JSON', 'backup')}</div></section><section class="panel spacer"><h2>Restaurar una copia</h2><p>Se revisará el archivo antes de aplicarlo. Las cuentas incluidas deben estar registradas con el mismo correo. Se combina el contenido con los registros existentes, conservando las cuentas y sus contraseñas. Descarga una copia actual antes de importar.</p><form data-form="restore" class="spacer"><label>Archivo JSON de la edición HTML<input type="file" name="file" accept=".json,application/json" required></label>${field('Tu contraseña actual', 'password', '', 'password', 'required autocomplete="current-password"')}${field('Escribe RESTAURAR', 'confirmation', '', 'text', 'required pattern="RESTAURAR"')}<p class="form-error" hidden role="alert"></p><button class="danger">Comprobar y restaurar</button></form><p class="small">El respaldo JSON conserva las referencias de archivos adjuntos.</p></section>`;
  }
  function profile() {
    const u = user(),
      s = model.settings();
    return `<div class="dashboard-columns"><section class="panel"><p class="eyebrow">TU ESPACIO PERSONAL</p><h2>Datos de tu cuenta</h2><form data-form="profile" class="spacer">${field('Nombre completo', 'name', u.name, 'text', 'required minlength="2" maxlength="80"')}<p class="small">${esc(u.email)} · ${roleLabel(u.role)}</p>${field('Contraseña actual (para cambiarla)', 'current', '', 'password', 'autocomplete="current-password"')}${field('Nueva contraseña (opcional)', 'next', '', 'password', 'minlength="10" autocomplete="new-password"')}<p class="form-error" hidden role="alert"></p><button class="primary">Guardar perfil</button></form><hr class="spacer"><p class="eyebrow">RECUPERACIÓN DE ACCESO</p><h3>Código de respaldo</h3><p class="small">Si olvidas tu contraseña o necesitas un nuevo código de recuperación de 8 caracteres, genéralo aquí y guárdalo en un lugar seguro.</p><p>${btn('Generar nuevo código de recuperación', 'generate-backup-code', '', 'secondary')}</p></section><section class="panel"><p class="eyebrow">LECTURA Y COMODIDAD</p><h2>Tu manera de aprender</h2><form data-form="settings" class="spacer">${select('Tamaño del texto', 'font', [['normal', 'Normal'], ['large', 'Grande'], ['extra', 'Muy grande']], s.font || 'normal')}<label class="checkbox"><input name="contrast" type="checkbox" ${s.contrast ? 'checked' : ''}> Alto contraste</label><label class="checkbox"><input name="motion" type="checkbox" ${s.motion ? 'checked' : ''}> Reducir animaciones</label><p class="form-error" hidden role="alert"></p><button class="secondary">Guardar ajustes</button></form></section></div>`;
  }
  function guide() {
    const cards = [['01', 'Entra a tu espacio', 'Inicia sesión con tu cuenta o elige Estudiante o Docente al registrarte. Para probar varios roles, cierra sesión y entra con otra cuenta en RETAMAT.'], ['02', 'Comprende antes de resolver', 'Abre una lección, lee el ejemplo y guarda tus apuntes. La ruta reconoce dominio con una práctica completa de al menos 80%.'], ['03', 'Encuentra tu nivel', 'La evaluación inicial tiene diez preguntas. Cada acierto aumenta un nivel y cada error lo reduce, dentro de uno a diez.'], ['04', 'Organiza el aula', 'El docente crea grupos y publica tareas o exámenes. El alumno se inscribe con el código. Los exámenes tienen un solo intento por cuenta.'], ['05', 'Acompaña el avance', 'Revisa los procedimientos, el historial y los comentarios. Las salas comparten preguntas entre participantes inscritos antes de iniciar.'], ['06', 'Conserva tus datos', 'El administrador exporta y restaura respaldos. También puedes recuperar tu contraseña usando tu código de respaldo generado al registrarte.']];
    return `<div class="three-grid">${cards.map(([n, t, p]) => `<article class="panel guide-card"><span>${n}</span><h3>${t}</h3><p>${p}</p></article>`).join('')}</div><section class="panel spacer"><p class="eyebrow">SEIS HERRAMIENTAS PARA AVANZAR</p><h2>Cómo usar las mejoras</h2><ol class="solution-steps"><li>En una lección, pulsa Elegir formato para practicar con números, opciones, verdadero/falso, imágenes o una combinación.</li><li>El docente combina temas y selecciona preguntas al preparar una actividad. En Revisar preguntas puede asignar el puntaje de cada una. El resultado muestra puntos obtenidos y calificación sobre diez.</li><li>Calendario organiza las actividades por mes. Sus filtros muestran pendientes, entregadas, vencidas o cerradas. Abre una actividad para consultar su grupo.</li><li>Reporte de alumnos permite filtrar por grupo y localizar pendientes, entregas vencidas y temas con más errores. Puedes exportar el seguimiento.</li><li>Las recomendaciones del inicio y de Mi ruta usan hasta veinte respuestas visibles por tema. Refuerzan los temas con menos de 60% de aciertos cuando hay al menos tres respuestas.</li><li>El administrador restablece accesos desde Usuarios. Necesita su contraseña y debe escribir dos veces la nueva contraseña. La cuenta afectada vuelve a iniciar sesión.</li></ol><div class="quick-actions">${btn('Abrir calendario', 'nav', 'calendar', 'secondary')}${btn('Ver mi ruta', 'nav', 'path', 'secondary')}${manage() ? btn('Abrir seguimiento', 'nav', 'reports', 'secondary') : ''}</div></section><section class="panel spacer"><h2>Organiza tu trabajo</h2><ol class="solution-steps"><li>Mi plan de estudio reúne tu racha, las prácticas pendientes y las entregas de la semana. Cuenta únicamente respuestas con resultados visibles.</li><li>En las lecciones, el apunte se guarda al dejar de escribir. Si hay un conflicto entre pestañas, conserva una copia del texto y revisa la versión guardada antes de salir.</li><li>Mis apuntes permite buscar, exportar a TXT y eliminar con confirmación. La exportación contiene únicamente tus apuntes.</li><li>Filtra Mi progreso por tipo y estado; cada página muestra hasta veinte actividades. Su CSV conserva el historial completo.</li><li>El docente puede filtrar su banco de preguntas. El administrador puede buscar cuentas y consultar Estado de los datos para preparar respaldos.</li></ol><div class="quick-actions">${btn('Abrir mi plan', 'nav', 'plan', 'secondary')}${btn('Mis apuntes', 'nav', 'notes', 'secondary')}</div></section><section class="panel spacer"><h2>Repasa y organiza el aula</h2><ol class="solution-steps"><li>En Cuaderno de errores, elige un tema y crea un repaso. Se toman hasta seis preguntas equivocadas con resultados visibles. Si hay menos de tres, se agregan refuerzos del mismo tema y nivel.</li><li>Al terminar una actividad puedes repasar sus errores, revisar preguntas sin responder y exportar su detalle CSV. Un repaso es una práctica nueva y conserva tu entrega original.</li><li>El docente puede describir su grupo y pausar nuevas inscripciones con confirmación. Los alumnos inscritos conservan sus actividades y entregas.</li><li>Exportar lista CSV descarga los miembros del grupo. Publicar aviso crea una notificación para los miembros activos; podrán verla en su cuenta.</li></ol></section>`;
  }

  let supportGroup='all', explanation=null, explanationTimer=null;
  function hintContent(a,q,step){
    const count=Math.min(3,Number(a.hints?.[step]?.count||0));
    return `<div class="hint-heading"><span>${icon('book')} UNA AYUDA A LA VEZ</span><small>${count}/3 pistas</small></div>${count?`<ol>${RLearn.hints(q.topic,q.level).slice(0,count).map(text=>`<li>${esc(text)}</li>`).join('')}</ol>`:'<p class="small">Recibe una estrategia sin descubrir la respuesta.</p>'}${count<3?btn(count?'Ver la siguiente pista':'Necesito una pista','hint',a.id,'text-button'):'<p class="small">Ya tienes las tres pistas. Intenta resolver y comprueba tu respuesta.</p>'}`;
  }
  function learningHome(){
    const badges=RLearn.achievements(model),earned=badges.filter(b=>b.earned).length;
    if(manage())return `<section class="learning-strip"><article class="panel learning-promo"><span class="action-icon">${icon('target')}</span><div><span class="eyebrow">ACOMPAÑAMIENTO</span><h3>Una guía para cada alumno</h3><p>Identifica temas que necesitan refuerzo y una lección para trabajarlos.</p>${btn('Ver seguimiento','nav','support','text-button')}</div></article><article class="panel learning-promo"><span class="action-icon">${icon('save')}</span><div><span class="eyebrow">SIEMPRE A MANO</span><h3>RETAMAT, en tu escritorio</h3><p>Instala un acceso directo a la aplicación en tu dispositivo.</p>${btn('Instalar RETAMAT','install-app','','text-button')}</div></article></section>`;
    const {activity}=RLearn.daily(model);
    return `<section class="learning-strip"><article class="panel learning-promo daily-promo"><span class="action-icon">${icon('clock')}</span><div><span class="eyebrow">HOY TAMBIÉN CUENTA</span><h3>${activity?.done?'Reto de hoy completado':activity?'Tu reto sigue en marcha':'Tu reto diario te espera'}</h3><p>Tres preguntas según tu nivel. Un reto por fecha del centro de México.</p>${btn(activity?.done?'Ver mi resultado':activity?'Continuar reto':'Descubrir el reto',activity?'activity':'start-daily',activity?.id||'','text-button')}</div></article><article class="panel learning-promo"><span class="action-icon">${icon('trophy')}</span><div><span class="eyebrow">CONSTRUYE TU COLECCIÓN</span><h3>${earned} de ${badges.length} insignias</h3><p>Reconoce tus prácticas, temas dominados y días de constancia.</p>${btn('Ver mis logros','nav','achievements','text-button')} ${btn('Instalar app','install-app','','text-button')}</div></article></section>`;
  }
  function dailyPage(){
    if(manage())throw Error('El reto diario está disponible para estudiantes.');
    const {key,activity}=RLearn.daily(model),r=model.recommendations()[0];
    const history=model.data().activities.filter(a=>a.owner===user().id&&a.dailyKey).sort((a,b)=>b.dailyKey.localeCompare(a.dailyKey)).slice(0,7);
    return `<section class="panel daily-hero"><div><span class="tag">${esc(key)} · CENTRO DE MÉXICO</span><h2>Tres preguntas.<br>Un nuevo descubrimiento.</h2><p>${activity?activity.done?'Tu reto está completo. Puedes revisar el resultado; mañana tendrás otro.':'Retoma las respuestas guardadas y termina a tu ritmo.':`Hoy practicarás ${esc(r?.name||'un tema activo')} con dificultad basada en tus respuestas visibles.`}</p><div class="chips"><span>3 preguntas</span><span>Sin cronómetro</span><span>Con pistas</span></div>${btn(activity?.done?'Revisar resultado':activity?'Continuar mi reto':'Comenzar reto de hoy',activity?'activity':'start-daily',activity?.id||'')}</div><span class="daily-emblem">${icon('target')}</span></section><p class="small spacer">La fecha y la dificultad se asignan al comenzar. Volver a entrar abre el mismo reto, incluso después de terminarlo. Tus retos anteriores se conservan.</p><div class="section-title"><h2>Tus últimos retos</h2>${btn('Ver mis logros','nav','achievements','text-button')}</div>${history.length?`<div class="three-grid">${history.map(a=>`<article class="panel daily-history"><span class="eyebrow">${esc(a.dailyKey)}</span><h3>${esc(activityTopic(a))}</h3><p>Nivel ${a.level} · ${a.attempts.length}/${a.total} respuestas</p><span class="badge ${a.done?'success':'waiting'}">${a.done?'Completado':'En curso'}</span>${btn(a.done?'Ver resultado':'Retomar','activity',a.id,'secondary')}</article>`).join('')}</div>`:empty('Tu colección empieza hoy','Completa el primer reto para verlo aquí.')}`;
  }
  function achievementsPage(){
    const badges=RLearn.achievements(model),earned=badges.filter(b=>b.earned).length;
    return `<section class="panel achievement-intro"><div><span class="eyebrow">TU ESFUERZO DEJA HUELLA</span><h2>${earned} de ${badges.length} insignias conseguidas</h2><p>Se calculan con tus actividades guardadas y resultados visibles. Una racha pasada cuenta aunque hoy no hayas practicado.</p></div><span class="achievement-count">${earned}<small>/${badges.length}</small></span></section><div class="badge-grid">${badges.map(b=>`<article class="panel achievement-card ${b.earned?'earned':'locked'}"><span class="medal">${icon(b.icon)}</span><span class="badge ${b.earned?'success':'waiting'}">${b.earned?'CONSEGUIDA':'POR DESCUBRIR'}</span><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p><progress aria-label="Avance de ${esc(b.title)}" value="${Math.min(b.current,b.target)}" max="${b.target}"></progress><small>${Math.min(b.current,b.target)} / ${b.target}</small></article>`).join('')}</div>`;
  }
  function supportPage(){
    const report=RLearn.support(model,supportGroup),priority=report.students.filter(s=>s.priority).length;
    return `<form data-form="support-filter" class="panel filter-bar">${select('Grupo que quieres acompañar','group',[['all','Todos mis grupos'],...model.report('all').groups.map(g=>[g.id,g.name])],supportGroup)}<button class="primary">Consultar</button>${btn('Reporte general','nav','reports','secondary')}</form>${metrics([['Estudiantes',report.students.length,'En los grupos consultados','users'],['Por acompañar',priority,'Según entregas y aciertos','target'],['Grupos',report.groups.length,'Dentro de tu acceso','book']])}<p class="small spacer">Se consideran solamente las tareas y exámenes de tus grupos. Un tema necesita refuerzo si tiene al menos tres respuestas y menos de 60% de aciertos. Las entregas vencidas o un promedio menor a 6/10 también activan seguimiento. Abre la lección sugerida para preparar el refuerzo.</p><div class="support-grid">${report.students.map(student=>`<article class="panel support-card"><div class="section-top"><div><span class="eyebrow">${esc(student.groups.join(' · '))}</span><h2>${esc(student.name)}</h2></div><span class="badge ${student.priority?'waiting':'success'}">${student.priority?'Por acompañar':'Sin alerta'}</span></div><p>${esc(student.reason)}</p><div class="support-summary"><span><strong>${student.overdue}</strong> vencidas</span><span><strong>${student.pending}</strong> pendientes</span><span><strong>${student.percent===null?'—':student.percent+'%'}</strong> aciertos</span></div><small class="small">Última respuesta de aula: ${student.lastAnswer?date(student.lastAnswer):'Sin respuestas registradas'}</small><div class="support-topics">${student.topics.map(t=>`<div><div class="section-top"><strong>${esc(t.name)}</strong><span>${t.percent===null?'Sin datos':t.percent+'% · '+t.answered+' respuestas'}</span></div>${t.needsSupport?`<p class="support-advice">Reforzar nivel ${t.level}. ${t.lesson?`Sugerencia: ${esc(t.lesson.title)}.`:'Revisa el procedimiento con el alumno.'}</p>${t.lesson?btn('Consultar lección sugerida','lesson',t.lesson.id,'text-button'):''}`:`<p class="small">${t.answered<3?'Faltan respuestas para valorar este tema.':'Sin criterio de refuerzo en este tema.'}</p>`}</div>`).join('')}</div></article>`).join('')||empty('Aún no hay alumnos en estos grupos','Comparte el código de inscripción y publica una actividad para comenzar el seguimiento.',btn('Mis grupos','nav','groups'))}</div>`;
  }
  function installationGuide(showButton=true){return `<section class="panel installation-guide spacer"><span class="eyebrow">RETAMAT A UN CLIC</span><h2>Instalar como aplicación</h2><p>Puedes abrir RETAMAT desde un icono y una ventana propia. La instalación conserva las funciones y tu cuenta.</p>${showButton?btn(RInstall.installed()?'Ya está abierta como aplicación':'Instalar RETAMAT','install-app','','secondary'):''}<ol><li>Usa el botón de instalación cuando tu navegador lo permita.</li><li>Si no aparece una ventana automática, busca la opción de instalar o añadir a la pantalla de inicio en el menú de tu navegador.</li></ol></section>`;}
  function stopExplanation(){clearInterval(explanationTimer);explanationTimer=null;}
  function openExplanation(id){
    const lesson=model.data().lessons.find(l=>l.id===id&&l.active);if(!lesson)throw Error('La lección no está disponible.');stopExplanation();explanation={lesson,step:0};
    modal('Comprende paso a paso','<div id="explanation-player"></div>');paintExplanation();
  }
  function explainVisual(lesson,step){
    const original=RMath.baseLessons[Number(lesson.id.replace('lesson-',''))-1];
    const originalMatches=original&&original[4]===lesson.example&&JSON.stringify(original[5])===JSON.stringify(lesson.steps);
    if(originalMatches&&lesson.id==='lesson-4'){
      const parts=step<2?[1,2]:[3];return `<div class="fraction-scene" aria-label="${step<2?'Un cuarto más dos cuartos':'Tres cuartos del mismo entero'}">${parts.map((n,i)=>`<div class="fraction-piece"><div class="fraction-bar">${Array.from({length:4},(_,j)=>`<i class="${j<n?'filled':''}"></i>`).join('')}</div><strong>${n}/4</strong></div>${i<parts.length-1?'<b>+</b>':''}`).join('')}</div>`;
    }
    if(originalMatches&&lesson.id==='lesson-7')return `<div class="area-scene"><div class="area-grid" aria-label="Rectángulo de seis por cuatro: veinticuatro unidades cuadradas">${Array.from({length:24},(_,i)=>`<i class="${step>0?'filled':''}" style="--order:${i}"></i>`).join('')}</div><span>6 cm × 4 cm ${step>0?'= 24 cm²':''}</span></div>`;
    if(originalMatches&&['lesson-16','lesson-17','lesson-18'].includes(lesson.id)){
      const cylinder=lesson.id==='lesson-18',diameter=lesson.id==='lesson-16';
      return `<div class="geometry-explain"><svg viewBox="0 0 330 180" role="img" aria-label="${cylinder?'Cilindro con radio dos centímetros y altura cinco centímetros':diameter?'Círculo de radio dos metros y diámetro cuatro metros':'Círculo de radio tres centímetros'}">${cylinder?`<path d="M90 50V130C90 166 240 166 240 130V50" fill="${step>1?'#b5d48d':'none'}" fill-opacity=".5" stroke="currentColor" stroke-width="2"/><ellipse cx="165" cy="50" rx="75" ry="22" fill="${step?'#b5d48d':'none'}" stroke="currentColor" stroke-width="2"/><path d="M165 50H240" stroke="currentColor" stroke-width="2"/><text x="174" y="42">r = 2 cm</text><text x="248" y="100">5 cm</text>`:`<circle cx="158" cy="85" r="66" fill="${!diameter&&step>1?'#b5d48d':'none'}" fill-opacity=".6" stroke="currentColor" stroke-width="2"/><path d="M${diameter&&step>0?'92':'158'} 85H224" stroke="currentColor" stroke-width="3"/><circle cx="158" cy="85" r="3" fill="currentColor"/><text x="170" y="74">${diameter?'r = 2 m':'r = 3 cm'}</text>`}</svg><strong>${cylinder?(step>=2?'V = 12.56 × 5 = 62.8 cm³':step?'Área de base = 3.14 × 2² = 12.56 cm²':'V = πr²h'):diameter?(step?'d = 2 × 2 = 4 m':'Un diámetro equivale a dos radios'):(step>=2?'A = 3.14 × 9 = 28.26 cm²':step?'r² = 3² = 9':'A = πr²')}</strong></div>`;
    }
    if(originalMatches&&lesson.id==='lesson-1'){
      const formula=['2x + 4 = 14','2x = 10','x = 5','2(5) + 4 = 14'][Math.min(step,3)],operation=['Ambos lados están en equilibrio','−4 en ambos lados','÷2 en ambos lados','Sustituye para comprobar'][Math.min(step,3)];return `<div class="balance-scene"><strong>${esc(formula)}</strong><svg viewBox="0 0 300 100" aria-hidden="true"><path d="M150 25V85M115 85H185M40 25H260M65 25L40 65H90ZM235 25L210 65H260Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="25" r="6" fill="currentColor"/></svg><span>${operation}</span></div>`;
    }
    return `<div class="concept-scene" aria-hidden="true">${topicArt(lesson.topic)}<span>Comprende · Transforma · Comprueba</span></div>`;
  }
  function paintExplanation(){
    const host=$('#explanation-player');if(!host||!explanation)return;const {lesson}=explanation;explanation.step=Math.max(0,Math.min(lesson.steps.length,explanation.step));const step=explanation.step;
    const reduced=model.settings().motion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const focusAction=host.contains(document.activeElement)?document.activeElement.dataset.action:null;
    host.innerHTML=`<div class="explanation-player"><span class="tag">${esc(topicName(lesson.topic))} · NIVEL ${lesson.level}</span><h2>${esc(lesson.title)}</h2><div class="explain-scene" data-step="${step}">${explainVisual(lesson,step)}</div><div class="explain-copy" aria-live="polite"><span class="eyebrow">${step?'PASO '+step+' DE '+lesson.steps.length:'EL PUNTO DE PARTIDA'}</span><h3>${esc(step?lesson.steps[step-1]:lesson.example)}</h3><p>${esc(step===0?lesson.concept:step===lesson.steps.length?'Ahora puedes volver a los pasos o probar una práctica.':'Observa cómo cambia la expresión y conserva el significado de cada operación.')}</p></div><progress value="${step}" max="${lesson.steps.length}" aria-label="Pasos de la explicación"></progress><div class="explain-controls"><button type="button" class="secondary" data-action="explain-prev" ${step===0?'disabled':''}>Anterior</button>${!reduced?btn(explanationTimer?'Pausar':'Reproducir','explain-play','','secondary'):''}<button type="button" class="primary" data-action="explain-next" ${step===lesson.steps.length?'disabled':''}>Siguiente</button></div><p class="small">${reduced?'Animaciones reducidas. Avanza con Anterior y Siguiente.':'Reproducción opcional: un paso cada tres segundos. Puedes pausarla cuando quieras.'}</p></div>`;
    if(focusAction)(host.querySelector(`[data-action="${focusAction}"]:not([disabled])`)||host.querySelector('[data-action="explain-prev"]:not([disabled])'))?.focus({preventScroll:true});
  }
  dialog.addEventListener('close',stopExplanation);

  let study=null,libraryTopic='all',libraryKind='all',libraryQuery='',comparisonGroup='',comparisonFirst='',comparisonSecond='';
  function ensureStudy(){return study||(study=RetamatStudy.create({model:()=>model,notify:notice,reload:render}));}
  function libraryPage(){
    const rows=RetamatStudy.resources.filter(r=>(libraryTopic==='all'||r.topic===libraryTopic)&&(libraryKind==='all'||r.kind===libraryKind)&&normalize(r.title+' '+r.summary).includes(normalize(libraryQuery)));
    return `<section class="panel library-intro"><div><span class="eyebrow">OTRA FORMA DE ENTENDERLO</span><h2>Una idea, varias explicaciones.</h2><p>Los ejemplos y las guías vienen incluidos. Los videos se abren en el sitio de su autor y requieren Internet.</p></div>${icon('book')}</section><form data-form="library-filter" class="panel filter-bar spacer">${field('Buscar material','query',libraryQuery,'search','placeholder="Fracciones, perímetro, signos…"')}${select('Tema','topic',[['all','Todos los temas'],...model.data().topics.map(t=>[t.id,t.name])],libraryTopic)}${select('Material','kind',[['all','Todo'],['example','Ejemplos'],['guide','Guías'],['video','Videos externos']],libraryKind)}<button class="primary">Buscar</button></form><div class="section-title"><h2>${rows.length} recursos para explorar</h2></div><div class="three-grid resource-grid">${rows.map(r=>`<article class="panel resource-card" data-topic="${r.topic}"><div class="resource-art">${topicArt(r.topic)}<span>${r.kind==='video'?'VIDEO EXTERNO':r.kind==='guide'?'GUÍA BREVE':'EJEMPLO RESUELTO'}</span></div><span class="tag">${esc(topicName(r.topic))}</span><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p>${r.kind==='video'?`<a class="secondary resource-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Abrir video · ${esc(r.source)} ↗</a><small>Se abre en otra pestaña.</small>`:btn('Abrir material '+icon('arrow'),'resource',r.id,'secondary')}</article>`).join('')}</div>${rows.length?'':empty('No hay materiales con estos filtros','Prueba otro tema o una búsqueda más corta.')}`;
  }
  function resourceDetail(id){const r=RetamatStudy.resources.find(r=>r.id===id&&r.kind!=='video');if(!r)throw Error('Este material no está disponible.');modal(r.title,`<article class="resource-detail"><span class="tag">${esc(topicName(r.topic))}</span><p>${esc(r.summary)}</p>${steps(r.steps)}${r.lesson?btn('Continuar con la lección','lesson',r.lesson,'secondary'):''}<p class="small">Material de apoyo de RETAMAT.</p></article>`);}
  function simulationPage(){
    if(manage())throw Error('Los simulacros son una herramienta para estudiantes.');
    const activities=model.data().activities.filter(a=>a.owner===user().id&&a.simulation).sort((a,b)=>b.created-a.created),active=activities.find(a=>!a.done);
    return `<section class="panel simulation-hero"><span class="action-icon">${icon('clock')}</span><div><span class="eyebrow">PON A PRUEBA TU ESTRATEGIA</span><h2>Tu ensayo antes del examen.</h2><p>Elige temas, nivel, preguntas y tiempo. Envía una respuesta por pregunta y consulta las soluciones al terminar. El reloj continúa al salir; las preguntas sin responder cuentan como cero aciertos.</p>${active?btn('Retomar simulacro en curso','activity',active.id):''}</div></section><form data-form="simulation" class="panel simulation-form spacer"><h2>Prepara tu simulacro</h2><fieldset class="simulation-topics"><legend>Temas a incluir</legend>${model.data().topics.filter(t=>t.active).map(t=>`<label class="checkbox"><input type="checkbox" name="topic" value="${t.id}" checked> ${esc(t.name)}</label>`).join('')}</fieldset><div class="three-grid">${field('Nivel (1–10)','level',model.recommendations()[0]?.level||1,'number','min="1" max="10" required')}${field('Preguntas (3–10)','count',6,'number','min="3" max="10" required')}${field('Minutos (1–90)','minutes',10,'number','min="1" max="90" required')}</div><p class="form-error" role="alert" hidden></p><button class="primary">${active?'Abrir el simulacro en curso':'Comenzar simulacro'}</button><p class="small">Sin pistas, calculadora ni pizarra integradas durante el simulacro. Puedes escuchar las instrucciones. Se permite un simulacro en curso por cuenta.</p></form><div class="section-title"><h2>Tus últimos simulacros</h2></div>${activities.length?activityTable(activities.slice(0,10)):empty('Aún no has hecho un simulacro','Elige una configuración y comienza cuando estés listo.')}`;
  }
  function comparisonPage(){
    const report=model.report('all'),groups=report.groups;if(!comparisonGroup||!groups.some(g=>g.id===comparisonGroup))comparisonGroup=groups[0]?.id||'';
    const tasks=report.tasks.filter(t=>t.group===comparisonGroup);let result=null,problem='';if(comparisonFirst&&comparisonSecond)try{result=RetamatStudy.compare(model,comparisonFirst,comparisonSecond);}catch(error){problem=error.message;}
    const amount=value=>value===null?'—':value.toFixed(1)+'%',delta=value=>value===null?'—':(value>0?'+':'')+value.toFixed(1)+' puntos porcentuales';
    return `<section class="panel intro-panel"><span class="eyebrow">EL AVANCE, CON CONTEXTO</span><h2>Dos actividades. Un mismo grupo.</h2><p>Compara porcentajes de puntos obtenidos, respetando el peso de cada pregunta. Los promedios usan sólo alumnos con ambas entregas finalizadas; una entrega ausente no se convierte en cero.</p></section>${groups.length?`<form data-form="comparison-group" class="panel filter-bar spacer">${select('Grupo','group',groups.map(g=>[g.id,g.name]),comparisonGroup)}<button class="secondary">Elegir grupo</button></form>`:''}${tasks.length>=2?`<form data-form="comparison" class="panel filter-bar spacer">${select('Actividad inicial','first',tasks.map(t=>[t.id,t.title]),comparisonFirst||tasks[0].id)}${select('Actividad posterior','second',tasks.map(t=>[t.id,t.title]),comparisonSecond||tasks[1].id)}<button class="primary">Comparar resultados</button><p class="form-error" role="alert" ${problem?'':'hidden'}>${esc(problem)}</p></form>`:empty('Necesitas dos actividades del mismo grupo','Publica actividades y reúne entregas antes de comparar.',btn('Mis grupos','nav','groups'))}${result?`${metrics([['Alumnos comparables',result.paired,'Con ambas entregas finalizadas','users'],['Cambio promedio',result.delta===null?'—':(result.delta>0?'+':'')+result.delta.toFixed(1),'En puntos porcentuales','chart'],['Integrantes',result.rows.length,'En el grupo consultado','book']])}<section class="panel comparison-chart"><h2>${esc(result.group.name)}</h2>${[[result.first.title,result.firstMean],[result.second.title,result.secondMean]].map(([title,value])=>`<div><div class="section-top"><strong>${esc(title)}</strong><span>${amount(value)}</span></div><progress max="100" value="${value??0}" aria-label="Promedio de ${esc(title)}"></progress></div>`).join('')}<p class="small">${result.paired?delta(result.delta):'Todavía no hay alumnos con ambas entregas finalizadas.'} · Las actividades pueden tener temas y dificultad diferentes; compara también sus preguntas.</p></section><section class="panel table-panel spacer"><div class="table-wrap"><table><caption class="sr-only">Resultados individuales de ambas actividades</caption><thead><tr><th>Estudiante</th><th>Inicial</th><th>Posterior</th><th>Cambio</th></tr></thead><tbody>${result.rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${amount(row.first)}</td><td>${amount(row.second)}</td><td>${delta(row.delta)}</td></tr>`).join('')}</tbody></table></div></section>`:''}`;
  }
  const views = {
    home,
    library: libraryPage,
    simulation: simulationPage,
    comparison: comparisonPage,
    daily: dailyPage,
    achievements: achievementsPage,
    support: supportPage,
    plan,
    storage,
    calendar,
    topics,
    lesson,
    path,
    progress,
    mistakes,
    notes,
    groups,
    group,
    activity,
    bank,
    reports,
    rooms,
    room,
    notices,
    users,
    content,
    backups,
    profile,
    guide: () => guide() + `<section class="panel spacer accessibility-guide"><h2>Teclado y lectura en voz alta</h2><p>Usa Tab y Mayús + Tab para recorrer controles; Enter o Espacio para activarlos. En el menú, las flechas arriba/abajo recorren opciones y las teclas Inicio/Fin van a los extremos. En celular, Escape cierra el menú y devuelve el foco al botón. Ctrl + K abre la búsqueda.</p><p>El botón de altavoz superior lee las instrucciones y la pregunta visible. Puedes pausar, reanudar y detener la lectura. La voz depende de las voces disponibles en tu navegador. La pizarra tiene un campo escrito como alternativa al dibujo.</p></section>` + installationGuide(),
    diagnostic: () => `<section class="panel diagnostic-intro"><span class="action-icon">${icon('target')}</span><span class="tag">CONOCE TU PUNTO DE PARTIDA</span><h2>Un reto.<br>Diez oportunidades.</h2><p>Comienza en el nivel tres y responde preguntas de álgebra, fracciones y geometría. La dificultad cambia según cada respuesta.</p><div class="chips"><span>10 preguntas</span><span>Sin límite de tiempo</span><span>Retroalimentación inmediata</span></div>${btn('Comenzar evaluación ' + icon('arrow'), 'start-diagnostic')}<p class="small">El resultado orienta tu práctica; no es una calificación oficial.</p></section>`
  };
  function applySettings() {
    const s = model.settings(),
      root = document.documentElement;
    root.dataset.font = s.font || 'normal';
    root.dataset.contrast = s.contrast ? 'high' : 'normal';
    root.dataset.motion = s.motion ? 'reduce' : 'normal';
  }
  function render() {
    clearInterval(timer);
    timer = null;
    if (!user()) {
      auth();
      return;
    }
    applySettings();
    const [route = 'home', raw = ''] = location.hash.slice(1).split('/');
    view = views[route] ? route : 'home';
    try {
      key = decodeURIComponent(raw);
      model.expireExams();
      if (['bank', 'reports', 'support', 'comparison'].includes(view) && !manage()) throw Error('Esta pantalla corresponde al docente.');
      if (['users', 'content', 'backups', 'storage'].includes(view) && user().role !== 'admin') throw Error('Esta pantalla corresponde al administrador.');
      shell(views[view]());
      ensureStudy().mount(view,key);
    } catch (e) {
      shell(empty('No pudimos abrir esta pantalla', e.message, btn('Volver al inicio', 'nav', 'home')));
    }
  }
  const normalize = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function searchItems(query) {
    const d = model.data(),
      base = [['Inicio', 'home', ''], ['Temas y lecciones', 'topics', ''], ['Biblioteca de apoyo','library',''], ...(!manage() ? [['Simulacro de examen','simulation','']] : []), ['Mi ruta', 'path', ''], ['Mi plan de estudio', 'plan', ''], ['Evaluación inicial', 'diagnostic', ''], ['Mi progreso', 'progress', ''], ['Mis apuntes', 'notes', ''], ['Mis logros','achievements',''], ...(!manage() ? [['Reto diario','daily','']] : []), ['Grupos y tareas', 'groups', ''], ['Calendario', 'calendar', ''], ['Desafíos', 'rooms', ''], ['Guía de uso', 'guide', ''], ['Mi perfil', 'profile', ''], ...(manage() ? [['Banco de preguntas', 'bank', ''], ['Reporte de alumnos', 'reports', ''], ['Seguimiento docente','support',''], ['Comparar actividades','comparison','']] : []), ...(user().role === 'admin' ? [['Usuarios', 'users', ''], ['Contenido', 'content', ''], ['Respaldos', 'backups', ''], ['Estado de los datos', 'storage', '']] : [])].map(([label, view, id]) => ({
        label,
        view,
        id,
        kind: 'Pantalla'
      }));
    return [...base, ...d.lessons.filter((l) => l.active).map((l) => ({
      label: l.title,
      view: 'lesson',
      id: l.id,
      kind: topicName(l.topic)
    })), ...model.groups().map((g) => ({
      label: g.name,
      view: 'group',
      id: g.id,
      kind: 'Grupo'
    }))].filter((x) => normalize(x.label + ' ' + x.kind).includes(normalize(query))).slice(0, 10);
  }
  function searchResults(q) {
    const rows = searchItems(q);
    return rows.length ? rows.map((x) => `<button type="button" class="search-result" data-action="result" data-view="${x.view}" data-id="${esc(x.id)}"><span>${icon(x.view === 'group' ? 'users' : 'book')}</span><div><strong>${esc(x.label)}</strong><small>${esc(x.kind)}</small></div>${icon('arrow')}</button>`).join('') : '<p class="search-empty">No encontramos ese contenido. Prueba otra palabra.</p>';
  }
  function openSearch() {
    modal('Encuentra tu siguiente paso', `<form data-form="search">${field('Buscar pantalla, lección o grupo', 'query', '', 'search', 'id="command-query" placeholder="Por ejemplo: fracciones" autocomplete="off"')}<p class="small">Enter abre el primer resultado. Escape cierra la búsqueda.</p><div id="command-results" aria-live="polite">${searchResults('')}</div></form>`);
    $('#command-query')?.focus();
  }
  function exerciseForm(e = {}, copy = false) {
    const type = e.type || 'number';
    form(e.id && !copy ? 'Editar pregunta' : 'Crear pregunta', 'exercise', select('Tipo de pregunta', 'type', [['number', 'Respuesta numérica'], ['choice', 'Opción múltiple'], ['boolean', 'Verdadero / falso'], ['image', 'Ejercicio con imagen']], type) + select('Tema', 'topic', model.data().topics.filter((t) => t.active).map((t) => [t.id, t.name]), e.topic) + `<div class="form-grid">${field('Nivel', 'level', e.level || 3, 'number', 'required min="1" max="10"')}${field('Puntos de la pregunta', 'points', e.points ?? 1, 'number', 'required min="0.25" max="100" step="0.25"')}</div>` + area('Enunciado', 'prompt', e.prompt || '', 1000) + area('Instrucción', 'instruction', e.instruction || 'Resuelve y selecciona o escribe tu respuesta.', 500) + `<div data-answer-panel="numeric" ${['number', 'image'].includes(type) ? '' : 'hidden'}>${field('Respuesta numérica o fracción', 'answer', ['number', 'image'].includes(type) ? e.answer ?? '' : '')}</div><div data-answer-panel="choice" ${type === 'choice' ? '' : 'hidden'}>${area('Opciones, una por línea (de 2 a 6)', 'options', (e.options || []).join('\n'), 1400)}${field('Número de la opción correcta (empieza en 1)', 'correct_option', type === 'choice' ? e.answer + 1 : 1, 'number', 'min="1" max="6"')}</div><div data-answer-panel="boolean" ${type === 'boolean' ? '' : 'hidden'}>${select('La afirmación es', 'truth', [['1', 'Verdadera'], ['0', 'Falsa']], e.answer ?? 1)}</div><div data-answer-panel="image" ${type === 'image' ? '' : 'hidden'}><label>Imagen PNG, JPEG o WebP (máximo 400 KB)<input type="file" name="questionImage" accept="image/png,image/jpeg,image/webp"></label>${field('Descripción accesible de la imagen', 'image_alt', e.media?.alt || '', 'text', 'maxlength="400"')}${e.media ? questionMedia(e) : '<p class="small">Incluye en la descripción los datos necesarios para resolver el ejercicio.</p>'}</div>` + area('Explicación', 'explanation', e.explanation || '', 2000) + area('Pasos, uno por línea (de 2 a 12)', 'steps', (e.solution_steps || []).join('\n'), 6000) + field('Pista opcional', 'hint', e.hint || ''), `data-id="${copy ? '' : esc(e.id || '')}" data-media="${esc(JSON.stringify(e.media || null))}"`);
    syncQuestionEditor(document.querySelector('#modal form'));
  }
  function syncQuestionEditor(f) {
    if (!f?.elements.type) return;
    const type = f.elements.type.value;
    for (const panel of f.querySelectorAll('[data-answer-panel]')) {
      const visible = panel.dataset.answerPanel === 'numeric' ? ['number', 'image'].includes(type) : panel.dataset.answerPanel === type;
      panel.hidden = !visible;
      for (const input of panel.querySelectorAll('input,select,textarea')) input.disabled = !visible;
    }
  }
  async function readQuestionImage(f, b) {
    if (b.type !== 'image') return undefined;
    let media = JSON.parse(f.dataset.media || 'null');
    const file = f.elements.questionImage?.files[0];
    if (file) {
      if (file.size > 400 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Usa una imagen PNG, JPEG o WebP de hasta 400 KB.');
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });
      media = {
        kind: 'upload',
        src,
        alt: b.image_alt
      };
    }
    if (!media) throw Error('Agrega una imagen a esta pregunta.');
    return {
      ...media,
      alt: String(b.image_alt || media.alt || '').trim()
    };
  }
  function taskForm(gid, exam) {
    const exercises = model.data().exercises.filter((e) => e.active && (e.owner === user().id || user().role === 'admin'));
    const topics = model.data().topics.filter((t) => t.active);
    form(exam ? 'Preparar un examen' : 'Asignar tarea', 'task', field('Título', 'title', '', 'text', 'required minlength="2" maxlength="100"') + area('Instrucciones', 'instructions', 'Resuelve con calma y revisa cada procedimiento.', 2000) + `<fieldset><legend>Temas del generador (puedes combinar los tres)</legend>${topics.map((t, i) => `<label class="checkbox"><input type="checkbox" name="selected_topic" value="${t.id}" ${i === 0 ? 'checked' : ''}>${esc(t.name)}</label>`).join('')}</fieldset><div class="form-grid">${field('Nivel', 'level', 3, 'number', 'required min="1" max="10"')}${field('Preguntas', 'count', 6, 'number', 'required min="3" max="8"')}</div>` + select('Formato del generador', 'format', [['number', 'Respuesta numérica'], ['choice', 'Opción múltiple'], ['boolean', 'Verdadero / falso'], ['image', 'Ejercicios con imagen'], ['mixed', 'Combinar los cuatro formatos']], 'number') + select('Origen de las preguntas', 'source', [['generated', 'Generador integrado'], ['bank', 'Mi banco de preguntas']], 'generated') + `<fieldset><legend>Preguntas del banco (elige de 3 a 8 si usas el banco)</legend><div class="exam-bank">${exercises.map((e) => `<label class="checkbox"><input type="checkbox" name="exercise" value="${e.id}">${esc(e.prompt)} · ${typeLabel(e)} · ${e.points ?? 1} punto(s)</label>`).join('') || '<p>Tu banco está vacío. Puedes utilizar el generador.</p>'}</div></fieldset>` + (exam ? field('Apertura', 'opens', localDate(Date.now()), 'datetime-local', 'required') + field('Minutos por estudiante', 'duration', 30, 'number', 'required min="1" max="180"') : '') + field('Cierre', 'due', localDate(Date.now() + 86400000), 'datetime-local', 'required') + (exam ? '<label class="checkbox"><input type="checkbox" name="reveal" checked> Mostrar resultados después del cierre</label>' : '') + `<p class="small">Revisa las preguntas para asignar el puntaje de cada una. Sin cambios, cada pregunta vale un punto o conserva los puntos del banco. ${exam ? 'Un intento por cuenta. El servidor valida el tiempo y los permisos.' : ''}</p>${btn('Revisar preguntas', 'preview', '', 'secondary')}<section id="question-preview" aria-live="polite"></section>`, `data-id="${gid}" data-exam="${exam ? 'yes' : 'no'}"`, 'Publicar actividad');
  }
  function taskQuestions(f) {
    const b = Object.fromEntries(new FormData(f)),
      checked = (name) => Array.from(f.querySelectorAll(`input[name="${name}"]:checked`)).map((x) => x.value);
    const selected = checked('selected_topic'),
      topics = selected.length ? selected : b.topic ? [b.topic] : [];
    const ids = checked('exercise'),
      visibleExercises = model.data().exercises;
    const fingerprint = JSON.stringify([topics, b.level, b.count, b.source, b.format, ids.map((id) => visibleExercises.find((e) => e.id === id))]);
    let qs = preview?.fingerprint === fingerprint ? preview.questions : model.buildQuestions({
      topics,
      level: Number(b.level),
      count: Number(b.count),
      source: b.source || 'generated',
      format: b.format || 'number',
      exerciseIds: ids
    });
    qs = JSON.parse(JSON.stringify(qs));
    for (const input of f.querySelectorAll('[data-question-point]')) if (input.dataset?.questionPoint !== undefined) {
      const index = Number(input.dataset.questionPoint),
        points = Number(input.value);
      if (!Number.isFinite(points) || points < .25 || points > 100) throw Error('El puntaje debe estar entre 0.25 y 100.');
      if (qs[index]) qs[index].points = points;
    }
    preview = {
      fingerprint,
      questions: qs
    };
    return qs;
  }
  function questionList(qs, editable = false) {
    return `<div class="preview-grid">${qs.map((q, i) => `<article class="panel"><div class="card-top"><span class="tag">PREGUNTA ${i + 1}</span><span class="small">${typeLabel(q)}</span></div><h3>${esc(q.prompt)}</h3><p>${esc(q.instruction)}</p>${questionMedia(q)}${editable ? field('Puntos de esta pregunta', 'points_' + i, q.points ?? 1, 'number', `min="0.25" max="100" step="0.25" required data-question-point="${i}"`) : `<p class="small">${q.points ?? 1} punto(s)</p>`}<details><summary>Respuesta y procedimiento</summary><p>Respuesta: ${esc(answerText(q))}</p>${steps(q.solution_steps)}<p>${esc(q.explanation)}</p></details></article>`).join('')}</div>`;
  }
  document.addEventListener('click', async (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action,
      id = el.dataset.id;
    try {
      if(['nav','logout','group','lesson','room','activity','result','practice','practice-topic','start-daily','smart-review','smart-review-activity','start-diagnostic'].includes(action))await study?.flush();
      if(['nav','logout','group','lesson','room','activity','result'].includes(action))await flushExamDraft();
      if (!['discard-note-draft', 'close', 'menu', 'compact', 'theme'].includes(action)) await flushNoteDraft();
      if (action === 'final-exam') {
        const a=model.activity(id),f=document.querySelector('[data-form="exam-review"]');
        if(!f)throw Error('Vuelve a abrir el examen.');
        await flushExamDraft(true);
        const saved=model.activity(id),pending=saved.total-Object.values(saved.drafts||{}).filter(x=>String(x).trim()).length;
        render();form('Confirmar entrega del examen','submit-exam',`<p>${pending?'Quedan '+pending+' pregunta(s) sin responder. Se contarán sin acierto.':'Todas las preguntas tienen respuesta guardada.'}</p><textarea name="answers" hidden>${esc(JSON.stringify(saved.questions.map((_,i)=>saved.drafts?.[i]||'')))}</textarea><p>Después de entregar ya no podrás modificar las respuestas.</p><label class="checkbox"><input type="checkbox" name="confirm" required> Confirmo que quiero entregar</label>`,`data-id="${id}" data-version="${saved.draftVersion||0}"`,'Entregar definitivamente');
      } else if(action==='files-task'||action==='files-activity')filesDialog(action==='files-task'?'task':'activity',id);
      else if(action==='student-preview'){studentPreview=await model.studentPreview(id);previewStudent();}
      else if(action==='preview-page')previewStudent(Number(id));
      else if(action==='download-pdf'){
        const query=id==='activity'?{tipo:'actividad',id:key}:id==='group'?{tipo:'grupo',grupo:key}:id==='reports'?{tipo:'grupo',grupo:reportGroup}:{tipo:'personal'};
        window.open('/api/espacio/reporte.pdf?'+new URLSearchParams(query),'_blank','noopener');
      } else if (action === 'discard-note-draft') {
        form('Volver al apunte guardado', 'discard-note-draft', '<p>Se descartarán los cambios de texto que aún no se hayan guardado. Copia el texto si quieres conservarlo antes de continuar.</p><label class="checkbox"><input name="confirm" type="checkbox" required> Descartar cambios pendientes</label>', `data-id="${esc(id)}"`, 'Cargar el texto guardado');
      } else if (action === 'export-notes') {
        const rows = model.personalNotes();
        if (!rows.length) throw Error('Aún no tienes apuntes para exportar.');
        download('RETAMAT_Mis_Apuntes.txt', rows.map((n) => n.title + '\n' + 'Guardado: ' + date(n.updated || n.created) + '\n\n' + n.text).join('\n\n--------------------\n\n'), 'text/plain;charset=utf-8');
        notice('Apuntes exportados.');
      } else if (action === 'delete-note') {
        const n = model.personalNotes().find((n) => n.lesson === id);
        if (!n) throw Error('Apunte no encontrado.');
        form('Eliminar este apunte', 'delete-note', '<p>Se eliminará únicamente tu apunte de <strong>' + esc(n.title) + '</strong>. La lección y tus resultados se conservan.</p><label class="checkbox"><input name="confirm" type="checkbox" required> Confirmo que deseo eliminarlo</label><textarea name="original" hidden>' + esc(n.text) + '</textarea>', `data-id="${esc(id)}"`, 'Eliminar apunte');
      } else if (action === 'review-errors' || action === 'review-activity') {
        const aid = await model.startReview(action === 'review-errors' ? id : 'all', action === 'review-activity' ? id : '');
        go('activity', aid);
      } else if (action === 'export-review') {
        const rows = model.activityReview(id);
        csv('RETAMAT_Revision_Actividad.csv', [['Pregunta', 'Tema', 'Formato', 'Enunciado', 'Respuesta registrada', 'Respuesta correcta', 'Puntos obtenidos', 'Puntos posibles'], ...rows.map((r) => [r.index + 1, topicName(r.question.topic), typeLabel(r.question), r.question.prompt, r.attempt ? answerText(r.question, r.attempt.answer) : 'Sin responder', answerText(r.question), r.earned, r.points])]);
        notice('Revisión exportada.');
      } else if (action === 'group-roster') {
        const rows = model.groupRoster(id),g = model.group(id, true);
        csv('RETAMAT_Lista_Grupo.csv', [['Grupo', 'Estudiante', 'Correo', 'Estado'], ...rows.map((u) => [g.name, u.name, u.email, u.active ? 'Activa' : 'Desactivada'])]);
        notice('Lista del grupo exportada.');
      } else if (action === 'enrollment') {
        const g = model.group(id, true),open = g.enrollmentOpen === false;
        form(open ? 'Abrir inscripciones' : 'Pausar nuevas inscripciones', 'enrollment', `<p>${open ? 'El código volverá a admitir nuevas cuentas de estudiante.' : 'El código dejará de admitir nuevas cuentas. Los miembros y las entregas existentes se conservan.'}</p><label class="checkbox"><input name="confirm" type="checkbox" required> Confirmo este cambio</label><input type="hidden" name="open" value="${open ? 'yes' : 'no'}">`, `data-id="${esc(id)}"`, 'Confirmar cambio');
      } else if (action === 'group-notice') {
        const g = model.group(id, true);
        form('Publicar un aviso al grupo', 'group-notice', `<p>Se creará una notificación para los miembros activos de <strong>${esc(g.name)}</strong>. Los miembros podrán verla al actualizar RETAMAT. No se envía por correo.</p>` + field('Título del aviso', 'title', '', 'text', 'required minlength="2" maxlength="100"') + area('Mensaje', 'body', '', 2000), `data-id="${esc(id)}"`, 'Publicar aviso');
      } else if (action === 'history-page') {
        historyPage += Number(id) < 0 ? -1 : 1;
        render();
      } else if (action === 'calendar-month') {
        calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + Number(id), 1);
        render();
      } else if (action === 'calendar-today') {
        calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        render();
      } else if (action === 'calendar-day') calendarDay(id);else if (action === 'recovery' || action === 'recovery-code') {
        recoveryCodeForm();
      } else if (action === 'reset-password') {
        model.admin();
        const target = model.data().users.find((u) => u.id === id);
        if (!target) throw Error('Cuenta no encontrada.');
        form('Restablecer contraseña', 'reset-password', `<p>Cuenta: <strong>${esc(target.name)}</strong><br>${esc(target.email)}</p>` + field('Tu contraseña de administrador', 'current', '', 'password', 'required autocomplete="current-password"') + field('Nueva contraseña de esta cuenta', 'next', '', 'password', 'required minlength="10" maxlength="128" autocomplete="new-password"') + field('Repite la nueva contraseña', 'repeat', '', 'password', 'required minlength="10" maxlength="128" autocomplete="new-password"') + '<p class="small">La cuenta afectada deberá volver a iniciar sesión. Usa al menos diez caracteres, letras y números.</p>', `data-id="${esc(id)}"`, 'Restablecer contraseña');
      } else if (action === 'export-followup') {
        const d = model.report(reportGroup);
        csv('RETAMAT_Seguimiento.csv', [['Estudiante', 'Correo', 'Grupos', 'Completadas', 'Pendientes', 'Vencidas', 'Aciertos %', 'Promedio /10', 'Seguimiento'], ...d.students.map((r) => [r.name, r.email, r.groups.join(' | '), r.completed, r.pending, r.overdue, r.percent ?? '', r.grade ?? '', r.reason]), [], ['Tema', 'Respondidas', 'Correctas', 'Porcentaje'], ...d.topics.map((t) => [t.name, t.answered, t.correct, t.percent])]);
      } else if (action === 'practice-format') {
        const l = model.data().lessons.find((l) => l.id === id && l.active);
        if (!l) throw Error('Lección no disponible.');
        form('Elige tu manera de practicar', 'practice-format', `<p>${esc(l.title)}</p>` + select('Formato de las preguntas', 'format', [['number', 'Respuesta numérica'], ['choice', 'Opción múltiple'], ['boolean', 'Verdadero / falso'], ['image', 'Ejercicios con imagen'], ['mixed', 'Combinar los cuatro formatos']], 'mixed') + '<p class="small">Resolverás seis preguntas con procedimientos después de responder.</p>', `data-id="${esc(id)}"`, 'Comenzar práctica');
      } else if (action === 'close') {
        const wasRegister = dialog.dataset.afterRegister === 'yes';
        delete dialog.dataset.persistent;
        delete dialog.dataset.afterRegister;
        dialog.close();
        if (wasRegister && user()) {
          const pendingLesson = resumeNoteAccount();
          go(pendingLesson ? 'lesson' : 'home', pendingLesson);
          render();
        }
      } else if (action === 'finish-register') {
        delete dialog.dataset.persistent;
        delete dialog.dataset.afterRegister;
        dialog.close();
        const pendingLesson = resumeNoteAccount();
        go(pendingLesson ? 'lesson' : 'home', pendingLesson);
        render();
      } else if (action === 'copy-backup') {
        try {
          await navigator.clipboard.writeText(id);
          notice('Código de recuperación copiado.');
        } catch {
          notice('Copia manualmente el código: ' + id);
        }
      } else if (action === 'generate-backup-code') {
        const res = await model.generateBackupCode();
        modal('Tu nuevo código de recuperación', `<p>Guarda este código en un lugar seguro. Si olvidas tu contraseña, podrás cambiarla usando tu correo y este código:</p><p class="invite-code large" style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center">${esc(res.backupCode)}</p><p class="small">Tu código anterior quedó desactivado. Este código funciona una sola vez.</p><div class="quick-actions">${btn('Copiar código', 'copy-backup', res.backupCode, 'secondary')}${btn('Ya lo guardé', 'close', '', 'primary')}</div>`, true);
      } else if (action === 'auth') auth(id);else if (action === 'password') {
        const input = el.closest('form').elements.password;
        input.type = input.type === 'password' ? 'text' : 'password';
        el.setAttribute('aria-label', input.type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
      } else if (action === 'logout') {
        reportGroup = 'all';
        reportFilter = 'all';
        noteQuery = bankQuery = userQuery = '';
        historyMode = historyState = bankType = bankState = userRole = 'all';
        historyPage = 0;
        mistakeTopic = 'all';
        const leaving=user().id;
        await model.logout();study?.clearLocal(leaving);study?.reset();
        location.hash = '';
        auth();
      } else if (action === 'nav') go(id);else if (['lesson', 'group', 'activity', 'room'].includes(action)) go(action, id);else if (action === 'skip') {
        event.preventDefault();
        $('#main')?.focus();
      } else if (action === 'menu') document.documentElement.dataset.menu = document.documentElement.dataset.menu === 'open' ? 'closed' : 'open';else if (action === 'compact') document.documentElement.dataset.compact = document.documentElement.dataset.compact === 'yes' ? 'no' : 'yes';else if (action === 'theme') {
        const root = document.documentElement;
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('retamat-html-theme', root.dataset.theme);
        } catch {}
      } else if (action === 'search') openSearch();else if (action === 'result') go(el.dataset.view, id);else if (action === 'topic') {
        topicFilter = id;
        go('topics');
      } else if (action === 'clear-filters') {
        topicFilter = 'all';
        lessonQuery = '';
        favoritesOnly = false;
        render();
      } else if (action === 'favorites') {
        favoritesOnly = !favoritesOnly;
        render();
      } else if (action === 'bookmark') {
        await model.bookmark(id);
        notice('Favoritas actualizadas.');
        render();
      } else if (action === 'practice') go('activity', await model.start({
        mode: 'practice',
        lesson: id
      }));else if (action === 'practice-topic') {
        const [topic, level] = id.split('/');
        go('activity', await model.start({
          mode: 'practice',
          topic,
          level: Number(level)
        }));
      } else if (action === 'start-diagnostic') go('activity', await model.start({
        mode: 'diagnostic'
      }));else if (action === 'next') {
        feedback = null;
        render();
      } else if (action === 'hint') {
        const a = model.activity(id), step = a.attempts.length;
        await model.nextHint(id,step);
        const updated=model.activity(id), host=$('#guided-hints');
        if(host && updated.attempts.length===step)host.innerHTML=hintContent(updated,updated.questions[step],step);
      } else if (action === 'resource') {
        resourceDetail(id);
      } else if (action === 'finish-simulation') {
        const a=model.activity(id);form('Finalizar simulacro','finish-simulation',`<p>Registraste ${a.attempts.length} de ${a.total} respuestas. Las preguntas pendientes cuentan como cero aciertos.</p><label class="checkbox"><input type="checkbox" name="confirm" required> Confirmo que quiero terminar y ver los resultados.</label>`,`data-id="${a.id}"`,'Terminar simulacro');
      } else if (action === 'start-daily') {
        go('activity',await model.startDaily());
      } else if (action === 'smart-review' || action === 'smart-review-activity') {
        go('activity',await model.startSmartReview(action==='smart-review'?id:'all',action==='smart-review-activity'?id:''));
      } else if (action === 'explain') {
        openExplanation(id);
      } else if (action === 'explain-next' || action === 'explain-prev') {
        stopExplanation();explanation.step+=action==='explain-next'?1:-1;paintExplanation();
      } else if (action === 'explain-play') {
        if(explanationTimer){stopExplanation();paintExplanation();}
        else if(explanation){if(explanation.step===explanation.lesson.steps.length)explanation.step=0;explanationTimer=setInterval(()=>{if(!dialog.open||!explanation){stopExplanation();return;}explanation.step++;if(explanation.step>=explanation.lesson.steps.length)stopExplanation();paintExplanation();},3000);paintExplanation();}
      } else if (action === 'install-app') {
        const status=await RInstall.install();if(status==='manual')modal('Instalar RETAMAT',installationGuide(false));else if(status==='installed')notice('RETAMAT ya está abierta como aplicación.');
      } else if (action === 'goal') form('Tu meta de práctica', 'goal', field('Respuestas en siete días (5–200)', 'goal', model.settings().goal || 20, 'number', 'required min="5" max="200"'));else if (action === 'new-group') form('Crear un grupo', 'group', field('Nombre del grupo', 'name', '', 'text', 'required minlength="2" maxlength="80"') + area('Descripción del grupo', 'description', '', 1000).replace(' required', ''));else if (action === 'join-group') form('Unirme a un grupo', 'join-group', field('Código de 8 a 12 caracteres', 'code', '', 'text', 'required minlength="8" maxlength="12"'));else if (action === 'edit-group') {
        const g = model.group(id, true);
        form('Editar grupo', 'edit-group', field('Nombre del grupo', 'name', g.name, 'text', 'required minlength="2" maxlength="80"') + area('Descripción del grupo', 'description', g.description || '', 1000).replace(' required', '') + '<label class="checkbox"><input type="checkbox" name="renew"> Generar otro código</label><p class="small">Los miembros actuales se conservan; el código anterior dejará de admitir inscripciones.</p>', `data-id="${id}"`);
      } else if (action === 'copy') {
        try {
          await navigator.clipboard.writeText(id);
          notice('Código copiado.');
        } catch {
          modal('Copia este código', `<p class="invite-code large">${esc(id)}</p><p>Selecciona el código y usa Ctrl+C.</p>`);
        }
      } else if (action === 'new-task' || action === 'new-exam') {
        preview = null;
        taskForm(id, action === 'new-exam');
      } else if (action === 'preview') {
        const f = el.closest('form');
        $('#question-preview').innerHTML = '<h3 class="spacer">Preguntas que se publicarán</h3>' + questionList(taskQuestions(f), true);
      } else if (action === 'start-task') go('activity', await model.start({
        mode: 'assignment',
        task: id
      }));else if (action === 'questions') {
        const t = model.data().tasks.find((t) => t.id === id);
        model.group(t.group, true);
        modal(t.title, questionList(t.questions));
      } else if (action === 'close-task') modal('Cerrar actividad', '<p>Las entregas previas se conservan. Ya no se admitirán nuevas respuestas.</p>' + btn('Cerrar actividad', 'confirm-close-task', id, 'danger'));else if (action === 'confirm-close-task') {
        await model.closeTask(id);
        dialog.close();
        render();
      } else if (action === 'duplicate') {
        const t = model.data().tasks.find((t) => t.id === id);
        model.group(t.group, true);
        form('Crear una copia', 'duplicate', field('Título de la copia', 'title', t.title.slice(0, 92) + ' (copia)', 'text', 'required minlength="2" maxlength="100"') + select('Grupo de destino', 'group', model.groups().filter((g) => g.owner === user().id || user().role === 'admin').map((g) => [g.id, g.name]), t.group) + (t.exam ? field('Apertura', 'opens', localDate(Date.now()), 'datetime-local', 'required') : '') + field('Nuevo cierre', 'due', localDate(Date.now() + 86400000), 'datetime-local', 'required') + '<p class="small">Se copian preguntas y configuración. La copia no incluye entregas ni comentarios.</p>', `data-id="${id}"`, 'Crear copia');
      } else if (action === 'new-exercise') exerciseForm();else if (action === 'edit-exercise' || action === 'template') exerciseForm(model.data().exercises.find((e) => e.id === id), action === 'template');else if (action === 'archive-exercise') {
        model.manager();
        await model.archiveExercise(id);
        render();
      } else if (action === 'comment') {
        model.activity(id);
        form('Comentar entrega', 'comment', area('Retroalimentación', 'text', '', 2000), `data-id="${id}"`);
      } else if (action === 'new-room') form('Crear sala de desafío', 'room', field('Nombre de la sala', 'name', '', 'text', 'required minlength="2" maxlength="80"') + select('Tema', 'topic', model.data().topics.map((t) => [t.id, t.name]), 'algebra') + field('Nivel', 'level', 3, 'number', 'required min="1" max="10"'));else if (action === 'join-room') form('Unirme a un desafío', 'join-room', field('Código de la sala', 'code', '', 'text', 'required minlength="8" maxlength="12"'));else if (action === 'control-room') {
        await model.controlRoom(key, id);
        render();
      } else if (action === 'start-room') go('activity', await model.start({
        mode: 'challenge',
        room: id
      }));else if (action === 'refresh') {
        await model.refresh();
        feedback = null;
        render();
      } else if (action === 'read-all') {
        await model.readNotice();
        render();
      } else if (action === 'notice') {
        const n = model.data().notifications.find((n) => n.id === id && n.user === user().id);
        if (!n) throw Error('Aviso no encontrado.');
        await model.readNotice(id);
        go(...n.target);
      } else if (action === 'edit-user') {
        model.admin();
        const u = model.data().users.find((u) => u.id === id);
        form('Editar permisos', 'user', `<p>${esc(u.name)} · ${esc(u.email)}</p>` + select('Rol', 'role', [['student', 'Estudiante'], ['teacher', 'Docente'], ['admin', 'Administrador']], u.role) + `<label class="checkbox"><input name="active" type="checkbox" ${u.active ? 'checked' : ''}> Cuenta activa</label>`, `data-id="${id}"`);
      } else if (action === 'edit-lesson') {
        model.admin();
        const l = model.data().lessons.find((l) => l.id === id);
        form('Editar lección', 'lesson', field('Título', 'title', l.title, 'text', 'required maxlength="150"') + field('Nivel', 'level', l.level, 'number', 'required min="1" max="10"') + area('Concepto', 'concept', l.concept) + area('Ejemplo', 'example', l.example, 1000) + area('Pasos, uno por línea', 'steps', l.steps.join('\n'), 6000) + `<label class="checkbox"><input name="active" type="checkbox" ${l.active ? 'checked' : ''}> Lección activa</label>`, `data-id="${id}"`);
      } else if (action === 'backup') {
        download('RETAMAT_HTML_Respaldo_' + new Date().toISOString().slice(0, 10) + '.json', await model.export());
        notice('Respaldo exportado.');
      } else if (action === 'export-progress') {
        const p = model.stats();
        csv('RETAMAT_Mi_Progreso.csv', [['Actividad', 'Fecha', 'Respondidas', 'Aciertos', 'Total', 'Estado'], ...p.activities.map((a) => [a.mode, date(a.created), a.attempts.length, model.released(a) ? score(a) : 'Pendiente de publicación', a.total, a.done ? 'Completada' : 'En curso'])]);
      } else if (action === 'export-report') {
        model.manager();
        const d = model.data(),
          groups = model.groups().filter((g) => g.owner === user().id || user().role === 'admin'),
          tasks = d.tasks.filter((t) => groups.some((g) => g.id === t.group));
        csv('RETAMAT_Reporte_Grupos.csv', [['Estudiante', 'Grupo', 'Actividad', 'Respondidas', 'Aciertos', 'Total', 'Completada'], ...d.activities.filter((a) => tasks.some((t) => t.id === a.task)).map((a) => {
          const t = tasks.find((t) => t.id === a.task);
          return [d.users.find((u) => u.id === a.owner).name, groups.find((g) => g.id === t.group).name, t.title, a.attempts.length, score(a), a.total, a.done ? 'Sí' : 'No'];
        })]);
      }
      if (action !== 'menu') document.documentElement.dataset.menu = 'closed';
    } catch (e) {
      notice(e.message, true);
    }
  });
  document.addEventListener('submit', async (event) => {
    const f = event.target;
    if (!f.dataset.form) return;
    event.preventDefault();
    const b = Object.fromEntries(new FormData(f)),
      type = f.dataset.form,
      error = f.querySelector('.form-error'),
      button = f.querySelector('button[type="submit"]') || f.querySelector('button.primary');
    if (error) error.hidden = true;
    if (button) button.disabled = true;
    try {
      if (!['note', 'discard-note-draft', 'login', 'register'].includes(type)) await flushNoteDraft();
      if(type==='library-filter'){libraryTopic=b.topic;libraryKind=b.kind;libraryQuery=b.query;render();
      }else if(type==='simulation'){const topics=[...f.querySelectorAll('[name="topic"]:checked')].map(input=>input.value);go('activity',await model.startSimulation({topics,level:Number(b.level),count:Number(b.count),minutes:Number(b.minutes)}));
      }else if(type==='finish-simulation'){if(!b.confirm)throw Error('Confirma que quieres finalizar.');await model.finishSimulation(f.dataset.id);dialog.close();feedback=null;render();
      }else if(type==='comparison-group'){comparisonGroup=b.group;comparisonFirst=comparisonSecond='';render();
      }else if(type==='comparison'){comparisonFirst=b.first;comparisonSecond=b.second;render();
      }else if(type==='exam-review'){
        await flushExamDraft(true);render();notice('Borrador del examen guardado. Puedes seguir editando.');
      }else if(type==='submit-exam'){
        if(!b.confirm)throw Error('Confirma la entrega.');const a=model.activity(f.dataset.id);await model.submitExam(a.id,JSON.parse(b.answers),Number(f.dataset.version));dialog.close();feedback=null;render();notice('Examen entregado.');
      }else if(type==='attach-file'){
        const file=f.elements.file.files[0];if(!file||file.size>5*1024*1024)throw Error('Selecciona un PDF o imagen de hasta 5 MB.');await model.attachFile(f.dataset.type,f.dataset.id,{name:file.name,base64:await readFileBase64(file)});filesDialog(f.dataset.type,f.dataset.id);notice('Archivo guardado.');
      }else if(type==='recovery-request'){
        recoveryCodeForm(b.email);
      }else if(type==='recovery-reset'){
        if(b.password!==b.repeat)throw Error('Las contraseñas no coinciden.');
        const result=await model.applyRecovery(f.dataset.token?{token:f.dataset.token,password:b.password}:{email:b.email,code:b.code,password:b.password});
        await model.logout();
        delete dialog.dataset.persistent;
        dialog.close();
        location.hash='';
        auth();
        if(result.nextBackupCode){
          modal('Contraseña restablecida',`<p>Tu contraseña fue actualizada correctamente.</p><p><strong>Tu nuevo código de recuperación es:</strong></p><p class="invite-code large" style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center">${esc(result.nextBackupCode)}</p><p class="small">Guarda este código en un lugar seguro. Tu código anterior ya no funciona.</p><div class="quick-actions">${btn('Copiar código','copy-backup',result.nextBackupCode,'secondary')}${btn('Entendido, iniciar sesión','close','','primary')}</div>`,true);
        } else {
          notice(result.mensaje);
        }
      }else if (type === 'discard-note-draft') {
        if (!b.confirm) throw Error('Confirma que deseas descartar los cambios.');
        clearTimeout(noteSaveTimer);
        noteDraft = null;
        dialog.close();
        render();
        notice('Se cargó el apunte guardado.');
      } else if (type === 'delete-note') {
        if (!b.confirm) throw Error('Confirma que deseas eliminar el apunte.');
        await model.note(f.dataset.id, '', b.original);
        dialog.close();
        render();
        notice('Apunte eliminado.');
      } else if (type === 'support-filter') { supportGroup=b.group;render(); } else if (type === 'login') {
        await model.login(b.email, b.password);
        const pendingLesson = resumeNoteAccount();
        reportGroup = 'all';
        reportFilter = 'all';
        noteQuery = bankQuery = userQuery = '';
        historyMode = historyState = bankType = bankState = userRole = 'all';
        historyPage = 0;
        feedback = null;
        go(pendingLesson ? 'lesson' : 'home', pendingLesson);
        render();
      } else if (type === 'register') {
        const reg = await model.register(b.name, b.email, b.password, b.role);
        if(reg?.backupCode){
          const card = document.querySelector('.auth-card');
          if (card) {
            card.innerHTML = `<p class="eyebrow">CUENTA CREADA CON ÉXITO</p><h2>Guarda tu código de recuperación</h2><p>¡Bienvenido a RETAMAT, <strong>${esc(b.name)}</strong>! Antes de entrar a tu espacio, copia o anota este código. Lo necesitarás si algún día olvidas tu contraseña:</p><p class="invite-code large" style="font-size:28px;font-weight:800;letter-spacing:4px;text-align:center;margin:18px 0">${esc(reg.backupCode)}</p><p class="small">Funciona una sola vez; al usarlo se generará uno nuevo automáticamente.</p><div class="quick-actions spacer">${btn('Copiar código','copy-backup',reg.backupCode,'secondary')}${btn('Ya guardé mi código, entrar a mi espacio '+icon('arrow'),'finish-register','','primary')}</div>`;
          }
          modal('Guarda tu código de recuperación',`<p>¡Bienvenido a RETAMAT, <strong>${esc(b.name)}</strong>!</p><p>Si en algún momento olvidas tu contraseña, podrás cambiarla usando tu correo y este código:</p><p class="invite-code large" style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center">${esc(reg.backupCode)}</p><p class="small">Copia o anota este código en un lugar seguro antes de continuar. Funciona una sola vez; al usarlo se genera uno nuevo.</p><div class="quick-actions">${btn('Copiar código','copy-backup',reg.backupCode,'secondary')}${btn('Ya guardé mi código, continuar '+icon('arrow'),'finish-register','','primary')}</div>`,true);
          dialog.dataset.afterRegister = 'yes';
        } else {
          const pendingLesson = resumeNoteAccount();
          go(pendingLesson ? 'lesson' : 'home', pendingLesson);
          render();
        }
      } else if (type === 'search') {
        const result = searchItems(b.query)[0];
        if (result) go(result.view, result.id);
      } else if (type === 'calendar-filter') {
        calendarFilter = b.status;
        render();
      } else if (type === 'report-filter') {
        reportGroup = b.group;
        reportFilter = b.status;
        render();
      } else if (type === 'reset-password') {
        if (b.next !== b.repeat) throw Error('Las contraseñas nuevas no coinciden.');
        await model.resetPassword(f.dataset.id, b.current, b.next);
        dialog.close();
        render();
        notice('Contraseña restablecida. La cuenta deberá volver a entrar.');
      } else if (type === 'practice-format') {
        go('activity', await model.start({
          mode: 'practice',
          lesson: f.dataset.id,
          format: b.format
        }));
        render();
      } else if (type === 'mistake-filter') {
        mistakeTopic = b.topic;render();
      } else if (type === 'enrollment') {
        if (!b.confirm) throw Error('Confirma el cambio de inscripciones.');
        await model.setEnrollment(f.dataset.id, b.open === 'yes');
        dialog.close();render();notice('Inscripciones actualizadas.');
      } else if (type === 'group-notice') {
        const count = await model.postGroupNotice(f.dataset.id, b.title, b.body);
        dialog.close();render();notice('Aviso publicado para ' + count + (count === 1 ? ' miembro activo.' : ' miembros activos.'));
      } else if (type === 'history-filter') {
        historyMode = b.mode;historyState = b.state;historyPage = 0;render();
      } else if (type === 'bank-filter') {
        bankQuery = b.query.trim();bankType = b.type;bankState = b.state;render();
      } else if (type === 'user-filter') {
        userQuery = b.query.trim();userRole = b.role;render();
      } else if (type === 'note-filter') {
        noteQuery = b.query;
        render();
      } else if (type === 'filter') {
        lessonQuery = b.query;
        topicFilter = b.topic;
        render();
      } else if (type === 'answer') {
        await study?.flush();
        feedback = await model.answer(f.dataset.id, b.answer, f.dataset.step);
        render();
      } else if (type === 'note') {
        saveDraftFromEditor(f.elements.text);
        await flushNoteDraft();
        notice('Apunte guardado.');
      } else if (type === 'goal') {
        const goal = Number(b.goal);
        if (!Number.isInteger(goal) || goal < 5 || goal > 200) throw Error('Usa una meta entre 5 y 200.');
        await model.setSettings({
          goal
        });
        dialog.close();
        render();
      } else if (type === 'group') {
        go('group', await model.createGroup(b.name, b.description || ''));
        render();
      } else if (type === 'join-group') {
        go('group', await model.joinGroup(b.code));
        render();
      } else if (type === 'edit-group') {
        await model.editGroup(f.dataset.id, b.name, f.elements.renew.checked, b.description);
        dialog.close();
        render();
      } else if (type === 'exercise') {
        const media = await readQuestionImage(f, b);
        await model.saveExercise({
          ...b,
          correct_option: b.type === 'choice' ? Number(b.correct_option) - 1 : undefined,
          media
        }, f.dataset.id || null);
        dialog.close();
        render();
      } else if (type === 'task') {
        const questions = taskQuestions(f);
        await model.createTask(f.dataset.id, {
          ...b,
          exam: f.dataset.exam === 'yes',
          reveal: f.elements.reveal?.checked || false
        }, questions);
        preview = null;
        dialog.close();
        render();
        notice('Actividad publicada.');
      } else if (type === 'duplicate') {
        await model.duplicateTask(f.dataset.id, b.group, b.title, b.due, b.opens);
        go('group', b.group);
        render();
      } else if (type === 'comment') {
        await model.feedback(f.dataset.id, b.text);
        dialog.close();
        render();
      } else if (type === 'room') {
        go('room', await model.createRoom(b.name, b.topic, b.level));
        render();
      } else if (type === 'join-room') {
        go('room', await model.joinRoom(b.code));
        render();
      } else if (type === 'chat') {
        await model.chat(f.dataset.id, b.text);
        render();
      } else if (type === 'user') {
        await model.editUser(f.dataset.id, b.role, f.elements.active.checked);
        dialog.close();
        render();
      } else if (type === 'lesson') {
        await model.editLesson(f.dataset.id, {
          ...b,
          active: f.elements.active.checked
        });
        dialog.close();
        render();
      } else if (type === 'profile') {
        await model.profile(b.name, b.current, b.next);
        notice('Perfil actualizado.');
        render();
      } else if (type === 'settings') {
        await model.setSettings({
          font: b.font,
          contrast: f.elements.contrast.checked,
          motion: f.elements.motion.checked
        });
        render();
        notice('Ajustes guardados.');
      } else if (type === 'restore') {
        const file = f.elements.file.files[0];
        if (!file || file.size > 5 * 1024 * 1024) throw Error('Selecciona un archivo JSON de hasta 5 MB.');
        if (b.confirmation !== 'RESTAURAR') throw Error('Escribe RESTAURAR para aplicar la copia.');
        const payload = JSON.parse(await file.text());
        RetamatModel.validate(payload);
        await model.restore(payload, b.password);
        dialog.close();
        render();
        notice('Contenido importado.');
      }
    } catch (e) {
      if (error?.isConnected) {
        error.hidden = false;
        error.textContent = e.message;
      } else notice(e.message, true);
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  });
  let noteSaveTimer = null,noteDraft = null;
  const pausedDrafts = new Map();
  function resumeNoteAccount() {
    const uid = model.require().id;
    if (noteDraft && noteDraft.user !== uid) {
      pausedDrafts.set(noteDraft.user, noteDraft);
      clearTimeout(noteSaveTimer);
      noteDraft = null;
    }
    if (!noteDraft && pausedDrafts.has(uid)) {
      noteDraft = pausedDrafts.get(uid);
      pausedDrafts.delete(uid);
    }
    return noteDraft?.lesson || '';
  }
  let noteFlushPromise = null;
  async function flushNoteDraft() {
    if (noteFlushPromise) return noteFlushPromise;
    noteFlushPromise = (async () => {
      clearTimeout(noteSaveTimer);
      while (noteDraft) {
        const draft = noteDraft;
        if (model.require().id !== draft.user) throw Error('La cuenta cambió. Conserva tu apunte antes de continuar.');
        await model.note(draft.lesson, draft.text, draft.original);
        if (noteDraft === draft) noteDraft = null;else
        if (noteDraft?.user === draft.user && noteDraft.lesson === draft.lesson) noteDraft.original = draft.text;
        const f = document.querySelector('form[data-form="note"]');
        if (f?.dataset.id === draft.lesson) {
          f.dataset.original = draft.text;
          const status = f.querySelector('.note-save-status');
          if (status) status.textContent = noteDraft ? 'Guardando…' : 'Apunte guardado.';
        }
      }
    })();
    try {await noteFlushPromise;} finally {noteFlushPromise = null;}
  }
  function saveDraftFromEditor(target) {
    const f = target.closest('form[data-form="note"]');
    if (!f || target.name !== 'text') return;
    noteDraft = { user: model.require().id, lesson: f.dataset.id, text: target.value, original: f.dataset.original };
    const status = f.querySelector('.note-save-status');
    if (status) status.textContent = 'Guardando…';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(async () => {
      try {await flushNoteDraft();}
      catch (e) {if (status?.isConnected) status.textContent = 'No se pudo guardar: ' + e.message;notice(e.message, true);}
    }, 700);
  }
  window.addEventListener('beforeunload', (event) => {
    if (study?.dirty() || document.querySelector('[data-form="exam-review"][data-dirty="yes"]') || examFlushPromise || noteDraft || noteFlushPromise || pausedDrafts.size || model?.pending) {event.preventDefault();event.returnValue = '';}
  });
  document.addEventListener('input', (event) => {
    const exam=event.target.closest('[data-form="exam-review"]');if(exam)exam.dataset.dirty='yes';
    if (user()) saveDraftFromEditor(event.target);
    if (event.target.id === 'command-query') $('#command-results').innerHTML = searchResults(event.target.value);
  });
  document.addEventListener('change', (event) => {
    if (event.target.name === 'type' && event.target.closest('form[data-form="exercise"]')) syncQuestionEditor(event.target.closest('form'));
    if (event.target.closest('form[data-form="task"]') && ['topic', 'selected_topic', 'level', 'count', 'source', 'format', 'exercise'].includes(event.target.name)) {
      preview = null;
      const panel = $('#question-preview');
      if (panel) panel.innerHTML = '<p class="small spacer">La selección cambió. Revisa nuevamente las preguntas.</p>';
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && user()) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape') document.documentElement.dataset.menu = 'closed';
  });
  window.addEventListener('hashchange', async () => {
    if(location.hash.startsWith('#reset/')){recoveryReset(location.hash.slice(7));return;}
    try{await study?.flush();await flushExamDraft();}catch(e){notice(e.message,true);const f=document.querySelector('[data-form="exam-review"]');if(f)location.replace('#activity/'+f.dataset.id);return;}
    try {await flushNoteDraft();} catch (e) {
      notice('Tu apunte sigue pendiente: ' + e.message, true);
      const target = '#lesson/' + encodeURIComponent(noteDraft.lesson);
      if (location.hash !== target) {location.replace(target);return;}
    }
    if (model?.user()) {try {await model.refresh();} catch (e) {notice(e.message, true);}}
    if (dialog.dataset.persistent !== 'yes') dialog.close();
    preview = null;
    feedback = null;
    document.documentElement.dataset.menu = 'closed';
    render();
    $('#main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  window.addEventListener('retamat-session-lost', () => {
    clearTimeout(noteSaveTimer);
    dialog.close();
    auth();
    notice('Vuelve a iniciar sesión para continuar. Tus cambios pendientes se conservan en esta pestaña.', true);
  });
  (async () => {
    try {
      model = await RetamatServer.create();
      model.watch(liveUpdate);
      if(location.hash.startsWith('#reset/')){recoveryReset(location.hash.slice(7));return;}
      try {document.documentElement.dataset.theme = localStorage.getItem('retamat-html-theme') || 'light';} catch {}
      if (user()) render();else auth(location.hash === '#register' ? 'register' : 'login');
    } catch (e) {
      app.innerHTML = `<main class="startup-error"><span class="brand-mark">∑</span><h1>No se pudo abrir RETAMAT</h1><p>${esc(e.message)}</p><p>Recarga esta página para volver a intentar.</p></main>`;
    }
  })();
})();
