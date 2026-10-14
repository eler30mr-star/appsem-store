import { createHmac } from 'node:crypto';

const ACTIONS = new Set(['like', 'rating', 'download']);
const APP_ID = /^[A-Za-z0-9_-]{1,128}$/;
const VISITOR_ID = /^[A-Za-z0-9-]{8,128}$/;
const LIMITS = { like: 12, rating: 8, download: 30 };
const BUCKET_MS = 15 * 60 * 1000;

export class PublicError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateInteraction(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PublicError(400, 'Solicitud inválida.');
  }
  const allowed = new Set(['action', 'appId', 'visitorId', 'rating', 'targetUrl', 'turnstileToken']);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    throw new PublicError(400, 'Campos de interacción no permitidos.');
  }
  const { action, appId, visitorId, rating, targetUrl, turnstileToken } = payload;
  if (!ACTIONS.has(action) || !APP_ID.test(appId || '') || !VISITOR_ID.test(visitorId || '')) {
    throw new PublicError(400, 'Interacción o identificador inválido.');
  }
  if (typeof turnstileToken !== 'string' || turnstileToken.length < 5 || turnstileToken.length > 2048) {
    throw new PublicError(400, 'Verificación anti-bot necesaria.');
  }
  if (action === 'rating' && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new PublicError(400, 'La valoración debe ser un entero entre 1 y 5.');
  }
  if (action !== 'rating' && rating !== undefined) {
    throw new PublicError(400, 'Valoración inesperada.');
  }
  if (action === 'download' && targetUrl !== undefined && (typeof targetUrl !== 'string' || targetUrl.length > 2048)) {
    throw new PublicError(400, 'Enlace de descarga inválido.');
  }
  if (action !== 'download' && targetUrl !== undefined) {
    throw new PublicError(400, 'Enlace inesperado.');
  }
  return { action, appId, visitorId, rating, targetUrl, turnstileToken };
}

export function keyedHash(secret, ...parts) {
  if (!secret || secret.length < 32) throw new Error('METRICS_HMAC_SECRET ausente o débil.');
  return createHmac('sha256', secret).update(parts.join('\x00')).digest('hex');
}

export function validateDownloadTarget(app, input) {
  const expected = app.playStoreUrl || app.downloadUrl;
  if (typeof expected !== 'string' || !expected) {
    throw new PublicError(409, 'No hay enlace de descarga configurado.');
  }
  let canonical;
  try {
    canonical = new URL(expected);
  } catch {
    throw new PublicError(409, 'El enlace del catálogo no es válido.');
  }
  if (canonical.protocol !== 'https:' ||
      !['play.google.com', 'apps.apple.com'].includes(canonical.hostname) ||
      canonical.username || canonical.password) {
    throw new PublicError(409, 'El destino de descarga no es una tienda autorizada.');
  }
  if (input && input !== expected) {
    throw new PublicError(400, 'El enlace de descarga no coincide con el catálogo.');
  }
  return expected;
}

export function nextRating(app, rating) {
  const count = app.ratingCount ?? 0;
  if (!Number.isSafeInteger(count) || count < 0 || count > 10000000) {
    throw new PublicError(409, 'Recuento de valoraciones inválido.');
  }
  const existingSum = Number(app.ratingSum);
  const existingAverage = Number(app.ratingAverage || 0);
  const sum = count === 0 ? 0 : (
    Number.isFinite(existingSum) && existingSum >= count && existingSum <= count * 5 ?
      existingSum : existingAverage * count
  );
  if (!Number.isFinite(sum) || sum < count || sum > count * 5) {
    throw new PublicError(409, 'Datos históricos de valoración no válidos.');
  }
  const total = sum + rating;
  return {
    ratingCount: count + 1,
    ratingSum: total,
    ratingAverage: Math.round((total / (count + 1)) * 100) / 100
  };
}

export async function recordInteraction({ db, FieldValue, payload, ip, secret, now = Date.now() }) {
  const { action, appId, visitorId, rating, targetUrl } = validateInteraction(payload);
  const actor = keyedHash(secret, 'visitor', visitorId);
  const ipHash = keyedHash(secret, 'ip', ip);
  const bucket = Math.floor(now / BUCKET_MS);
  const limitsPath = 'metricsLimits/' + bucket + '_' + action + '_' + ipHash;
  const appRef = db.doc('apps/' + appId);
  const limitRef = db.doc(limitsPath);
  const eventId = action === 'download' ? actor + '_' + bucket : actor;
  const collection = action === 'like' ? 'likes' : action === 'rating' ? 'ratings' : 'downloadClicks';
  const eventRef = db.doc('apps/' + appId + '/' + collection + '/' + eventId);

  return db.runTransaction(async (tx) => {
    // Todas las lecturas antes de la primera escritura (transacción Firestore).
    const [appSnapshot, eventSnapshot, rateSnapshot] = await Promise.all([
      tx.get(appRef), tx.get(eventRef), tx.get(limitRef)
    ]);
    if (!appSnapshot.exists || appSnapshot.data().status !== 'published') {
      throw new PublicError(404, 'La aplicación no está publicada.');
    }
    const app = appSnapshot.data();
    if (eventSnapshot.exists) {
      return { alreadyRecorded: true, action, ...(action === 'rating' ? { rating: eventSnapshot.data().rating } : {}) };
    }
    const requestCount = rateSnapshot.exists ? rateSnapshot.data().count : 0;
    if (!Number.isInteger(requestCount) || requestCount < 0 || requestCount >= LIMITS[action]) {
      throw new PublicError(429, 'Límite de interacciones alcanzado. Intenta más tarde.');
    }
    const serverTime = FieldValue.serverTimestamp();
    let document;
    let update;
    if (action === 'like') {
      document = { createdAt: serverTime };
      update = { likesCount: FieldValue.increment(1), metricsUpdatedAt: serverTime };
    } else if (action === 'rating') {
      document = { rating, createdAt: serverTime };
      update = { ...nextRating(app, rating), metricsUpdatedAt: serverTime };
    } else {
      const url = validateDownloadTarget(app, targetUrl);
      document = { targetUrl: url, createdAt: serverTime };
      update = { downloadsCount: FieldValue.increment(1), metricsUpdatedAt: serverTime };
    }
    tx.create(eventRef, document);
    tx.update(appRef, update);
    tx.set(limitRef, {
      count: requestCount + 1,
      expiresAt: new Date((bucket + 1) * BUCKET_MS + 7 * 24 * 3600000)
    });
    return { alreadyRecorded: false, action, ...(action === 'rating' ? { ratingAverage: update.ratingAverage, ratingCount: update.ratingCount } : {}) };
  });
}

export async function getInteractionStatus({ db, appId, visitorId, secret }) {
  if (!APP_ID.test(appId || '') || !VISITOR_ID.test(visitorId || '')) {
    throw new PublicError(400, 'Identificador inválido.');
  }
  const actor = keyedHash(secret, 'visitor', visitorId);
  const [app, like, rating] = await Promise.all([
    db.doc('apps/' + appId).get(),
    db.doc('apps/' + appId + '/likes/' + actor).get(),
    db.doc('apps/' + appId + '/ratings/' + actor).get()
  ]);
  if (!app.exists || app.data().status !== 'published') {
    throw new PublicError(404, 'Aplicación no publicada.');
  }
  return { liked: like.exists, rated: rating.exists ? rating.data().rating : null };
}
