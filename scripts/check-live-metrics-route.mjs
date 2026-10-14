/** 
 * Comprobación de ruta REAL en Vercel; solo GET y sin acceso a Firestore.
 * Se ejecuta durante la migración, cuando el backend debe permanecer APAGADO.
 * Responder 404 HTML implica que Vercel no está sirviendo api/interaction.js.
 * No pasa claves, datos personales ni tokens, y jamás realiza POST.
 */
const url = 'https://appsem-store.vercel.app/api/interaction';
const expected = 'Métricas del servidor todavía no habilitadas.';

try {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    },
    signal: AbortSignal.timeout(20000)
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status !== 503 || !contentType.includes('application/json')) {
    throw new Error(
      `La API no respondió como backend desactivado: HTTP ${response.status}, tipo ${contentType || 'desconocido'}.`
    );
  }
  let body;
  try { body = await response.json(); } 
  catch { throw new Error('La respuesta no es JSON válido.'); }
  if (body?.error !== expected) {
    throw new Error('El endpoint no devolvió el estado de backend desactivado esperado.');
  }
  console.info('PASS: endpoint /api/interaction accesible en Vercel; 503 JSON controlado (backend apagado).');
  console.info('No se probó conexión Firebase ni token Turnstile: ambos siguen pendientes de ensayo separado.');
} catch (error) {
  console.error('FAIL: comprobación HTTP externa de la API: ' + error.message);
  process.exitCode = 1;
}
