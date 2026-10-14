/** Interfaz aislada: no importa servicios de Firebase ni registra eventos. */
const panel = document.getElementById('turnstile-probe');
const button = document.getElementById('start');
const challenge = document.getElementById('challenge');
const output = document.getElementById('result');
let widgetId;

function say(message) { output.textContent = message; }
function loadTurnstile() {
  return new Promise((resolve, reject) => {
    if (window.turnstile?.render) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => window.turnstile?.render ? resolve() : reject(Error('Widget no disponible'));
    script.onerror = () => reject(Error('No se pudo cargar Turnstile'));
    document.head.appendChild(script);
  });
}
async function submitToken(token) {
  say('Comprobando el token con Cloudflare desde Vercel…');
  try {
    const result = await fetch('/api/turnstile-probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      credentials: 'same-origin'
    });
    const body = await result.json();
    if (!result.ok || body?.verified !== true) {
      throw Error(body?.error || 'La verificación no fue aprobada.');
    }
    say('✓ Verificación real aprobada. Firebase no se modificó.');
    button.textContent = 'Prueba completada';
    button.disabled = true;
    if (widgetId !== undefined) window.turnstile.remove(widgetId);
  } catch (error) {
    say(error.message || 'No se pudo completar la prueba. Recarga la página.');
    button.textContent = 'Reintentar';
    button.disabled = false;
    if (widgetId !== undefined) {
      try { window.turnstile.reset(widgetId); } catch { /* recargar si venció */ }
    }
  }
}
button.addEventListener('click', async () => {
  if (widgetId !== undefined) {
    window.location.reload();
    return;
  }
  button.disabled = true;
  say('Cargando Cloudflare Turnstile…');
  try {
    await loadTurnstile();
    say('Esperando verificación de Cloudflare…');
    widgetId = window.turnstile.render(challenge, {
      sitekey: panel.dataset.sitekey,
      action: 'appsem-metrics',
      theme: 'auto',
      callback: token => { void submitToken(token); },
      'error-callback': () => say('No se pudo completar el desafío. Recarga la página.'),
      'expired-callback': () => say('El desafío venció. Recarga la página.')
    });
  } catch {
    say('Cloudflare no pudo cargar. Comprueba la conexión y recarga la página.');
    button.textContent = 'Reintentar';
    button.disabled = false;
  }
});
