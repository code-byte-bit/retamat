/* Instalación opcional. No guarda sesiones ni contenido privado en caché. */
window.RInstall=(()=>{
  let promptEvent=null;
  const installed=()=>!!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
  window.addEventListener('appinstalled',()=>{promptEvent=null;});
  async function install(){
    if(installed())return 'installed';
    if(!promptEvent)return 'manual';
    const event=promptEvent;promptEvent=null;
    try{await event.prompt();const choice=await event.userChoice;return choice.outcome;}catch{return 'manual';}
  }
  if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{/* La web sigue disponible si no se admite la instalación. */});});
  return {installed,install};
})();
