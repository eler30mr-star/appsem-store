import test from 'node:test';
import assert from 'node:assert/strict';
import { probePhase2Readiness } from '../scripts/phase2-readiness-core.mjs';

const fakeDb = {
  collection(name) {
    assert.equal(name, 'apps');
    return { limit(n) {
      assert.equal(n, 1);
      return { async get() { return { empty: false }; } };
    } };
  }
};
const response = (data, ok=true) => ({ok, async json(){return data;}});
test('acepta lectura simulada y rechazo Turnstile esperado sin copiar datos', async () => {
  const result=await probePhase2Readiness({db:fakeDb,cloudflareSecret:'synthetic-only',
    fetchFn:async(url, opts)=>{
      assert.match(url,/cloudflare\.com\/turnstile\/v0\/siteverify/);
      assert.equal(opts.method,'POST');
      const body=JSON.parse(opts.body);
      assert.equal(body.response,'appsem-invalid-test-token');
      return response({success:false,'error-codes':['invalid-input-response']});
    }});
  assert.deepEqual(result,{firebaseReadable:true,turnstileRejectsInvalidToken:true});
});
test('rechaza error de clave secreta Cloudflare',async()=>{
  await assert.rejects(probePhase2Readiness({db:fakeDb,cloudflareSecret:'bad',
    fetchFn:async()=>response({success:false,'error-codes':['invalid-input-secret']})}),
    /TURNSTILE_NEGATIVE_CHECK_FAILED/);
});
test('rechaza una respuesta HTTP fallida de Turnstile',async()=>{
  await assert.rejects(probePhase2Readiness({db:fakeDb,cloudflareSecret:'synthetic',
    fetchFn:async()=>response({},false)}),/TURNSTILE_HTTP_FAILED/);
});
test('rechaza si la lectura de Firestore no confirma el snapshot',async()=>{
  await assert.rejects(probePhase2Readiness({db:{collection:()=>({limit:()=>({get:async()=>({})})})},
    cloudflareSecret:'synthetic',fetchFn:async()=>{throw Error('no debe llamar a Turnstile')}}),/FIREBASE_READ_NOT_CONFIRMED/);
});
