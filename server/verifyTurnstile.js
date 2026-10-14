import { PublicError } from './metricsCore.js';

export async function verifyTurnstile({ token, ip, secret, expectedHostname }) {
  if (!secret || !expectedHostname) throw new Error('Turnstile no configurado.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: controller.signal
    });
  } catch {
    throw new PublicError(503, 'Verificación anti-bot no disponible.');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new PublicError(503, 'Verificación anti-bot temporalmente no disponible.');
  const data = await response.json();
  if (data.success !== true || data.hostname !== expectedHostname ||
      data.action !== 'appsem-metrics') {
    throw new PublicError(403, 'No se pudo validar la interacción.');
  }
  return true;
}
