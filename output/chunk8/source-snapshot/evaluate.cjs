'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { ResearchService, outputPolicy, scoreAnswer, POLICY_VERSION } = require('./core.cjs');
const fixtures = require('./fixtures/output-contract.json');
const out = path.resolve(__dirname, '../../..', 'output/chunk8');
fs.mkdirSync(out, { recursive: true });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const provider = async e => ({ observations: [{ evidenceId: 'answer', quote: e.answer }], recommendation: 'practice' });
const service = new ResearchService({ principals: [{ id: 'fixture-candidate', tenant: 'fixture-tenant', role: 'candidate', credential: 'f'.repeat(32) }], provider });
const { token } = service.login('f'.repeat(32), 'setup');
const principal = service.authenticate(token);
const { id } = service.create(principal, {}, 'setup');
const answer = 'identity authorization resource';
const evidence = { answer, question: service.rubric.question };
const output = { observations: [{ evidenceId: 'answer', quote: answer }], recommendation: 'practice' };
const modes = {
  C0: () => scoreAnswer(answer, service.rubric),
  C1: () => { service.authorize(service.authenticate(token), id, 'candidate'); return scoreAnswer(answer, service.rubric); },
  C2: () => { outputPolicy(output, evidence); return scoreAnswer(answer, service.rubric); },
  C3: () => { service.authorize(service.authenticate(token), id, 'candidate'); const decision = outputPolicy(output, evidence);
    const score = scoreAnswer(answer, service.rubric); service.event('benchmark', 'evaluate', decision.decision, principal); return score; }
};
// Seeded order avoids always timing the same mode first. This is a microbenchmark, not a deployment load test.
let seed = 20261010;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
const records = [];
for (let round = -50; round < 1000; round++) {
  const order = Object.keys(modes);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const mode of order) {
    const start = performance.now(); modes[mode](); const durationMs = performance.now() - start;
    if (round >= 0) records.push({ round, mode, durationMs });
  }
}
const quantile = (sorted, p) => sorted[Math.ceil(p * sorted.length) - 1];
const timings = Object.fromEntries(Object.keys(modes).map(mode => {
  const values = records.filter(r => r.mode === mode).map(r => r.durationMs).sort((a, b) => a - b);
  return [mode, { n: values.length, p50Ms: quantile(values, .5), p95Ms: quantile(values, .95), p99Ms: quantile(values, .99) }];
}));
const contractRecords = fixtures.map(f => {
  const modelOutput = { observations: [{ evidenceId: f.evidenceId, quote: f.quote }], recommendation: 'practice' };
  const decision = outputPolicy(modelOutput, { answer: f.answer });
  return { ...f, modelOutput, actual: decision.decision, reasons: decision.reasons, matchesSpecification: decision.decision === f.expected };
});
const pairs = ['Alice', 'Bob', 'Priya', 'Ahmed'].flatMap(name => ['woman', 'man'].map(gender => ({ name, gender,
  answer: `${name} is a ${gender}. identity authorization resource` })));
const counterfactualRecords = pairs.map(p => ({ ...p, score: scoreAnswer(p.answer, service.rubric).score,
  decision: outputPolicy({ observations: [{ evidenceId: 'answer', quote: p.answer }], recommendation: 'practice' }, { answer: p.answer }).decision }));
const sourceFiles = ['core.cjs', 'server.cjs', 'evaluate.cjs', 'test/controls.test.cjs', 'fixtures/output-contract.json', 'package.json'];
const manifest = Object.fromEntries(sourceFiles.map(file => [file, sha(fs.readFileSync(path.join(__dirname, file)))]));
let baseCommit = 'unavailable';
try {
  const gitDir = path.resolve(__dirname, '../../.git');
  const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
  if (!head.startsWith('ref: ')) baseCommit = head;
  else {
    const ref = head.slice(5);
    const refFile = path.join(gitDir, ref);
    if (fs.existsSync(refFile)) baseCommit = fs.readFileSync(refFile, 'utf8').trim();
    else baseCommit = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8').split('\n')
      .find(line => line.endsWith(' ' + ref))?.split(' ')[0] || 'unavailable';
  }
} catch { /* Hash manifest still identifies sources. */ }
const report = {
  createdAt: new Date().toISOString(), policy: POLICY_VERSION, baseCommit, sourceManifest: manifest,
  environment: { node: process.version, platform: process.platform, release: os.release(), architecture: os.arch(), cpu: os.cpus()[0]?.model },
  design: { provider: 'offline fixture', humanAnnotations: false, liveModelCalls: 0, warmupRounds: 50, measuredRounds: 1000,
    seed: 20261010, concurrency: 1, audit: 'in-memory hash chain', timingScope: 'synchronous control components; excludes HTTP, disk writes, model calls and review' },
  contractFixtures: { count: contractRecords.length, specificationMatches: contractRecords.filter(r => r.matchesSpecification).length,
    note: 'Expected outcomes are policy specifications, not human-annotated fairness or hallucination ground truth.' },
  deterministicCounterfactualSmoke: { count: pairs.length, distinctScores: [...new Set(counterfactualRecords.map(r => r.score))],
    note: 'Only the fixed keyword scorer was tested; this is not evidence of demographic fairness.' },
  timings,
  limitations: ['No live LLM or semantic grounding evaluation.', 'No human-labelled discrimination corpus.',
    'Quoted falsehoods and indirect prompt attacks can pass.', 'Legacy API and UI remain outside this reference service.',
    'No distributed or persistent assessment store; no production load claim.']
};
fs.writeFileSync(path.join(out, 'evaluation-summary.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'output-contract-records.json'), JSON.stringify(contractRecords, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'counterfactual-smoke-records.json'), JSON.stringify(counterfactualRecords, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'latency-records.jsonl'), records.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify(report, null, 2));
if (contractRecords.some(r => !r.matchesSpecification)) process.exitCode = 1;
