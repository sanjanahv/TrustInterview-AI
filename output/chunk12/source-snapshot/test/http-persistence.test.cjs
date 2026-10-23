'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { SQLiteAssessmentStore } = require('../assessment-store.cjs');
const { ResearchService } = require('../core.cjs');
const { createServer } = require('../server.cjs');

test('HTTP assessment remains available after restart and old bearer tokens are invalid', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'trustinterview-http-persistence-'));
  const file = path.join(folder, 'assessments.sqlite');
  const start = async () => {
    const store = new SQLiteAssessmentStore(file);
    const service = new ResearchService({ principals: [{ id: 'candidate', tenant: 'A', role: 'candidate', credential: 'a'.repeat(32) }],
      provider: async e => ({ observations: [{ evidenceId: 'answer', quote: e.answer }], recommendation: 'practice' }),
      assessmentStore: store, audit: store.audit });
    const server = createServer(service, { prefix: '/api/research' });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return { store, server, base: `http://127.0.0.1:${server.address().port}/api/research` };
  };
  const stop = async app => { await new Promise(resolve => app.server.close(resolve)); app.store.close(); };
  let app = await start();
  t.after(async () => { await stop(app); fs.rmSync(folder, { recursive: true, force: true }); });
  const request = (route, method, body, token) => fetch(app.base + route, { method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const login = async () => (await (await request('/session', 'POST', { credential: 'a'.repeat(32) })).json()).token;
  const oldToken = await login();
  const { id } = await (await request('/assessments', 'POST', {}, oldToken)).json();
  const released = await (await request(`/assessments/${id}/answer`, 'POST', { answer: 'identity authorization resource' }, oldToken)).json();
  assert.equal(released.score.score, 100);
  await stop(app); app = await start();
  assert.equal((await request(`/assessments/${id}`, 'GET', undefined, oldToken)).status, 401);
  const fresh = await login();
  const restored = await (await request(`/assessments/${id}`, 'GET', undefined, fresh)).json();
  assert.equal(restored.state, 'released'); assert.equal(restored.score.score, 100);
  assert.equal(app.store.audit.events.filter(e => e.action === 'submit' && e.decision === 'allow').length, 1);
});
