'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const pathModule = require('node:path');
const { ResearchService, Denial } = require('./core.cjs');
const { SQLiteAssessmentStore, TransitionConflict } = require('./assessment-store.cjs');

function createServer(service, { prefix = '' } = {}) {
  return http.createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Request-Id', requestId);
    let principal;
    try {
      const incoming = new URL(req.url, 'http://localhost').pathname;
      if (prefix && !incoming.startsWith(prefix + '/')) throw new Denial(404, 'route_not_found');
      const path = incoming.slice(prefix.length);
      if (req.method === 'GET' && path === '/health') {
        res.end(JSON.stringify({ service: 'research-reference', status: 'up' })); return;
      }
      const routes = [
        ['POST', /^\/session$/, 'login'], ['DELETE', /^\/session$/, 'logout'],
        ['POST', /^\/assessments$/, 'create'],
        ['POST', /^\/assessments\/([a-f0-9-]+)\/answer$/, 'submit'],
        ['GET', /^\/assessments\/([a-f0-9-]+)$/, 'view'],
        ['GET', /^\/reviews\/([a-f0-9-]+)$/, 'reviewItem'],
        ['POST', /^\/reviews\/([a-f0-9-]+)$/, 'review']
      ];
      const route = routes.find(([method, pattern]) => method === req.method && pattern.test(path));
      if (!route) throw new Denial(404, 'route_not_found');
      if (route[2] !== 'login') {
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
      const knownDenial = error instanceof Denial || error instanceof TransitionConflict;
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
  if (!principalsJSON) throw new Error('Provision identities first using research/setup-local.cjs or RESEARCH_PRINCIPALS; no default credentials');
  // Offline fixture provider only. A live adapter and validated corpus are future work.
  const provider = async evidence => ({ observations: [{ evidenceId: 'answer', quote: evidence.answer.slice(0, 1000) }], recommendation: 'practice' });
  fs.mkdirSync(pathModule.dirname(databaseFile), { recursive: true, mode: 0o700 });
  const assessmentStore = new SQLiteAssessmentStore(databaseFile);
  const service = new ResearchService({ principals: JSON.parse(principalsJSON),
    provider, assessmentStore, audit: assessmentStore.audit });
  createServer(service, { prefix: '/api/research' }).listen(Number(process.env.RESEARCH_PORT || 5001), '127.0.0.1', () =>
    console.log('Controlled research API on loopback /api/research; SQLite assessments; offline fixture provider.'));
}
module.exports = { createServer };
