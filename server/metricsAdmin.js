import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export function getMetricsFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no configurado.');
  const account = JSON.parse(raw);
  if (account.project_id !== 'webs-8b1bf' ||
      !account.client_email || !account.private_key ||
      account.type !== 'service_account') {
    throw new Error('Identidad de servicio inesperada. No se inicia Firestore.');
  }
  const name = 'appsem-metrics';
  const app = getApps().find(x => x.name === name) ||
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
