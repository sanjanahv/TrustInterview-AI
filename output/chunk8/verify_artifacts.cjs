'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'evaluation-summary.json'), 'utf8'));
for (const [file, expected] of Object.entries(report.sourceManifest)) {
  const frozen = path.join(__dirname, 'source-snapshot', file);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(fs.existsSync(frozen) ? frozen : path.join(root, 'TrustInterview-AI/backend/research', file))).digest('hex');
  assert.equal(actual, expected, `Source manifest mismatch: ${file}`);
}
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'output-contract-records.json'), 'utf8'));
assert.equal(fixtures.length, report.contractFixtures.count);
assert.equal(fixtures.filter(f => f.actual === f.expected).length, report.contractFixtures.specificationMatches);
const records = fs.readFileSync(path.join(__dirname, 'latency-records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(records.length, 4000);
const tex = fs.readFileSync(path.join(root, 'paper/TrustInterview_IEEE_working.tex'), 'utf8');
for (const [mode, summary] of Object.entries(report.timings)) {
  const sorted = records.filter(r => r.mode === mode).map(r => r.durationMs).sort((a, b) => a - b);
  assert.equal(sorted.length, summary.n);
  for (const [metric, p] of [['p50Ms', .5], ['p95Ms', .95], ['p99Ms', .99]])
    assert.equal(sorted[Math.ceil(p * sorted.length) - 1], summary[metric]);
  const row = `${mode} & ${summary.p50Ms.toFixed(4)} & ${summary.p95Ms.toFixed(4)} & ${summary.p99Ms.toFixed(4)}`;
  assert.ok(tex.includes(row), `LaTeX timing mismatch: ${mode}`);
}
const xml = fs.readFileSync(path.join(__dirname, 'control-tests.xml'), 'utf8');
assert.equal((xml.match(/<testcase /g) || []).length, 17);
assert.ok(xml.includes('<!-- pass 17 -->') && xml.includes('<!-- fail 0 -->'));
console.log('Verified: source hashes, 17-test report, 14 fixture records, 4000 timings, and LaTeX timing values.');
