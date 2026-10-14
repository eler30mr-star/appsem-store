/**
 * Widget interactivo Turnstile: tokens de un solo uso, render explícito.
 * Solo carga el recurso cuando se activa el backend seguro.
 */
let loading;
function loadTurnstile() {
  if (window.turnstile?.render) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    element.async = true;
    element.crossOrigin = 'anonymous';
    element.onload = () => {
      if (window.turnstile?.render) resolve();
      else reject(new Error('No se pudo iniciar verificación de seguridad.'));
    };
    element.onerror = () => reject(new Error('No se pudo cargar la verificación de seguridad.'));
    document.head.appendChild(element);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
export async function getFreshTurnstileToken() {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!sitekey) throw new Error('La verificación anti-bot no está configurada.');
  await loadTurnstile();
  const panel = document.createElement('div');
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-label', 'Verificación para registrar interacción');
  Object.assign(panel.style, {
    position: 'fixed', zIndex: '200000', bottom: '20px', right: '20px',
    background: '#fff', color: '#172033', border: '1px solid #d8deea',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', padding: '16px', borderRadius: '12px'
  });
  const title = document.createElement('p');
  title.textContent = 'Verifica que eres una persona para continuar.';
  title.style.margin = '0 0 10px';
  const slot = document.createElement('div');
  panel.append(title, slot);
  document.body.appendChild(panel);
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      let widgetId;
      const timeout = setTimeout(() => done(new Error('La verificación tardó demasiado.')), 120000);
      function done(error, result) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { if (widgetId !== undefined) window.turnstile.remove(widgetId); } catch { /* widget cerrado */ }
        if (error) reject(error);
        else resolve(result);
      }
      widgetId = window.turnstile.render(slot, {
        sitekey,
        action: 'appsem-metrics',
        theme: 'auto',
        callback: token => done(null, token),
        'error-callback': () => done(new Error('Verificación anti-bot rechazada.')),
        'expired-callback': () => done(new Error('El código de seguridad venció. Reintenta.'))
      });
    });
  } finally {
    panel.remove();
  }
}
