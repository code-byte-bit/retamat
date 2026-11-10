/* Solo recursos públicos. Nunca intercepta API, adjuntos o informes privados. */
const CACHE='retamat-publico-2.6.0';
const PUBLIC_ASSETS=[
  '/offline.html','/assets/favicon.svg','/assets/icono-192.png','/assets/icono-512.png',
  '/assets/estilos.css','/assets/mejoras.css','/assets/diseno.css','/assets/aprendizaje.css',
  '/assets/estudio.js','/assets/estudio.css','/assets/matematicas.js','/assets/cuentas.js','/assets/modelo.js','/assets/musica.js',
  '/assets/servidor.js','/assets/aprendizaje.js','/assets/instalar.js','/assets/interfaz.js',
  ...[400,500,600,700,800].map(w=>`/assets/fonts/manrope-latin-${w}-normal.woff2`)
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('retamat-publico-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'&&['/','/index.html'].includes(url.pathname)){
    event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||new Response('Comprueba tu conexión y vuelve a abrir la aplicación.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));return;
  }
  if(!PUBLIC_ASSETS.includes(url.pathname))return;
  event.respondWith(fetch(request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(url.pathname,copy)));}return response;}).catch(()=>caches.match(url.pathname)));
});
