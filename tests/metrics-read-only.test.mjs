import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/interaction.js';

function makeResponse() {
  return {
    headers: {}, statusCode: null, body: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('modo read-only bloquea POST incluso antes de contactar a Firebase Admin o Turnstile', async () => {
  const previous = Object.fromEntries(['METRICS_BACKEND_ENABLED','PUBLIC_SITE_ORIGIN','METRICS_HMAC_SECRET','TURNSTILE_SECRET_KEY'].map(k=>[k,process.env[k]]));
  try {
    Object.assign(process.env, {
      METRICS_BACKEND_ENABLED: 'read-only',
      PUBLIC_SITE_ORIGIN: 'https://appsem-store.vercel.app',
      METRICS_HMAC_SECRET: 'test-only-HMAC-secret-32-chars-long!',
      TURNSTILE_SECRET_KEY: 'synthetic-test-secret'
    });
    const req = { method: 'POST', headers: {
      origin: 'https://appsem-store.vercel.app',
      'content-type':'application/json',
      'x-vercel-forwarded-for':'203.0.113.23'
    }, body: { action: 'like', appId: 'app', visitorId: 'fake-user-1234', turnstileToken: 'fake-token' }};
    const result = makeResponse();
    await handler(req,result);
    assert.equal(result.statusCode, 503);
    assert.match(result.body.error, /todavía no habilitado/i);
    assert.equal(result.headers['cache-control'],'no-store');
    // GET puede pasar la compuerta, pero una IP ausente bloquea antes de consultar Firestore.
    const get = makeResponse();
    await handler({method:'GET',headers:{origin:'https://appsem-store.vercel.app'},query:{appId:'app',visitorId:'fake-user-1234'}},get);
    assert.equal(get.statusCode, 400);
    assert.match(get.body.error,/IP/);
  } finally {
    for(const [key,value] of Object.entries(previous)) {
      if(value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('modo por defecto continúa apagado', async()=>{
  const prior=process.env.METRICS_BACKEND_ENABLED;
  try {
    delete process.env.METRICS_BACKEND_ENABLED;
    const res=makeResponse();
    await handler({method:'GET',headers:{},query:{}},res);
    assert.equal(res.statusCode,503);
    assert.match(res.body.error,/Métricas del servidor todavía no habilitadas/);
  }finally{
    if(prior===undefined) delete process.env.METRICS_BACKEND_ENABLED;
    else process.env.METRICS_BACKEND_ENABLED=prior;
  }
});
