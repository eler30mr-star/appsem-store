import { PublicError, getInteractionStatus, recordInteraction, validateInteraction } from '../server/metricsCore.js';
import { getMetricsFirestore } from '../server/metricsAdmin.js';
import { verifyTurnstile } from '../server/verifyTurnstile.js';

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}
function ready() {
  if (process.env.METRICS_BACKEND_ENABLED !== 'true') {
    throw new PublicError(503, 'Métricas del servidor todavía no habilitadas.');
  }
  const origin = process.env.PUBLIC_SITE_ORIGIN;
  const secret = process.env.METRICS_HMAC_SECRET;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!origin || !secret || secret.length < 32 || !turnstileSecret ||
      new URL(origin).protocol !== 'https:') {
    throw new PublicError(503, 'Servicio no configurado.');
  }
  return { origin, secret, turnstileSecret };
}
export default async function handler(req, res) {
  res.setHeader('Allow', 'GET, POST');
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: 'Método no permitido.' });
  try {
    const { origin, secret, turnstileSecret } = ready();
    if (req.headers.origin && req.headers.origin !== origin) {
      throw new PublicError(403, 'Origen no autorizado.');
    }
    // Vercel sobreescribe Forwarded-For para impedir suplantación en Vercel Hosting.
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '')
      .split(',')[0].trim();
    if (!ip || ip.length > 64) throw new PublicError(400, 'IP de origen no disponible.');
    const { db, FieldValue } = getMetricsFirestore();
    if (req.method === 'GET') {
      const data = await getInteractionStatus({
        db, appId: req.query?.appId, visitorId: req.query?.visitorId, secret
      });
      return json(res, 200, data);
    }
    if (String(req.headers['content-type'] || '').split(';')[0] !== 'application/json') {
      throw new PublicError(415, 'Se requiere JSON.');
    }
    // Content-Length es opcional en HTTP/2; validar también JSON ya parseado.
    const declared = req.headers['content-length'];
    const declaredBytes = declared === undefined ? null : Number(declared);
    let actualBytes;
    try {
      actualBytes = Buffer.byteLength(JSON.stringify(req.body ?? null));
    } catch {
      throw new PublicError(400, 'Cuerpo JSON inválido.');
    }
    if ((declaredBytes !== null && (!Number.isSafeInteger(declaredBytes) ||
        declaredBytes < 0 || declaredBytes > 8192)) || actualBytes > 8192) {
      throw new PublicError(413, 'Tamaño de solicitud no permitido.');
    }
    // Acepta solo solicitudes POST originadas desde el propio sitio.
    if (req.headers.origin !== origin) {
      throw new PublicError(403, 'Origen requerido para registrar interacciones.');
    }
    const body = validateInteraction(req.body);
    await verifyTurnstile({
      token: body.turnstileToken,
      ip,
      secret: turnstileSecret,
      expectedHostname: new URL(origin).hostname
    });
    const output = await recordInteraction({ db, FieldValue, payload: body, ip, secret });
    return json(res, 200, output);
  } catch (error) {
    const status = error instanceof PublicError ? error.status : 503;
    if (!(error instanceof PublicError)) console.error('metrics backend unavailable:', error?.message);
    return json(res, status, { error: error instanceof PublicError ? error.message : 'Interacción temporalmente no disponible.' });
  }
}
