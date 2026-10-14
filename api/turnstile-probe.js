/**
 * Prueba TEMPORAL de Turnstile real para el dominio canónico.
 * Exclusivamente verifica tokens y no importa Firebase, no lee ni escribe Firestore.
 * Cuando PHASE2_TURNSTILE_PROBE_ENABLED no está en true, devuelve 404.
 */
import { isIP } from 'node:net';
import { PublicError } from '../server/metricsCore.js';
import { verifyTurnstile } from '../server/verifyTurnstile.js';

const MAX_BODY_BYTES = 4096;
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const MAX_VISITORS_PER_INSTANCE = 1024;

function reply(res, code, message) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(message);
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function renderPage(sitekey) {
  return [
    '<!doctype html>',
    '<html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    '<title>Prueba de seguridad — Appsem Store</title>',
    '<style>body{font:16px system-ui,sans-serif;background:#f5f7fa;color:#16243b;margin:0;padding:32px 16px}',
    'main{max-width:510px;margin:5vh auto;background:#fff;border:1px solid #dae0e9;border-radius:16px;padding:28px;box-shadow:0 8px 30px #12233812}',
    'h1{font-size:24px}p{line-height:1.55}button{border:0;border-radius:8px;background:#1455b3;color:white;font:inherit;font-weight:600;padding:12px 20px;cursor:pointer}',
    'button:disabled{opacity:.55;cursor:wait}#challenge{margin:18px 0}#result{font-weight:600;min-height:24px}small{color:#58677b}',
    'a{color:#1455b3}</style></head><body>',
    '<main id="turnstile-probe" data-sitekey="' + escapeAttribute(sitekey) + '">',
    '<h1>Verificación de seguridad</h1>',
    '<p>Esta página comprueba Cloudflare Turnstile sin modificar likes, valoraciones, comentarios ni descargas.</p>',
    '<p>Pulsa <strong>Iniciar prueba</strong>. Si Cloudflare solicita verificarte, sigue sus indicaciones.</p>',
    '<button id="start" type="button">Iniciar prueba</button>',
    '<div id="challenge" aria-live="polite"></div><p id="result" role="status" aria-live="polite"></p>',
    '<small>Solo se enviará a Vercel el token de un solo uso de Cloudflare. No se registrará ninguna interacción en Firebase.</small>',
    '<p><a href="/">Volver a Appsem Store</a></p>',
    '</main><script src="/turnstile-probe.js" defer></script></body></html>'
  ].join('\n');
}

export function createTurnstileProbeHandler({
  env = process.env,
  verify = verifyTurnstile,
  now = () => Date.now()
} = {}) {
  const limits = new Map();
  return async function turnstileProbe(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (env.VERCEL_ENV !== 'production' ||
        env.PHASE2_TURNSTILE_PROBE_ENABLED !== 'true') {
      return reply(res, 404, { error: 'Prueba no disponible.' });
    }

    const origin = env.PUBLIC_SITE_ORIGIN;
    const secret = env.TURNSTILE_SECRET_KEY;
    const sitekey = env.VITE_TURNSTILE_SITE_KEY;
    let expectedHost;
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || url.pathname !== '/' ||
          url.username || url.password || url.hash || url.search) throw Error('bad-origin');
      expectedHost = url.host;
    } catch {
      return reply(res, 503, { error: 'Prueba sin configurar.' });
    }
    if (!secret || !sitekey || sitekey.length > 512) {
      return reply(res, 503, { error: 'Prueba sin configurar.' });
    }
    if (req.headers.host !== expectedHost) {
      return reply(res, 404, { error: 'Dominio no autorizado.' });
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderPage(sitekey));
    }
    res.setHeader('Allow', 'GET, POST');
    if (req.method !== 'POST') return reply(res, 405, { error: 'Método no permitido.' });
    if (req.headers.origin !== origin) {
      return reply(res, 403, { error: 'Origen no autorizado.' });
    }
    if (String(req.headers['content-type'] || '').split(';')[0] !== 'application/json') {
      return reply(res, 415, { error: 'Se requiere JSON.' });
    }
    let size = 0;
    try {
      size = Buffer.byteLength(JSON.stringify(req.body ?? null));
    } catch {
      return reply(res, 400, { error: 'JSON inválido.' });
    }
    if (size > MAX_BODY_BYTES) {
      return reply(res, 413, { error: 'Solicitud demasiado grande.' });
    }
    const declared = req.headers['content-length'];
    if (declared !== undefined &&
        (!Number.isSafeInteger(Number(declared)) || Number(declared) < 0 ||
         Number(declared) > MAX_BODY_BYTES)) {
      return reply(res, 413, { error: 'Solicitud demasiado grande.' });
    }
    const token = req.body?.token;
    if (typeof token !== 'string' || token.length < 10 || token.length > 2048) {
      return reply(res, 400, { error: 'Token no válido.' });
    }
    const forwarded = req.headers['x-vercel-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    if (!isIP(ip)) return reply(res, 400, { error: 'IP no disponible.' });

    // Límite orientativo por instancia; la prueba está habilitada solo temporalmente.
    const current = now();
    if (limits.size > MAX_VISITORS_PER_INSTANCE) limits.clear();
    const previous = limits.get(ip);
    const next = !previous || current - previous.start >= WINDOW_MS ?
      { start: current, count: 1 } : { start: previous.start, count: previous.count + 1 };
    limits.set(ip, next);
    if (next.count > MAX_PER_WINDOW) {
      return reply(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    }

    try {
      await verify({ token, ip, secret, expectedHostname: expectedHost });
      return reply(res, 200, { verified: true, message: 'Verificación real aprobada. No se modificó Firebase.' });
    } catch (error) {
      if (error instanceof PublicError && error.status === 403) {
        return reply(res, 403, { verified: false, error: 'Cloudflare no validó el desafío.' });
      }
      return reply(res, 503, { verified: false, error: 'No se pudo comprobar Turnstile. Reintenta.' });
    }
  };
}

export default createTurnstileProbeHandler();
