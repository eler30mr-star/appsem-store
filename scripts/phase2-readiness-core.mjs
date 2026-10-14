/**
 * Ensayo no destructivo de producción.
 * Firestore: lectura de un máximo de 1 documento, sin registrar contenido.
 * Turnstile: token deliberadamente inválido, para comprobar rechazo remoto.
 * Un rechazo esperado NO prueba que un token humano auténtico funcione.
 */
export async function probePhase2Readiness({ db, cloudflareSecret, fetchFn = fetch }) {
  const snapshot = await db.collection('apps').limit(1).get();
  if (!snapshot || typeof snapshot.empty !== 'boolean') {
    throw new Error('FIREBASE_READ_NOT_CONFIRMED');
  }
  const response = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: cloudflareSecret, response: 'appsem-invalid-test-token' }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('TURNSTILE_HTTP_FAILED');
  const data = await response.json();
  const codes = data?.['error-codes'];
  if (data?.success !== false || !Array.isArray(codes) ||
      !codes.includes('invalid-input-response') ||
      codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
    throw new Error('TURNSTILE_NEGATIVE_CHECK_FAILED');
  }
  return { firebaseReadable: true, turnstileRejectsInvalidToken: true };
}
