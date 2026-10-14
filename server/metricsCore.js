import { createHmac } from 'node:crypto';

const ACTIONS = new Set(['like', 'rating', 'download', 'comment']);
const APP_ID = /^[A-Za-z0-9_-]{1,128}$/;
const VISITOR_ID = /^[A-Za-z0-9-]{8,128}$/;
const LIMITS = { like: 12, rating: 8, download: 30, comment: 3 };
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
  const allowed = new Set(['action', 'appId', 'visitorId', 'rating', 'targetUrl', 'turnstileToken', 'name', 'comment']);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    throw new PublicError(400, 'Campos de interacción no permitidos.');
  }
  const { action, appId, visitorId, rating, targetUrl, turnstileToken, name, comment } = payload;
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
  if (action === 'comment') {
    if (typeof name !== 'string' || typeof comment !== 'string' ||
        name.trim().length < 2 || name.trim().length > 60 ||
        comment.trim().length < 5 || comment.trim().length > 800 ||
        name.length > 100 || comment.length > 1000) {
      throw new PublicError(400, 'Nombre o comentario fuera de los límites permitidos.');
    }
  } else if (name !== undefined || comment !== undefined) {
    throw new PublicError(400, 'Texto de comentario inesperado.');
  }
  return { action, appId, visitorId, rating, targetUrl, turnstileToken,
    ...(action === 'comment' ? { name: name.trim(), comment: comment.trim() } : {}) };
}

export function keyedHash(secret, ...parts) {
  if (!secret || secret.length < 32) throw new Error('METRICS_HMAC_SECRET ausente o débil.');
  return createHmac('sha256', secret).update(parts.join('\x00')).digest('hex');
}

export function validateDownloadTarget(app, input) {
  // El enlace debe figurar EXACTAMENTE en el catálogo editado por el Admin.
  // Soporta Play Store y descargas HTTPS oficiales externas (APK).
  const urls = [app.downloadUrl, app.apkUrl, app.playStoreUrl]
    .filter(value => typeof value === 'string' && value.length > 0);
  const expected = input || urls[0];
  if (!expected || !urls.includes(expected)) {
    throw new PublicError(400, 'El destino no coincide con el catálogo publicado.');
  }
  let canonical;
  try {
    canonical = new URL(expected);
  } catch {
    throw new PublicError(409, 'El enlace del catálogo no es válido.');
  }
  const host = canonical.hostname.toLowerCase();
  if (canonical.protocol !== 'https:' || !host || canonical.username ||
      canonical.password || canonical.port ||
      host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      host.includes(':')) {
    throw new PublicError(409, 'El destino debe ser una URL HTTPS pública del catálogo.');
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

/**
 * Comentarios: moderación previa, ID determinístico por contenido/visitante/bucket
 * y límite por IP. El navegador no decide si está aprobado.
 */
export async function recordComment({ db, FieldValue, payload, ip, secret, now = Date.now() }) {
  const { appId, visitorId, name, comment } = validateInteraction(payload);
  if (payload.action !== 'comment') throw new PublicError(400, 'Acción inesperada.');
  const bucket = Math.floor(now / BUCKET_MS);
  const actor = keyedHash(secret, 'visitor', visitorId);
  const ipHash = keyedHash(secret, 'ip', ip);
  const eventId = keyedHash(secret, 'comment', appId, actor, name, comment, String(bucket));
  const appRef = db.doc('apps/' + appId);
  const commentRef = db.doc('apps/' + appId + '/comments/' + eventId);
  const rateRef = db.doc('commentsLimits/' + bucket + '_' + ipHash);
  return db.runTransaction(async (tx) => {
    const [app, prior, rate] = await Promise.all([
      tx.get(appRef), tx.get(commentRef), tx.get(rateRef)
    ]);
    if (!app.exists || app.data().status !== 'published') {
      throw new PublicError(404, 'La aplicación no está publicada.');
    }
    if (prior.exists) return { action: 'comment', alreadyRecorded: true, status: 'pending' };
    const used = rate.exists ? rate.data().count : 0;
    if (!Number.isSafeInteger(used) || used < 0 || used >= LIMITS.comment) {
      throw new PublicError(429, 'Has enviado varios comentarios. Intenta más tarde.');
    }
    tx.create(commentRef, {
      name, comment, approved: false, createdAt: FieldValue.serverTimestamp()
    });
    tx.set(rateRef, {
      count: used + 1,
      expiresAt: new Date((bucket + 1) * BUCKET_MS + 7 * 24 * 3600000)
    });
    return { action: 'comment', alreadyRecorded: false, status: 'pending' };
  });
}

export async function recordInteraction({ db, FieldValue, payload, ip, secret, now = Date.now() }) {
  const { action, appId, visitorId, rating, targetUrl } = validateInteraction(payload);
  if (action === 'comment') {
    return recordComment({ db, FieldValue, payload, ip, secret, now });
  }
  const actor = keyedHash(secret, 'visitor', visitorId);
  const ipHash = keyedHash(secret, 'ip', ip);
  const bucket = Math.floor(now / BUCKET_MS);
  const limitsPath = 'metricsLimits/' + bucket + '_' + action + '_' + ipHash;
  const appRef = db.doc('apps/' + appId);
  const limitRef = db.doc(limitsPath);
  const eventId = action === 'download' ? actor + '_' + bucket : actor;
  const collection = action === 'like' ? 'likes' : action === 'rating' ? 'ratings' : 'downloadClicks';
  const eventRef = db.doc('apps/' + appId + '/' + collection + '/' + eventId);
  // Las versiones anteriores escribían el ID local del visitante sin HMAC.
  // Leer el registro heredado evita contabilizar un segundo like o rating.
  const legacyRef = action === 'download' ? null : db.doc('apps/' + appId + '/' + collection + '/' + visitorId);

  return db.runTransaction(async (tx) => {
    // Todas las lecturas antes de la primera escritura (transacción Firestore).
    const [appSnapshot, eventSnapshot, rateSnapshot, legacySnapshot] = await Promise.all([
      tx.get(appRef), tx.get(eventRef), tx.get(limitRef),
      legacyRef ? tx.get(legacyRef) : Promise.resolve(null)
    ]);
    if (!appSnapshot.exists || appSnapshot.data().status !== 'published') {
      throw new PublicError(404, 'La aplicación no está publicada.');
    }
    const app = appSnapshot.data();
    // La validación del enlace debe ocurrir ANTES de deduplicar:
    // un registro previo no puede convertir una URL falsificada en éxito.
    const verifiedTarget = action === 'download' ? validateDownloadTarget(app, targetUrl) : null;
    if (eventSnapshot.exists || legacySnapshot?.exists) {
      const existing = eventSnapshot.exists ? eventSnapshot : legacySnapshot;
      return { alreadyRecorded: true, action, ...(action === 'rating' ? { rating: existing.data().rating } : {}) };
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
      document = { targetUrl: verifiedTarget, createdAt: serverTime };
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
  // Comprobar la app antes de consultar cuatro registros de eventos.
  // Una ID inexistente/no publicada consume solo 1 lectura y no revela actividad.
  const app = await db.doc('apps/' + appId).get();
  if (!app.exists || app.data().status !== 'published') {
    throw new PublicError(404, 'Aplicación no publicada.');
  }
  const [like, legacyLike, rating, legacyRating] = await Promise.all([
    db.doc('apps/' + appId + '/likes/' + actor).get(),
    db.doc('apps/' + appId + '/likes/' + visitorId).get(),
    db.doc('apps/' + appId + '/ratings/' + actor).get(),
    db.doc('apps/' + appId + '/ratings/' + visitorId).get()
  ]);
  return { liked: like.exists || legacyLike.exists,
    rated: rating.exists ? rating.data().rating : legacyRating.exists ? legacyRating.data().rating : null };
}
