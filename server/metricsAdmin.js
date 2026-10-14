import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export function getMetricsFirestore() {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const testProject = process.env.GCLOUD_PROJECT;
  // Solo pruebas automatizadas: loopback local + ID ficticio + habilitación explícita.
  // Vercel productivo nunca puede utilizar esta rama.
  if (process.env.METRICS_EMULATOR_TEST === 'true' &&
      !process.env.VERCEL && !process.env.VERCEL_ENV &&
      /^(?:localhost|127\.0\.0\.1):8080$/.test(emulatorHost || '') &&
      /^demo-[a-z0-9-]+$/.test(testProject || '')) {
    const name = 'appsem-metrics-emulator';
    const app = getApps().find(instance => instance.name === name) ||
      initializeApp({ projectId: testProject }, name);
    return { db: getFirestore(app), FieldValue };
  }
  if (emulatorHost || process.env.METRICS_EMULATOR_TEST === 'true') {
    throw new Error('Entorno Emulator no autorizado: API bloqueada.');
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no configurado.');
  const account = JSON.parse(raw);
  if (account.project_id !== 'webs-8b1bf' ||
      !account.client_email || !account.private_key ||
      account.type !== 'service_account') {
    throw new Error('Identidad de servicio inesperada. No se inicia Firestore.');
  }
  const name = 'appsem-metrics';
  const app = getApps().find(instance => instance.name === name) ||
    initializeApp({
      credential: cert({
        projectId: 'webs-8b1bf',
        clientEmail: account.client_email,
        privateKey: account.private_key
      }),
      projectId: 'webs-8b1bf'
    }, name);
  return { db: getFirestore(app), FieldValue };
}
