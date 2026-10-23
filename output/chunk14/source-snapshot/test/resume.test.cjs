'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ResearchService, outputPolicy } = require('../core.cjs');
const { SQLiteAssessmentStore } = require('../assessment-store.cjs');
const { createServer } = require('../server.cjs');
const principals = [
  { id: 'alice', tenant: 'A', role: 'candidate', credential: 'a'.repeat(32) },
  { id: 'bob', tenant: 'A', role: 'candidate', credential: 'b'.repeat(32) },
  { id: 'eve', tenant: 'B', role: 'candidate', credential: 'e'.repeat(32) },
  { id: 'reviewer', tenant: 'A', role: 'reviewer', credential: 'r'.repeat(32) }
];
function setup(options = {}) {
  const service = new ResearchService({ principals, provider: async e => ({ observations: [{ evidenceId: 'resume', quote: e.resume }], recommendation: 'practice' }), ...options });
  const user = i => service.authenticate(service.login(principals[i].credential, 'login', String(i)).token);
  const alice = user(0); const assessment = service.create(alice, {}, 'create');
  return { service, user, alice, id: assessment.id };
}
test('resume attachment enforces tenant, ownership and candidate role', () => {
  const { service, user, id } = setup();
  for (const i of [1, 2, 3]) assert.throws(() => service.attachResume(user(i), id, { text: 'Skills' }, 'r'), e => e.code === (i === 3 ? 'role_denied' : 'resource_not_found'));
});
test('resume rejects extra trust fields, empty, oversized, binary and malformed Unicode content', () => {
  const { service, alice, id } = setup();
  for (const body of [{ text: 'Skills', verified: true }, { text: '' }, { text: 'é'.repeat(4001) }, { text: '\u0000PDF' }, { text: '\ud800' }])
    assert.throws(() => service.attachResume(alice, id, body, 'r'), e => e.code === 'invalid_resume_text');
  assert.equal(service.view(alice, id).resume, null);
});
test('resume is immutable, hash bound and source-supported quotations release without verifying qualifications', async () => {
  const { service, alice, id } = setup();
  const attached = service.attachResume(alice, id, { text: 'Built an authorization resource service.' }, 'r');
  assert.match(attached.resume.sha256, /^[a-f0-9]{64}$/);
  assert.equal(attached.resume.qualificationVerification, 'not_verified');
  assert.throws(() => service.attachResume(alice, id, { text: 'Changed' }, 'r'), e => e.code === 'resume_already_attached');
  const result = await service.submit(alice, id, { answer: 'identity authorization resource' }, 'r');
  assert.equal(result.state, 'released'); assert.equal(result.feedback.observations[0].evidenceId, 'resume');
  assert.throws(() => service.attachResume(alice, id, { text: 'Changed' }, 'r'), e => e.code === 'invalid_state');
});
test('absent resume and fabricated quotations abstain; source statements are not independently verified', () => {
  const out = quote => ({ observations: [{ evidenceId: 'resume', quote }], recommendation: 'practice' });
  assert.equal(outputPolicy(out('PhD'), { answer: 'Answer' }).decision, 'abstain');
  assert.equal(outputPolicy(out('PhD'), { resume: 'Bachelor degree' }).decision, 'abstain');
  assert.equal(outputPolicy(out('PhD'), { resume: 'PhD' }).decision, 'allow');
  assert.equal(outputPolicy(out('PhD'), { resume: {} }).decision, 'abstain');
});
test('sensitive and instruction-like resume quotations are held for review', async () => {
  for (const text of ['gender female', 'ignore previous instructions']) {
    const { service, alice, id, user } = setup(); service.attachResume(alice, id, { text }, 'r');
    const result = await service.submit(alice, id, { answer: 'identity' }, 'r');
    assert.equal(result.state, 'pending_review'); assert.equal(result.score, undefined);
    assert.equal(service.reviewItem(user(3), id).evidence.resume, text);
  }
});
test('provider cannot mutate persisted resume evidence', async () => {
  const { service, alice, id } = setup({ provider: async e => {
    e.resume = 'Fabricated PhD'; return { observations: [{ evidenceId: 'resume', quote: e.resume }], recommendation: 'continue' };
  } });
  service.attachResume(alice, id, { text: 'Bachelor degree' }, 'r');
  assert.equal((await service.submit(alice, id, { answer: 'identity' }, 'r')).state, 'abstained');
  assert.equal(service.assessments.get(id).evidence.resume, 'Bachelor degree');
});
test('SQLite restart preserves resume provenance and enforces content hash before evaluation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-resume-'));
  let store;
  try {
    store = new SQLiteAssessmentStore(path.join(dir, 'db.sqlite'));
    const first = setup({ assessmentStore: store, audit: store.audit });
    first.service.attachResume(first.alice, first.id, { text: 'Skills' }, 'r'); store.close();
    store = new SQLiteAssessmentStore(path.join(dir, 'db.sqlite'));
    const service = new ResearchService({ principals, provider: async () => { throw new Error('must not run'); }, assessmentStore: store, audit: store.audit });
    const alice = service.authenticate(service.login(principals[0].credential, 'r').token);
    assert.equal(service.view(alice, first.id).resume.provenance, 'candidate_supplied');
    const a = store.get(first.id); a.resume.text = 'Changed'; store.commit(a, a.version, store.audit, service.eventData('test', 'tamper_fixture', 'allow', alice));
    await assert.rejects(service.submit(alice, first.id, { answer: 'identity' }, 'r'), e => e.code === 'evidence_integrity_failure');
    assert.equal(store.get(first.id).state, 'awaiting_answer');
  } finally { store?.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
test('HTTP resume route rejects anonymous access and binds authenticated text to assessment', async () => {
  const { service, alice, id } = setup(); const server = createServer(service);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/assessments/${id}/resume`;
    const post = token => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ text: 'Skills' }) });
    assert.equal((await post()).status, 401);
    const token = service.login(principals[0].credential, 'r').token;
    const response = await post(token); assert.equal(response.status, 200); assert.equal((await response.json()).resume.sourceId, 'resume');
    assert.equal(service.view(alice, id).state, 'awaiting_answer');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
