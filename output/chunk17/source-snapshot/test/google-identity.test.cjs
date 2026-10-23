'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const { GoogleIdentity } = require('../google-identity.cjs');
const { ResearchService } = require('../core.cjs');
const { createServer } = require('../server.cjs');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const wrongKeys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const config = { clientId: 'fixture.apps.googleusercontent.com', clientSecret: 'fixture-secret',
  frontendOrigin: 'http://localhost:3000', redirectUri: 'http://localhost:3000/api/research/oauth/google/callback',
  bindings: [{ subject: 'subject-1', id: 'candidate', tenant: 'A', role: 'candidate' }] };
function sign(claims, key = keys.privateKey, header = { alg: 'RS256', kid: 'test-key' }) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = encoded(header) + '.' + encoded(claims);
  return body + '.' + crypto.sign('RSA-SHA256', Buffer.from(body), key).toString('base64url');
}
function setup({ claims = {}, key, header, providerFailure = false } = {}) {
  let clock = Date.now(); let lastOptions; let tokenOptions;
  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  const generate = client.generateAuthUrl.bind(client);
  client.generateAuthUrl = options => { lastOptions = { ...options }; return generate(options); };
  client.getToken = async options => {
    tokenOptions = options;
    if (providerFailure) throw new Error('fixture provider unavailable');
    return { tokens: { id_token: sign({ iss: 'https://accounts.google.com', aud: config.clientId, sub: 'subject-1',
      email_verified: true, iat: Math.floor(clock / 1000), exp: Math.floor(clock / 1000) + 3600, nonce: lastOptions.nonce, ...claims }, key, header) } };
  };
  // Test certificate replaces only network key retrieval; the SDK still verifies the actual RSA signature and claims.
  client.getFederatedSignonCertsAsync = async () => ({ certs: { 'test-key': keys.publicKey.export({ type: 'spki', format: 'pem' }) } });
  const identity = new GoogleIdentity(config, { client, now: () => clock, timeoutMs: 20 });
  const service = new ResearchService({ principals: [{ id: 'candidate', tenant: 'A', role: 'candidate', credential: 'c'.repeat(32) }],
    provider: async () => {}, now: () => clock });
  const begin = identity.begin('fixture-peer');
  const state = new URL(begin.location).searchParams.get('state');
  const cookie = begin.cookie.split(';')[0];
  const callback = (params = new URLSearchParams({ state, code: 'fixture-code' }), cookies = cookie) => identity.callback(params, cookies);
  return { identity, client, service, begin, state, cookie, callback,
    advance: ms => { clock += ms; }, tokenOptions: () => tokenOptions, lastOptions: () => lastOptions };
}
const codeIs = code => error => error.code === code;

test('SDK-verified identity gets only its server-assigned role, with PKCE and no token URL', async () => {
  const ctx = setup({ claims: { role: 'reviewer', tenant: 'B', email: 'arbitrary@example.test' } });
  assert.match(ctx.begin.cookie, /HttpOnly; SameSite=Lax/);
  assert.equal(new URL(ctx.begin.location).searchParams.get('code_challenge_method'), 'S256');
  const result = await ctx.callback();
  assert.equal(crypto.createHash('sha256').update(ctx.tokenOptions().codeVerifier).digest('base64url'), ctx.lastOptions().code_challenge);
  assert.equal(result.location, config.frontendOrigin + '/?auth=complete');
  const redeemed = ctx.identity.redeem(result.cookies[1].split(';')[0], config.frontendOrigin, ctx.service, 'redeem');
  assert.equal(redeemed.session.role, 'candidate');
  const principal = ctx.service.authenticate(redeemed.session.token);
  assert.equal(principal.tenant, 'A'); assert.equal(principal.id, 'candidate');
});
test('actual invalid RSA signature is rejected by the installed Google SDK', async () => {
  const ctx = setup({ key: wrongKeys.privateKey });
  await assert.rejects(ctx.callback(), codeIs('invalid_provider_assertion'));
  assert.equal(ctx.identity.handoffs.size, 0); assert.equal(ctx.service.sessions.size, 0);
});
test('wrong issuer, audience, nonce, authorized party, or unverified email denies identity', async () => {
  for (const claims of [{ iss: 'https://attacker.test' }, { aud: 'other-client' }, { nonce: 'wrong' },
    { azp: 'other-client' }, { email_verified: false }, { email_verified: 'true' }]) {
    const ctx = setup({ claims }); await assert.rejects(ctx.callback(), codeIs('invalid_provider_assertion'));
  }
});
test('unsupported signing algorithms and attacker-directed key URLs are rejected', async () => {
  for (const header of [{ alg: 'none', kid: 'test-key' }, { alg: 'HS256', kid: 'test-key' },
    { alg: 'RS256', kid: 'test-key', jku: 'https://attacker.test/keys' }]) {
    await assert.rejects(setup({ header }).callback(), codeIs('invalid_provider_assertion'));
  }
});
test('expired and not-yet-issued identity assertions are rejected', async () => {
  const seconds = Math.floor(Date.now() / 1000);
  for (const claims of [{ exp: seconds - 1 }, { iat: seconds + 120 }, { iat: seconds - 600 }])
    await assert.rejects(setup({ claims }).callback(), codeIs('invalid_provider_assertion'));
});
test('missing or wrong browser binding cannot complete someone else\'s state', async () => {
  const ctx = setup();
  await assert.rejects(ctx.callback(undefined, ''), codeIs('invalid_identity_transaction'));
  await assert.rejects(ctx.callback(undefined, 'ti_oidc_browser=' + 'x'.repeat(43)), codeIs('invalid_identity_transaction'));
  await assert.rejects(ctx.callback(new URLSearchParams({ state: 'x'.repeat(43), code: 'code' })), codeIs('invalid_identity_transaction'));
  assert.equal(ctx.identity.handoffs.size, 0);
});
test('transaction expires and duplicate callback parameters are rejected', async () => {
  const ctx = setup();
  const duplicated = new URLSearchParams({ state: ctx.state, code: 'code' }); duplicated.append('state', ctx.state);
  await assert.rejects(ctx.callback(duplicated), codeIs('invalid_identity_transaction'));
  ctx.advance(300000); await assert.rejects(ctx.callback(), codeIs('invalid_identity_transaction'));
});
test('callback and handoff each permit one use only', async () => {
  const ctx = setup(); const result = await ctx.callback(); const cookie = result.cookies[1].split(';')[0];
  await assert.rejects(ctx.callback(), codeIs('invalid_identity_transaction'));
  ctx.identity.redeem(cookie, config.frontendOrigin, ctx.service, 'first');
  assert.throws(() => ctx.identity.redeem(cookie, config.frontendOrigin, ctx.service, 'replay'), codeIs('invalid_identity_handoff'));
});
test('verified but unassigned Google subjects do not get an application session', async () => {
  const ctx = setup({ claims: { sub: 'unassigned-subject' } });
  await assert.rejects(ctx.callback(), codeIs('unprovisioned_identity')); assert.equal(ctx.service.sessions.size, 0);
});
test('handoff checks exact Origin and expires independently of provider tokens', async () => {
  const ctx = setup(); const result = await ctx.callback(); const cookie = result.cookies[1].split(';')[0];
  for (const origin of [undefined, 'http://attacker.test', 'http://localhost:3001'])
    assert.throws(() => ctx.identity.redeem(cookie, origin, ctx.service, 'r'), codeIs('identity_origin_denied'));
  ctx.advance(60000);
  assert.throws(() => ctx.identity.redeem(cookie, config.frontendOrigin, ctx.service, 'r'), codeIs('invalid_identity_handoff'));
});
test('provider errors and timeout do not fall back to demo sessions', async () => {
  const failed = setup({ providerFailure: true });
  await assert.rejects(failed.callback(), codeIs('identity_provider_unavailable'));
  const timed = setup(); timed.client.getToken = () => new Promise(() => {});
  await assert.rejects(timed.callback(), codeIs('identity_provider_unavailable'));
  assert.equal(failed.service.sessions.size + timed.service.sessions.size, 0);
});
test('provider expiry caps the application session at handoff', async () => {
  const ctx = setup({ claims: { exp: Math.floor(Date.now() / 1000) + 1 } });
  const result = await ctx.callback(); ctx.advance(2000);
  assert.throws(() => ctx.identity.redeem(result.cookies[1].split(';')[0], config.frontendOrigin, ctx.service, 'r'), codeIs('expired_identity'));
});
test('identity configuration pins the callback origin and rejects ambiguous bindings', () => {
  for (const change of [{ frontendOrigin: 'http://attacker.test' }, { redirectUri: 'http://attacker.test/callback' },
    { bindings: [config.bindings[0], config.bindings[0]] }, { bindings: [{ ...config.bindings[0], role: 'admin' }] }])
    assert.throws(() => new GoogleIdentity({ ...config, ...change }, { client: {} }));
  const secure = new GoogleIdentity({ ...config, frontendOrigin: 'https://study.example.test',
    redirectUri: 'https://study.example.test/api/research/oauth/google/callback' }, { client: {} });
  assert.match(secure.cookie('test', 'value', 10), /; Secure$/);
});
test('identity start attempts are bounded', () => {
  const ctx = setup(); for (let i = 0; i < 9; i++) ctx.identity.begin('fixture-peer');
  assert.throws(() => ctx.identity.begin('fixture-peer'), codeIs('identity_rate_limit'));
});
test('HTTP Google mode disables demo login and redeems verified browser-bound identity', async t => {
  const ctx = setup(); const server = createServer(ctx.service, { prefix: '/api/research', identity: ctx.identity });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/research`;
  assert.equal((await fetch(base + '/session', { method: 'POST' })).status, 404);
  assert.deepEqual(await (await fetch(base + '/auth/config')).json(), { mode: 'google', providerMode: 'offline' });
  const start = await fetch(base + '/oauth/google/start', { redirect: 'manual' }); assert.equal(start.status, 303);
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const callback = await fetch(base + `/oauth/google/callback?state=${state}&code=fixture-code`, {
    redirect: 'manual', headers: { Cookie: start.headers.get('set-cookie').split(';')[0] } });
  assert.equal(callback.status, 303); assert.equal(callback.headers.get('location'), config.frontendOrigin + '/?auth=complete');
  const handoff = callback.headers.getSetCookie().find(c => c.startsWith('ti_oidc_handoff=')).split(';')[0];
  const response = await fetch(base + '/oauth/session', { method: 'POST', headers: {
    'Content-Type': 'application/json', Cookie: handoff, Origin: config.frontendOrigin }, body: '{}' });
  assert.equal(response.status, 200); const session = await response.json(); assert.equal(session.role, 'candidate');
  const assessment = await fetch(base + '/assessments', { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: '{}' });
  assert.equal(assessment.status, 200);
});
