import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicError } from '../server/metricsCore.js';
import { createTurnstileProbeHandler } from '../api/turnstile-probe.js';

const origin = 'https://appsem-store.vercel.app';
const baseEnv = Object.freeze({
  VERCEL_ENV: 'production',
  PHASE2_TURNSTILE_PROBE_ENABLED: 'true',
  PUBLIC_SITE_ORIGIN: origin,
  TURNSTILE_SECRET_KEY: 'not-a-real-secret-123',
  VITE_TURNSTILE_SITE_KEY: 'a-public-site-key'
});
const validHeaders = {
  host: 'appsem-store.vercel.app',
  origin,
  'content-type': 'application/json',
  'x-vercel-forwarded-for': '203.0.113.42'
};

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(status) { this.statusCode = status; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; }
  };
}
async function invoke(handler, method, { headers = validHeaders, body = {} } = {}) {
  const res = response();
  await handler({ method, headers, body }, res);
  return res;
}

test('flag apagado o preview impiden cualquier acceso a prueba', async () => {
  for (const env of [
    { ...baseEnv, PHASE2_TURNSTILE_PROBE_ENABLED: 'false' },
    { ...baseEnv, VERCEL_ENV: 'preview' }
  ]) {
    const probe = createTurnstileProbeHandler({ env });
    assert.equal((await invoke(probe, 'GET')).statusCode, 404);
    assert.equal((await invoke(probe, 'POST', {body:{token:'0.token-real-de-ejemplo'}})).statusCode, 404);
  }
});

test('GET entrega HTML compatible con CSP y sin exponer secreto de servidor', async () => {
  const probe = createTurnstileProbeHandler({env:baseEnv});
  const answer = await invoke(probe, 'GET');
  assert.equal(answer.statusCode, 200);
  assert.match(answer.headers['content-type'], /text\/html/);
  assert.match(answer.headers['x-robots-tag'], /noindex/);
  assert.match(answer.body, /data-sitekey="a-public-site-key"/);
  assert.match(answer.body, /src="\/turnstile-probe.js"/);
  assert.doesNotMatch(answer.body, /not-a-real-secret-123/);
  assert.doesNotMatch(answer.body, /<script[^>]*>[^<]+/);
});

test('GET de host alterno denegado, incluso siendo Vercel', async () => {
  const probe = createTurnstileProbeHandler({env:baseEnv});
  assert.equal((await invoke(probe,'GET',{headers:{...validHeaders,host:'preview.vercel.app'}})).statusCode,404);
});

test('POST token real se verifica exactamente una vez, sin Firestore',async()=>{
  const received = [];
  const probe = createTurnstileProbeHandler({
    env:baseEnv,
    verify:async args => { received.push(args); return true; }
  });
  const result=await invoke(probe,'POST',{body:{token:'0.token-opaco-de-prueba_ABC'}});
  assert.equal(result.statusCode,200);
  assert.deepEqual(result.body,{verified:true,message:'Verificación real aprobada. No se modificó Firebase.'});
  assert.deepEqual(received,[{
    token:'0.token-opaco-de-prueba_ABC',
    ip:'203.0.113.42',
    expectedHostname:'appsem-store.vercel.app',
    secret:baseEnv.TURNSTILE_SECRET_KEY
  }]);
});

test('POST inválido bloqueado antes de Cloudflare: origin, content-type, token e IP',async()=>{
  let calls=0;
  const probe=createTurnstileProbeHandler({env:baseEnv,verify:async()=>{calls++;return true;}});
  const cases=[
    [{headers:{...validHeaders,origin:'https://evil.example'},body:{token:'0.token-valido-simulado'}},403],
    [{headers:{...validHeaders,'content-type':'text/plain'},body:{token:'0.token-valido-simulado'}},415],
    [{headers:validHeaders,body:{token:'x'}},400],
    [{headers:{...validHeaders,'x-vercel-forwarded-for':'bad-ip'},body:{token:'0.token-valido-simulado'}},400],
    [{headers:validHeaders,body:{token:'a'.repeat(2050)}},400],
    [{headers:{...validHeaders,'content-length':'99999'},body:{token:'0.token-valido-simulado'}},413]
  ];
  for(const [args,status] of cases) assert.equal((await invoke(probe,'POST',args)).statusCode,status);
  assert.equal(calls,0);
});

test('errores Siteverify nunca devuelven detalles internos',async()=>{
  for(const [error,status] of [[new PublicError(403,'raw-cloudflare-error'),403],[Error('private-sdk-error'),503]]) {
    const probe=createTurnstileProbeHandler({env:baseEnv,verify:async()=>{throw error;}});
    const result=await invoke(probe,'POST',{body:{token:'0.token-valido-simulado'}});
    assert.equal(result.statusCode,status);
    assert.doesNotMatch(JSON.stringify(result.body),/raw-cloudflare-error|private-sdk-error/);
  }
});

test('límite por IP previene abuso básico de Siteverify sin tocar Firebase',async()=>{
  let calls=0;
  const probe=createTurnstileProbeHandler({env:baseEnv,verify:async()=>{calls++;return true;},now:()=>5000});
  for(let n=0;n<8;n++) assert.equal((await invoke(probe,'POST',{body:{token:'0.token-valido-simulado'}})).statusCode,200);
  assert.equal((await invoke(probe,'POST',{body:{token:'0.token-valido-simulado'}})).statusCode,429);
  assert.equal(calls,8);
});

test('no admite métodos distintos de GET/POST',async()=>{
  const probe=createTurnstileProbeHandler({env:baseEnv});
  const res=await invoke(probe,'PUT');
  assert.equal(res.statusCode,405);
  assert.equal(res.headers.allow,'GET, POST');
});
