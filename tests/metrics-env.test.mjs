import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const base = {
  PATH: process.env.PATH, HOME: process.env.HOME,
  VITE_METRICS_BACKEND: 'server'
};
const syntheticAccount = JSON.stringify({
  type: 'service_account', project_id: 'webs-8b1bf',
  client_email: 'test@webs-8b1bf.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nFICTICIO-PARA-PRUEBAS\n-----END PRIVATE KEY-----\n'
});
const enabled = {
  ...base, METRICS_BACKEND_ENABLED: 'true',
  PUBLIC_SITE_ORIGIN: 'https://appsem-store.vercel.app',
  FIREBASE_SERVICE_ACCOUNT_JSON: syntheticAccount,
  METRICS_HMAC_SECRET: 'example-32-characters-long-not-real-key',
  TURNSTILE_SECRET_KEY: 'example-not-real',
  VITE_TURNSTILE_SITE_KEY: 'example-public'
};
function check(env) {
  return spawnSync(process.execPath, ['scripts/check-metrics-env.mjs'],
    { env, encoding: 'utf8' });
}
test('Bloquea modo server sin secretos', () => {
  const run = check(base);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /FIREBASE_SERVICE_ACCOUNT_JSON/);
});
test('Modo anterior funciona por defecto', () => {
  assert.equal(check({ PATH: process.env.PATH, HOME: process.env.HOME }).status, 0);
});
test('Permite estructura válida, sin afirmar credenciales autenticadas', () => {
  assert.equal(check(enabled).status, 0);
});
test('Bloquea JSON ilegible y proyecto Firebase equivocado', () => {
  assert.equal(check({ ...enabled, FIREBASE_SERVICE_ACCOUNT_JSON: 'not-json' }).status, 1);
  const wrong = JSON.stringify({ ...JSON.parse(syntheticAccount), project_id: 'otro-proyecto' });
  assert.equal(check({ ...enabled, FIREBASE_SERVICE_ACCOUNT_JSON: wrong }).status, 1);
});
test('Bloquea hostname sin HTTPS', () => {
  assert.equal(check({ ...enabled, PUBLIC_SITE_ORIGIN: 'http://appsem-store.vercel.app' }).status, 1);
});
