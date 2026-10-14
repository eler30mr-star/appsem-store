/**
 * Evita activar el cliente server si faltan configuración o credenciales estructurales.
 * NO prueba validez criptográfica ni permisos remotos; no revela secretos en logs.
 */
const enabled = process.env.VITE_METRICS_BACKEND === 'server';
if (enabled) {
  const required = [
    'METRICS_BACKEND_ENABLED', 'PUBLIC_SITE_ORIGIN',
    'FIREBASE_SERVICE_ACCOUNT_JSON', 'METRICS_HMAC_SECRET',
    'TURNSTILE_SECRET_KEY', 'VITE_TURNSTILE_SITE_KEY'
  ];
  const errors = required.filter(name => !process.env[name]);
  if (process.env.METRICS_BACKEND_ENABLED !== 'true') errors.push('METRICS_BACKEND_ENABLED=true');
  if ((process.env.METRICS_HMAC_SECRET || '').length < 32) errors.push('METRICS_HMAC_SECRET');
  try {
    const url = new URL(process.env.PUBLIC_SITE_ORIGIN);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.username ||
        url.password || url.search || url.hash) errors.push('PUBLIC_SITE_ORIGIN');
  } catch { errors.push('PUBLIC_SITE_ORIGIN'); }
  try {
    const raw = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!raw || raw.type !== 'service_account' || raw.project_id !== 'webs-8b1bf' ||
        typeof raw.client_email !== 'string' ||
        !raw.client_email.endsWith('.gserviceaccount.com') ||
        typeof raw.private_key !== 'string' ||
        !raw.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
      errors.push('FIREBASE_SERVICE_ACCOUNT_JSON (proyecto/tipo/campos)');
    }
  } catch { errors.push('FIREBASE_SERVICE_ACCOUNT_JSON (JSON válido)'); }
  if (errors.length) {
    console.error('Activación bloqueada por variables ausentes o inválidas:',
      [...new Set(errors)].join(', '));
    process.exitCode = 1;
  } else {
    console.info('Estructura de configuración correcta. Autenticación de servicio AÚN NO verificada.');
  }
} else {
  console.info('Métricas seguras no activadas: se conserva el flujo anterior.');
}
