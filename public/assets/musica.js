/* Música instrumental local y opcional. Nunca se reproduce automáticamente. */
(() => {
  const audio = document.getElementById('background-music');
  const opener = document.getElementById('music-opener');
  const panel = document.getElementById('music-panel');
  const toggle = document.getElementById('music-toggle');
  const volume = document.getElementById('music-volume');
  const amount = document.getElementById('music-amount');
  const status = document.getElementById('music-status');
  if (!audio || !opener || !panel || !toggle || !volume || !amount || !status) return;
  let pending = false, desired = false, generation = 0;
  const storedVolume = () => {
    try {
      const raw = localStorage.getItem('retamat-music-volume');
      const n = raw === null ? 20 : Number(raw);
      return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : 20;
    } catch { return 20; }
  };
  function setVolume(value) {
    const n = Math.max(0, Math.min(100, Number(value) || 0));
    audio.volume = n / 100;
    volume.value = String(n);
    amount.textContent = n + '%';
    try { localStorage.setItem('retamat-music-volume', String(n)); } catch {}
  }
  function refresh(message) {
    const playing = !audio.paused;
    opener.textContent = playing ? '♫ Música activada' : '♫ Música';
    toggle.textContent = pending ? 'Iniciando…' : playing ? 'Pausar música' : 'Activar música';
    toggle.disabled = pending;
    toggle.setAttribute('aria-pressed', String(playing));
    if (message) status.textContent = message;
  }
  function pause(message) {
    generation++;
    desired = false;
    pending = false;
    audio.pause();
    refresh(message || 'Música pausada. Puedes activarla cuando quieras.');
  }
  opener.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    opener.setAttribute('aria-expanded', String(!panel.hidden));
  });
  toggle.addEventListener('click', async () => {
    if (!audio.paused) { pause(); return; }
    if (pending) return;
    const request = ++generation;
    pending = true;
    desired = true;
    refresh('Preparando el ambiente musical…');
    try {
      await audio.play();
      if (generation !== request) { if (!desired) audio.pause(); return; }
      if (document.hidden) { pause('La música se pausó al salir de esta pestaña.'); return; }
      pending = false;
      refresh(audio.volume ? 'Música instrumental suave en bucle.' : 'La música está activada con volumen en cero.');
    } catch {
      if (generation !== request) return;
      pending = false;
      desired = false;
      audio.pause();
      refresh('No se pudo iniciar la música. Extrae todo el ZIP y vuelve a pulsar Activar música.');
    }
  });
  volume.addEventListener('input', () => {
    setVolume(volume.value);
    refresh(audio.volume ? (audio.paused ? 'Volumen preparado para la próxima reproducción.' : 'Música instrumental suave en bucle.') : 'Volumen en cero.');
  });
  audio.addEventListener('pause', () => refresh());
  audio.addEventListener('error', () => pause('No se pudo cargar la música. Conserva la carpeta assets junto a index.html.'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (!audio.paused || pending)) pause('La música se pausó al salir de esta pestaña. Pulsa Activar música para continuar.');
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-action="logout"]')) pause('Música pausada al cerrar sesión.');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      opener.setAttribute('aria-expanded', 'false');
      opener.focus();
    }
  });
  window.addEventListener('pagehide', () => pause());
  setVolume(storedVolume());
  audio.pause();
  refresh('Opcional y apagada al abrir. Actívala si te ayuda a concentrarte.');
})();
