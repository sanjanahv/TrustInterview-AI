'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const pathModule = require('node:path');
const { ResearchService, Denial } = require('./core.cjs');
const { SQLiteAssessmentStore, TransitionConflict } = require('./assessment-store.cjs');
const { GoogleIdentity, AuthenticationError } = require('./google-identity.cjs');

function createServer(service, { prefix = '', identity = null, authMode = identity ? 'google' : 'local' } = {}) {
  if (!['google', 'local'].includes(authMode) || (authMode === 'google') !== Boolean(identity)) throw new Error('invalid_authentication_mode');
  return http.createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Request-Id', requestId);
    let principal;
    try {
      const url = new URL(req.url, 'http://localhost');
      const incoming = url.pathname;
      if (prefix && !incoming.startsWith(prefix + '/')) throw new Denial(404, 'route_not_found');
      const path = incoming.slice(prefix.length);
      if (req.method === 'GET' && path === '/health') {
        res.end(JSON.stringify({ service: 'research-reference', status: 'up' })); return;
      }
      if (req.method === 'GET' && path === '/auth/config') {
        res.end(JSON.stringify({ mode: authMode })); return;
      }
      if (path.startsWith('/oauth/') && !identity) throw new Denial(404, 'route_not_found');
      if (req.method === 'GET' && path === '/oauth/google/start') {
        const result = identity.begin(req.socket.remoteAddress);
        res.statusCode = 303; res.setHeader('Location', result.location); res.setHeader('Set-Cookie', result.cookie);
        res.end(); return;
      }
      if (req.method === 'GET' && path === '/oauth/google/callback') {
        const result = await identity.callback(url.searchParams, req.headers.cookie);
        service.event(requestId, 'identity_callback', 'allow', null);
        res.statusCode = 303; res.setHeader('Location', result.location); res.setHeader('Set-Cookie', result.cookies);
        res.end(); return;
      }
      if (req.method === 'POST' && path === '/session' && authMode !== 'local') throw new Denial(404, 'route_not_found');
      const routes = [
        ['POST', /^\/session$/, 'login'], ['DELETE', /^\/session$/, 'logout'],
        ['POST', /^\/oauth\/session$/, 'oauthSession'],
        ['POST', /^\/assessments$/, 'create'],
        ['POST', /^\/assessments\/([a-f0-9-]+)\/answer$/, 'submit'],
        ['GET', /^\/assessments\/([a-f0-9-]+)$/, 'view'],
        ['GET', /^\/reviews\/([a-f0-9-]+)$/, 'reviewItem'],
        ['POST', /^\/reviews\/([a-f0-9-]+)$/, 'review']
      ];
      const route = routes.find(([method, pattern]) => method === req.method && pattern.test(path));
      if (!route) throw new Denial(404, 'route_not_found');
      if (!['login', 'oauthSession'].includes(route[2])) {
        const authorization = req.headers.authorization || '';
        if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) throw new Denial(401, 'invalid_session');
        principal = service.authenticate(authorization.slice(7));
      }
      let body = {};
      if (req.method === 'POST') {
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new Denial(415, 'json_required');
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 16384) throw new Denial(413, 'body_too_large');
          chunks.push(chunk);
        }
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Denial(400, 'invalid_json'); }
      }
      const assessmentId = path.match(route[1])[1];
      let result;
      switch (route[2]) {
        case 'oauthSession': {
          if (!body || Array.isArray(body) || Object.keys(body).length) throw new Denial(400, 'invalid_login');
          const completed = identity.redeem(req.headers.cookie, req.headers.origin, service, requestId);
          res.setHeader('Set-Cookie', completed.cookie); result = completed.session; break;
        }
        case 'login':
          if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.credential !== 'string')
            throw new Denial(400, 'invalid_login');
          result = service.login(body.credential, requestId, req.socket.remoteAddress); break;
        case 'logout': result = service.revoke(principal, requestId); break;
        case 'create': result = service.create(principal, body, requestId); break;
        case 'submit': result = await service.submit(principal, assessmentId, body, requestId); break;
        case 'view': result = service.view(principal, assessmentId); service.event(requestId, 'view', 'allow', principal, { assessmentId }); break;
        case 'reviewItem': result = service.reviewItem(principal, assessmentId); service.event(requestId, 'review_read', 'allow', principal, { assessmentId }); break;
        case 'review': result = service.review(principal, assessmentId, body, requestId); break;
      }
      res.end(JSON.stringify(result));
    } catch (error) {
      const knownDenial = error instanceof Denial || error instanceof TransitionConflict || error instanceof AuthenticationError;
      const status = knownDenial ? error.status : 503;
      try { service.event(requestId, 'request', 'deny', principal, { status }); } catch { /* Storage failure still denies response. */ }
      res.statusCode = status;
      res.end(JSON.stringify({ error: knownDenial ? error.code : 'service_unavailable', requestId }));
    }
  });
}

if (require.main === module) {
  const localDir = pathModule.join(__dirname, 'local');
  const principalsFile = process.env.RESEARCH_PRINCIPALS_FILE || pathModule.join(localDir, 'principals.json');
  const principalsJSON = process.env.RESEARCH_PRINCIPALS || (fs.existsSync(principalsFile) ? fs.readFileSync(principalsFile, 'utf8') : null);
  const databaseFile = process.env.RESEARCH_DATABASE_FILE || pathModule.join(localDir, 'assessments.sqlite');
  if (process.env.RESEARCH_AUDIT_FILE) throw new Error('Use RESEARCH_DATABASE_FILE for transactional assessment and audit storage; existing JSONL logs are not migrated.');
  const authMode = process.env.RESEARCH_AUTH_MODE || 'local';
  if (!['google', 'local'].includes(authMode)) throw new Error('Invalid RESEARCH_AUTH_MODE');
  let identity = null;
  let principals;
  if (authMode === 'google') {
    if (!process.env.RESEARCH_GOOGLE_CONFIG_FILE) throw new Error('Google mode requires RESEARCH_GOOGLE_CONFIG_FILE; no local or mock fallback.');
    identity = new GoogleIdentity(JSON.parse(fs.readFileSync(process.env.RESEARCH_GOOGLE_CONFIG_FILE, 'utf8')));
    principals = identity.bindings.map(({ id, tenant, role }) => ({ id, tenant, role, credential: crypto.randomBytes(32).toString('base64url') }));
  } else {
    if (!principalsJSON) throw new Error('Provision local demo identities first; no default credentials');
    principals = JSON.parse(principalsJSON);
  }
  // Offline fixture provider only. A live adapter and validated corpus are future work.
  const provider = async evidence => ({ observations: [{ evidenceId: 'answer', quote: evidence.answer.slice(0, 1000) }], recommendation: 'practice' });
  fs.mkdirSync(pathModule.dirname(databaseFile), { recursive: true, mode: 0o700 });
  const assessmentStore = new SQLiteAssessmentStore(databaseFile);
  const service = new ResearchService({ principals,
    provider, assessmentStore, audit: assessmentStore.audit });
  createServer(service, { prefix: '/api/research', identity, authMode }).listen(Number(process.env.RESEARCH_PORT || 5001), '127.0.0.1', () =>
    console.log(`Controlled API: ${authMode} authentication; SQLite assessments; offline evaluation fixture.`));
}
module.exports = { createServer };
