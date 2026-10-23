'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { ResearchService, Audit } = require('../core.cjs');
const { SQLiteAssessmentStore, TransitionConflict } = require('../assessment-store.cjs');
const principals = [
  { id: 'candidate', tenant: 'A', role: 'candidate', credential: 'a'.repeat(32) },
  { id: 'other', tenant: 'A', role: 'candidate', credential: 'b'.repeat(32) },
  { id: 'reviewer', tenant: 'A', role: 'reviewer', credential: 'r'.repeat(32) },
  { id: 'reviewer', tenant: 'B', role: 'reviewer', credential: 's'.repeat(32) }
];
const provider = async e => ({ observations: [{ evidenceId: 'answer', quote: e.answer }], recommendation: 'practice' });
function temporary(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'trustinterview-persistence-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  return path.join(folder, 'assessments.sqlite');
}
function open(file) {
  const store = new SQLiteAssessmentStore(file);
  const service = new ResearchService({ principals, provider, assessmentStore: store, audit: store.audit });
  const login = index => { const { token } = service.login(principals[index].credential, 'login', String(index)); return { token, user: service.authenticate(token) }; };
  return { store, service, login };
}

test('pending evidence and approved review survive reopen while sessions do not', async t => {
  const file = temporary(t); let app = open(file);
  const first = app.login(0); const { id } = app.service.create(first.user, {}, 'c');
  await app.service.submit(first.user, id, { answer: 'gender identity' }, 's'); app.store.close();
  app = open(file);
  assert.throws(() => app.service.authenticate(first.token), e => e.code === 'invalid_session');
  const candidate = app.login(0).user; const reviewer = app.login(2).user;
  assert.equal(app.service.view(candidate, id).state, 'pending_review');
  assert.equal(app.service.reviewItem(reviewer, id).evidence.answer, 'gender identity');
  app.service.review(reviewer, id, { decision: 'approve', reason: 'Reviewed the source quotation in context.' }, 'review');
  const count = app.store.audit.events.length; app.store.close(); app = open(file);
  try {
    const result = app.service.view(app.login(0).user, id);
    assert.equal(result.state, 'released'); assert.equal(result.score.score, 33);
    assert.equal(app.store.get(id).review.reason, 'Reviewed the source quotation in context.');
    assert.equal(app.store.audit.events.filter(e => e.action === 'review').length, 1);
    assert.ok(app.store.audit.events.length >= count); assert.equal(Audit.verify(app.store.audit.events), true);
  } finally { app.store.close(); }
});

test('create and its audit event roll back together on audit failure', t => {
  const app = open(temporary(t));
  try {
    const user = app.login(0).user; const before = app.store.audit.events.length;
    app.store.audit.append = () => { throw new Error('audit write fault'); };
    assert.throws(() => app.service.create(user, {}, 'c'), /audit write fault/);
    assert.equal(app.store.db.prepare('SELECT COUNT(*) AS count FROM assessments').get().count, 0);
    assert.equal(app.store.audit.events.length, before);
  } finally { app.store.close(); }
});

test('failed review cannot durably release a score or record a partial decision', async t => {
  const app = open(temporary(t));
  try {
    const user = app.login(0).user; const reviewer = app.login(2).user;
    const { id } = app.service.create(user, {}, 'c'); await app.service.submit(user, id, { answer: 'gender identity' }, 's');
    const before = app.store.get(id).version; const append = app.store.audit.append;
    app.store.audit.append = () => { throw new Error('audit write fault'); };
    assert.throws(() => app.service.review(reviewer, id, { decision: 'approve', reason: 'A reviewed release reason.' }, 'r'), /audit write fault/);
    assert.equal(app.service.view(user, id).state, 'pending_review'); assert.equal(app.service.view(user, id).score, undefined);
    assert.equal(app.store.get(id).version, before); assert.equal(app.store.get(id).review, undefined);
    app.store.audit.append = append;
    app.service.review(reviewer, id, { decision: 'approve', reason: 'A reviewed release reason.' }, 'r');
    assert.equal(app.store.get(id).version, before + 1);
  } finally { app.store.close(); }
});

test('stale versions cannot overwrite a committed assessment or append an audit event', t => {
  const app = open(temporary(t));
  try {
    const user = app.login(0).user; const { id } = app.service.create(user, {}, 'c');
    const first = app.store.get(id); const stale = app.store.get(id);
    first.state = 'evaluating'; app.store.commit(first, first.version, app.store.audit, app.service.eventData('one', 'submit_begin', 'allow', user));
    const count = app.store.audit.events.length; stale.state = 'released';
    assert.throws(() => app.store.commit(stale, stale.version, app.store.audit, app.service.eventData('two', 'submit', 'allow', user)), TransitionConflict);
    assert.equal(app.store.get(id).state, 'evaluating'); assert.equal(app.store.audit.events.length, count);
  } finally { app.store.close(); }
});

test('exclusive ownership prevents a second instance from recovering active work', t => {
  const file = temporary(t); const app = open(file);
  try { assert.throws(() => new SQLiteAssessmentStore(file), /locked/); }
  finally { app.store.close(); }
  const next = open(file); next.store.close();
});

test('abrupt process exit rolls back a fake release and abstains interrupted evaluation', t => {
  const file = temporary(t);
  const child = spawnSync(process.execPath, [path.join(__dirname, 'fixtures/crash.cjs'), file], { encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 17, child.stderr);
  const { id } = JSON.parse(child.stdout); const app = open(file);
  try {
    const result = app.service.view(app.login(0).user, id);
    assert.equal(result.state, 'abstained'); assert.equal(result.score, undefined);
    assert.deepEqual(result.policy.reasons, ['interrupted_evaluation']);
    assert.equal(app.store.audit.events.filter(e => e.action === 'recovery').length, 1);
    assert.equal(app.store.audit.events.filter(e => e.action === 'submit' && e.decision === 'allow').length, 0);
    assert.equal(Audit.verify(app.store.audit.events), true);
  } finally { app.store.close(); }
});

test('persisted owner and tenant bindings still deny unrelated identities', async t => {
  const file = temporary(t); let app = open(file);
  const { id } = app.service.create(app.login(0).user, {}, 'c'); app.store.close(); app = open(file);
  try {
    assert.throws(() => app.service.view(app.login(1).user, id), e => e.code === 'resource_not_found');
    assert.throws(() => app.service.reviewItem(app.login(3).user, id), e => e.code === 'resource_not_found');
    assert.equal(app.service.view(app.login(0).user, id).state, 'awaiting_answer');
  } finally { app.store.close(); }
});

test('retained audit corruption fails closed at reopen', t => {
  const file = temporary(t); const app = open(file); app.login(0);
  app.store.db.prepare('UPDATE audit_events SET document=? WHERE sequence=1').run('{}'); app.store.close();
  assert.throws(() => open(file), /audit_integrity_failure/);
});
