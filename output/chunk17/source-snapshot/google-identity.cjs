'use strict';
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('base64url');
class AuthenticationError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
function cookieValue(header, name) {
  if (typeof header !== 'string' || header.length > 4096) return '';
  const matches = header.split(';').map(part => part.trim().split('=')).filter(([key]) => key === name);
  return matches.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(matches[0][1]) ? matches[0][1] : '';
}
class GoogleIdentity {
  constructor({ clientId, clientSecret, redirectUri, frontendOrigin, bindings }, { client, now = Date.now, timeoutMs = 10000 } = {}) {
    const origin = new URL(frontendOrigin); const redirect = new URL(redirectUri);
    const local = ['localhost', '127.0.0.1'].includes(origin.hostname);
    if (origin.origin !== frontendOrigin || origin.username || origin.password
        || (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:'))
        || redirect.origin !== origin.origin || redirect.pathname !== '/api/research/oauth/google/callback'
        || redirect.search || redirect.hash || typeof clientId !== 'string' || !clientId.endsWith('.apps.googleusercontent.com')
        || typeof clientSecret !== 'string' || clientSecret.length < 8 || clientSecret.includes('REPLACE')
        || !Array.isArray(bindings) || !bindings.length) throw new Error('invalid_google_configuration');
    this.bindings = bindings.map(binding => {
      if (!binding || Object.keys(binding).sort().join(',') !== 'id,role,subject,tenant'
          || !['candidate', 'reviewer'].includes(binding.role)
          || ![binding.id, binding.tenant, binding.subject].every(v => typeof v === 'string' && v.length > 0 && v.length <= 255))
        throw new Error('invalid_google_binding');
      return Object.freeze({ ...binding });
    });
    if (new Set(this.bindings.map(b => b.subject)).size !== bindings.length
        || new Set(this.bindings.map(b => JSON.stringify([b.tenant, b.id]))).size !== bindings.length)
      throw new Error('duplicate_google_binding');
    this.clientId = clientId; this.frontendOrigin = frontendOrigin; this.secure = origin.protocol === 'https:';
    this.client = client || new (require('google-auth-library').OAuth2Client)(clientId, clientSecret, redirectUri);
    this.now = now; this.timeoutMs = timeoutMs; this.pending = new Map(); this.handoffs = new Map(); this.attempts = new Map();
  }
  cookie(name, value, seconds) {
    return `${name}=${value}; Path=/api/research/oauth/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${this.secure ? '; Secure' : ''}`;
  }
  cleanup() {
    for (const map of [this.pending, this.handoffs]) for (const [key, entry] of map) if (entry.expires <= this.now()) map.delete(key);
    for (const [key, entry] of this.attempts) if (entry.expires <= this.now()) this.attempts.delete(key);
  }
  begin(peer) {
    this.cleanup();
    if (!this.attempts.has(peer) && this.attempts.size >= 1000) throw new AuthenticationError(429, 'identity_rate_limit');
    const previous = this.attempts.get(peer) || { count: 0, expires: this.now() + 60000 };
    previous.count++; this.attempts.set(peer, previous);
    if (previous.count > 10 || this.pending.size >= 500) throw new AuthenticationError(429, 'identity_rate_limit');
    const state = random(); const browser = random(); const nonce = random(); const verifier = random();
    this.pending.set(hash(state), { browser: hash(browser), nonce, verifier, started: this.now(), expires: this.now() + 300000 });
    const location = this.client.generateAuthUrl({ response_type: 'code', scope: ['openid', 'email'],
      state, nonce, code_challenge: hashBuffer(verifier), code_challenge_method: 'S256', prompt: 'select_account' });
    return { location, cookie: this.cookie('ti_oidc_browser', browser, 300) };
  }
  async bounded(work) {
    let timer;
    try { return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new AuthenticationError(503, 'identity_provider_unavailable')), this.timeoutMs);
    })]); } finally { clearTimeout(timer); }
  }
  async callback(parameters, cookieHeader) {
    this.cleanup();
    if (parameters.getAll('state').length !== 1 || parameters.getAll('code').length !== 1
        || parameters.has('error')) throw new AuthenticationError(401, 'invalid_identity_transaction');
    const state = parameters.get('state'); const code = parameters.get('code');
    if (!/^[A-Za-z0-9_-]{43}$/.test(state || '') || typeof code !== 'string' || !code || code.length > 2048)
      throw new AuthenticationError(401, 'invalid_identity_transaction');
    const entry = this.pending.get(hash(state));
    const browser = cookieValue(cookieHeader, 'ti_oidc_browser');
    if (!entry || !browser || entry.browser !== hash(browser)) throw new AuthenticationError(401, 'invalid_identity_transaction');
    this.pending.delete(hash(state)); // One use even if exchange or validation fails.
    let tokens;
    try { ({ tokens } = await this.bounded(() => this.client.getToken({ code, codeVerifier: entry.verifier }))); }
    catch { throw new AuthenticationError(503, 'identity_provider_unavailable'); }
    if (typeof tokens?.id_token !== 'string' || tokens.id_token.length > 16384) throw new AuthenticationError(401, 'invalid_provider_assertion');
    try {
      const segments = tokens.id_token.split('.');
      if (segments.length !== 3 || !segments.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error('invalid_jwt');
      const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf8'));
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid || header.kid.length > 128
          || ['crit', 'jku', 'jwk', 'x5u'].some(key => Object.hasOwn(header, key))) throw new Error('invalid_jwt');
    } catch { throw new AuthenticationError(401, 'invalid_provider_assertion'); }
    let claims;
    try {
      const ticket = await this.bounded(() => this.client.verifyIdToken({ idToken: tokens.id_token, audience: this.clientId }));
      claims = ticket.getPayload();
    } catch { throw new AuthenticationError(401, 'invalid_provider_assertion'); }
    const seconds = Math.floor(this.now() / 1000);
    if (!claims || !['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)
        || claims.aud !== this.clientId || (claims.azp && claims.azp !== this.clientId)
        || claims.nonce !== entry.nonce || claims.email_verified !== true
        || !Number.isInteger(claims.exp) || claims.exp <= seconds
        || !Number.isInteger(claims.iat) || claims.iat > seconds + 60 || claims.iat < Math.floor(entry.started / 1000) - 60
        || this.now() >= entry.expires) throw new AuthenticationError(401, 'invalid_provider_assertion');
    const binding = this.bindings.find(b => b.subject === claims.sub);
    if (!binding) throw new AuthenticationError(403, 'unprovisioned_identity');
    if (this.handoffs.size >= 500) throw new AuthenticationError(429, 'identity_rate_limit');
    const handoff = random();
    this.handoffs.set(hash(handoff), { binding, maxExpires: claims.exp * 1000, expires: this.now() + 60000 });
    return { location: `${this.frontendOrigin}/?auth=complete`, cookies: [this.cookie('ti_oidc_browser', '', 0), this.cookie('ti_oidc_handoff', handoff, 60)] };
  }
  redeem(cookieHeader, origin, service, requestId) {
    this.cleanup();
    if (origin !== this.frontendOrigin) throw new AuthenticationError(403, 'identity_origin_denied');
    const cookie = cookieValue(cookieHeader, 'ti_oidc_handoff');
    const entry = cookie && this.handoffs.get(hash(cookie));
    if (!entry) throw new AuthenticationError(401, 'invalid_identity_handoff');
    this.handoffs.delete(hash(cookie));
    return { session: service.issueSession(entry.binding, requestId, 'external_login', entry.maxExpires),
      cookie: this.cookie('ti_oidc_handoff', '', 0) };
  }
}
const hashBuffer = value => crypto.createHash('sha256').update(value).digest('base64url');
module.exports = { GoogleIdentity, AuthenticationError, cookieValue };
