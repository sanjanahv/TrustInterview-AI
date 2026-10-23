'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runExperiment, canonical, shuffle } = require('../evaluation/run-experiment.cjs');
const { offlineProvider, hash, ProviderFailure } = require('../model-provider.cjs');
const cases = [
  { caseId: 'case-g1', datasetVersion: 'unit', task: 'grounding', job: 'Junior', resume: null, answer: 'I have used Python.', claim: 'I have used Python.', claimOrigin: 'candidate' },
  { caseId: 'case-p1', datasetVersion: 'unit', task: 'paired_input', job: 'Junior', resume: 'Pronouns: she/her.\nSkills: SQL', answer: 'identity authorization resource', claim: null, claimOrigin: null }
];
async function temporary(work) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-runner-'));
  try { await work(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('offline runner retains one record per planned case, raw hashes, missing source and explicit offline mode', async () => temporary(async dir => {
  const out = path.join(dir, 'out'); const manifest = await runExperiment({ cases, outDir: out, repeats: 2 });
  assert.equal(manifest.liveModelCallsAttempted, 0); assert.equal(manifest.completedRecords, 4); assert.equal(manifest.status, 'completed');
  const rows = fs.readFileSync(path.join(out, 'records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  for (const row of rows) {
    assert.equal(row.runKind, 'offline'); assert.equal(hash(fs.readFileSync(path.join(out, row.rawResponseRef), 'utf8')), row.rawResponseSha256);
    assert.equal(row.inputSha256, hash(canonical(cases.find(c => c.caseId === row.caseId))));
  }
  assert.equal(rows.find(row => row.caseId === 'case-g1').predictedLabel, 'undetermined');
  assert.equal(rows.find(row => row.caseId === 'case-p1').score, 100);
  await assert.rejects(runExperiment({ cases, outDir: out }), e => e.code === 'EEXIST');
}));
test('provider failures remain in runner records with withheld scores and diagnostic artifacts', async () => temporary(async dir => {
  const provider = offlineProvider(); provider.mode = 'gemini'; provider.publicConfig = { provider: 'gemini', model: 'gemini-unit-fixture', decoding: {}, timeoutMs: 100 };
  provider.generate = async () => { throw new ProviderFailure('provider_http_failure'); };
  const manifest = await runExperiment({ cases, outDir: path.join(dir, 'out'), provider });
  assert.equal(manifest.liveModelCallsAttempted, 2); // fixture invokes no network, only exercises live-mode bookkeeping.
  const g = JSON.parse(fs.readFileSync(path.join(dir, 'out/grounding-predictions.json')))[0];
  const p = JSON.parse(fs.readFileSync(path.join(dir, 'out/paired-runs.json')))[0];
  assert.equal(g.status, 'provider_failed'); assert.equal(g.predictedLabel, null); assert.equal(g.decision, 'abstain');
  assert.equal(p.status, 'failed'); assert.equal(p.score, null); assert.equal(p.decision, 'abstain');
}));
test('runner rejects duplicate cases and invalid budgets; shuffled plan is deterministic', async () => temporary(async dir => {
  for (const options of [{ cases: [cases[0], cases[0]] }, { cases, repeats: 11 }, { cases, seed: NaN }])
    await assert.rejects(runExperiment({ ...options, outDir: path.join(dir, 'out') }));
  assert.equal(fs.existsSync(path.join(dir, 'out')), false);
  assert.deepEqual(shuffle([1, 2, 3, 4], 42), shuffle([1, 2, 3, 4], 42));
}));
