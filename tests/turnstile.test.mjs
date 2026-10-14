import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile } from '../server/verifyTurnstile.js';
import { PublicError } from '../server/metricsCore.js';

test('Cloudflare Siteverify valida hostname, action y respuesta firmada; falla cerrado', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const valid = { success: true, action: 'appsem-metrics', hostname: 'appsem-store.vercel.app' };
  const params = {
    token: 'fake-unit-token', ip: '198.51.100.42',
    secret: 'secret-unit-test', expectedHostname: 'appsem-store.vercel.app'
  };
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ ...valid }) };
    };
    assert.equal(await verifyTurnstile(params), true);
    assert.match(calls[0].url, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
    assert.equal(JSON.parse(calls[0].init.body).response, params.token);
    for (const invalid of [
      { ...valid, success: false },
      { ...valid, hostname: 'malicioso.example' },
      { ...valid, action: 'otro' },
      { ...valid, action: undefined }
    ]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => invalid });
      await assert.rejects(verifyTurnstile(params),
        e => e instanceof PublicError && e.status === 403);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(verifyTurnstile(params),
      e => e instanceof PublicError && e.status === 503);
    await assert.rejects(verifyTurnstile({ ...params, secret: '' }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
