import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const base = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  VITE_METRICS_BACKEND: 'server'
};
test('Build bloqueado si falta un secreto al activar métricas de servidor', () => {
  const p = spawnSync(process.execPath, ['scripts/check-metrics-env.mjs'], {
    env: base, encoding: 'utf8'
  });
  assert.equal(p.status, 1);
  assert.match(p.stderr, /FIREBASE_SERVICE_ACCOUNT_JSON/);
});
test('Build permite modo anterior por defecto sin secretos', () => {
  const p = spawnSync(process.execPath, ['scripts/check-metrics-env.mjs'], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME }, encoding: 'utf8'
  });
  assert.equal(p.status, 0);
});
test('Build permite modo servidor únicamente con configuración completa', () => {
  const p = spawnSync(process.execPath, ['scripts/check-metrics-env.mjs'], {
    env: {
      ...base, METRICS_BACKEND_ENABLED: 'true',
      PUBLIC_SITE_ORIGIN: 'https://appsem-store.vercel.app',
      FIREBASE_SERVICE_ACCOUNT_JSON: 'example-not-real',
      METRICS_HMAC_SECRET: 'example-32-characters-long-not-real-key',
      TURNSTILE_SECRET_KEY: 'example-not-real', VITE_TURNSTILE_SITE_KEY: 'example-public'
    }, encoding: 'utf8'
  });
  assert.equal(p.status, 0);
});
