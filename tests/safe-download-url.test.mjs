import test from 'node:test';
import assert from 'node:assert/strict';
import { validatedDownloadUrl } from '../src/services/safeDownloadUrl.js';

test('Los links HTTPS oficiales se abren en el segundo gesto del visitante', () => {
  for (const url of [
    'https://play.google.com/store/apps/details?id=org.app',
    'https://example.org/download/a.apk?source=store'
  ]) assert.equal(validatedDownloadUrl(url), url);
});
test('Bloquea javascript/data/http, destinos internos y credenciales en enlace', () => {
  for (const url of [
    'javascript:alert(1)', 'data:text/html,hello', 'http://example.org/file.apk',
    'https://localhost/secret', 'https://127.0.0.1/panel',
    'https://user:pass@example.org/file.apk', 'https://site.local/data',
    '', null, {}, 'https://[::1]/', 'https://example.org:8443/file'
  ]) assert.equal(validatedDownloadUrl(url), null, String(url));
});
