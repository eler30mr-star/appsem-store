/**
 * Auditoría REAL de reglas Firestore usando Firebase Web SDK anónimo.
 * No realiza NINGUNA escritura, ni lee datos privados con credenciales Admin.
 * Se ejecuta una sola vez desde CI después de publicar las reglas reforzadas.
 */
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore, terminate, collection, doc, query, where, limit,
  getDocsFromServer, getDocFromServer
} from 'firebase/firestore';

const firebaseSrc = readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8');
function publicValue(field) {
  const match = firebaseSrc.match(new RegExp('\\b' + field + '\\s*:\\s*"([^"]+)"'));
  if (!match) throw Error('Configuración pública no disponible: ' + field);
  return match[1];
}

if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
  throw Error('Comprobación denegada: no se admite emulador ni credenciales privadas.');
}
const projectId = publicValue('projectId');
if (projectId !== 'webs-8b1bf') throw Error('El proyecto Firebase no coincide.');

const app = initializeApp({
  apiKey: publicValue('apiKey'),
  projectId,
  appId: publicValue('appId'),
  authDomain: publicValue('authDomain')
}, 'appsem-phase2-public-rules-check');
const db = getFirestore(app);

async function withDeadline(promise) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(Error('Timeout Firestore Web SDK')), 24000);
      })
    ]);
  } finally { clearTimeout(timeout); }
}

async function expectPermissionDenied(promise, label) {
  try {
    await withDeadline(promise);
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.info('PASS: ' + label + ' denegado por reglas Firestore reales.');
      return;
    }
    throw Error('No se verificó la denegación de ' + label + ' (error de conexión/configuración).');
  }
  throw Error('INSEGURO: ' + label + ' aún permite lectura anónima.');
}

try {
  const published = await withDeadline(getDocsFromServer(query(
    collection(db, 'apps'), where('status', '==', 'published'), limit(1)
  )));
  if (published.empty) throw Error('No existen fichas publicadas para comprobar reglas.');
  const appId = published.docs[0].id;
  console.info('PASS: catálogo de aplicaciones publicadas legible para visitantes.');

  const appDoc = await withDeadline(getDocFromServer(doc(db, 'apps', appId)));
  if (!appDoc.exists() || appDoc.data().status !== 'published') {
    throw Error('La ficha pública no es accesible.');
  }
  console.info('PASS: ficha publicada accesible de forma anónima.');

  await withDeadline(getDocsFromServer(query(
    collection(db, 'apps', appId, 'comments'),
    where('approved', '==', true),
    limit(1)
  )));
  console.info('PASS: consulta pública de comentarios aprobados permitida.');

  // Los IDs son sintéticos. Únicamente se intenta leer, NUNCA escribir.
  const syntheticId = 'phase2-rules-check-read-only-nonexistent';
  await expectPermissionDenied(
    getDocFromServer(doc(db, 'apps', appId, 'likes', syntheticId)),
    'likes públicos'
  );
  await expectPermissionDenied(
    getDocFromServer(doc(db, 'apps', appId, 'ratings', syntheticId)),
    'ratings públicos'
  );
  await expectPermissionDenied(
    getDocsFromServer(query(collection(db, 'apps', appId, 'downloadClicks'), limit(1))),
    'historial de descargas'
  );
  await expectPermissionDenied(
    getDocsFromServer(query(collection(db, 'apps', appId, 'comments'), limit(1))),
    'comentarios pendientes sin filtro'
  );
  console.info('PASS FINAL: reglas endurecidas activas; auditoría solo lectura, sin datos modificados.');
} catch (error) {
  console.error('FAIL: verificación de reglas Firestore live: ' + error.message);
  process.exitCode = 1;
} finally {
  await terminate(db);
  await deleteApp(app);
}
