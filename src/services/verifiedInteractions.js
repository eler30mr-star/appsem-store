import { getClientId } from './clientId';
import { getFreshTurnstileToken } from './turnstileClient';

export const useVerifiedMetrics = import.meta.env.VITE_METRICS_BACKEND === 'server';

async function callApi(url, options) {
  let response;
  try {
    response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  } catch {
    throw new Error('Servicio de interacciones no disponible.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la interacción.');
  return payload;
}
export async function verifiedInteraction(action, appId, extra = {}) {
  if (!useVerifiedMetrics) throw new Error('Backend de métricas no activado.');
  const turnstileToken = await getFreshTurnstileToken();
  return callApi('/api/interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, appId, visitorId: getClientId(), turnstileToken, ...extra })
  });
}
export async function verifiedInteractionStatus(appId) {
  if (!useVerifiedMetrics) throw new Error('Backend de métricas no activado.');
  const params = new URLSearchParams({ appId, visitorId: getClientId() });
  return callApi('/api/interaction?' + params.toString());
}
