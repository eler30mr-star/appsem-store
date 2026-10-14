/**
 * Protector de despliegue: no permitir cliente en modo servidor si el backend
 * queda sin secretos. Nunca mostrar secretos en los logs.
 */
const enabled = process.env.VITE_METRICS_BACKEND === 'server';
if (enabled) {
  const required = [
    'METRICS_BACKEND_ENABLED',
    'PUBLIC_SITE_ORIGIN',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'METRICS_HMAC_SECRET',
    'TURNSTILE_SECRET_KEY',
    'VITE_TURNSTILE_SITE_KEY'
  ];
  const missing = required.filter(name => !process.env[name]);
  if (process.env.METRICS_BACKEND_ENABLED !== 'true') {
    missing.push('METRICS_BACKEND_ENABLED=true');
  }
  if ((process.env.METRICS_HMAC_SECRET || '').length < 32) {
    missing.push('METRICS_HMAC_SECRET (mínimo 32 caracteres)');
  }
  try {
    const url = new URL(process.env.PUBLIC_SITE_ORIGIN);
    if (url.protocol !== 'https:' || url.pathname !== '/') {
      missing.push('PUBLIC_SITE_ORIGIN (https://dominio sin ruta)');
    }
  } catch {
    missing.push('PUBLIC_SITE_ORIGIN (URL válida)');
  }
  if (missing.length > 0) {
    console.error('El modo seguro de métricas no está listo. Faltan o son incorrectos:',
      [...new Set(missing)].join(', '));
    process.exit(1);
  }
  console.info('La configuración declarada para métricas de servidor está completa (credenciales NO probadas).');
} else {
  console.info('Métricas backend no activadas; se conserva el flujo Firestore anterior.');
}
