/**
 * Solo se ejecuta durante un build productivo y con flag explícita.
 * Nunca escribe en Firebase; no se publica como endpoint web.
 * No imprime JSON, IDs de apps, claves ni respuestas remotas completas.
 */
import { getMetricsFirestore } from '../server/metricsAdmin.js';
import { probePhase2Readiness } from './phase2-readiness-core.mjs';

if (process.env.PHASE2_READINESS_CHECK !== 'true') {
  console.info('Fase 2 readiness: no solicitada; frontend anterior intacto.');
} else {
  try {
    if (process.env.VERCEL_ENV !== 'production' ||
        process.env.METRICS_BACKEND_ENABLED === 'true' ||
        process.env.VITE_METRICS_BACKEND === 'server' ||
        process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.METRICS_EMULATOR_TEST === 'true') {
      throw new Error('READINESS_ENVIRONMENT_NOT_SAFE');
    }
    if (!process.env.TURNSTILE_SECRET_KEY) throw new Error('TURNSTILE_SECRET_MISSING');
    const { db } = getMetricsFirestore();
    await probePhase2Readiness({
      db, cloudflareSecret: process.env.TURNSTILE_SECRET_KEY
    });
    console.info('PASS PHASE2 FIREBASE: cuenta de servicio autenticada; lectura autorizada sin mostrar datos.');
    console.info('PASS PHASE2 TURNSTILE: Siteverify remoto rechaza token falso con error esperado.');
    console.info('PENDIENTE: verificar desafío real válido antes de activar el backend.');
  } catch {
    // No mostrar mensajes de las SDK remotas porque podrían contener detalles privados.
    console.error('FAIL PHASE2 READINESS: fallo de autenticación/lectura o comprobación anti-bot.');
    process.exitCode = 1;
  }
}
