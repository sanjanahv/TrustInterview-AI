'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ResearchService, POLICY_VERSION } = require('../core.cjs');
const { claimGrounding } = require('../claim-grounding.cjs');
const { createGeminiProvider, offlineProvider, ProviderFailure, FEEDBACK_PROMPT, GROUNDING_PROMPT, hash } = require('../model-provider.cjs');
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function shuffle(values, seed) {
  const result = [...values]; let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const j = Math.floor((state / 4294967296) * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); }
async function runExperiment({ cases, outDir, provider = offlineProvider(), repeats = 1, seed = 20261011, configuration = 'controlled-reference-v1' }) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 1000 || !Number.isInteger(repeats) || repeats < 1 || repeats > 10 || cases.length * repeats > 1000
    || !Number.isInteger(seed) || seed < 0 || seed > 4294967295 || typeof configuration !== 'string' || !configuration.trim()) throw new Error('invalid_experiment_configuration');
  const ids = new Set();
  for (const c of cases) {
    if (!c || typeof c.caseId !== 'string' || !/^case-[a-z0-9-]{1,64}$/.test(c.caseId) || ids.has(c.caseId)
      || !['grounding', 'paired_input'].includes(c.task) || typeof c.answer !== 'string' || !c.answer.trim() || c.answer.length > 5000
      || !(c.resume === null || typeof c.resume === 'string') || (typeof c.resume === 'string' && Buffer.byteLength(c.resume) > 8000)
      || typeof c.job !== 'string' || (c.task === 'grounding' && (typeof c.claim !== 'string' || !['candidate', 'model'].includes(c.claimOrigin)))) throw new Error('invalid_experiment_case');
    ids.add(c.caseId);
  }
  if (!['offline', 'gemini'].includes(provider.mode)) throw new Error('invalid_experiment_provider');
  // New directory only: never overwrite a previous run or an input file.
  fs.mkdirSync(outDir, { mode: 0o700 });
  const publicConfig = provider.publicConfig || { provider: 'offline', model: 'offline-explicit-use-v1', decoding: {}, timeoutMs: 2000 };
  const plan = [];
  for (let repetition = 0; repetition < repeats; repetition++) {
    for (const c of shuffle(cases, (seed + repetition) >>> 0)) plan.push({ caseId: c.caseId, runId: `repeat-${repetition + 1}` });
  }
  const manifest = { status: 'running', configuration, runKind: provider.mode === 'gemini' ? 'live' : 'offline',
    sourceCasesSha256: hash(canonical(cases)), seed, repeats, plannedRecords: plan.length, completedRecords: 0,
    liveModelCallsAttempted: 0, publicConfig, policyVersion: POLICY_VERSION, createdAt: new Date().toISOString(),
    note: 'No human labels or efficacy statistics. Raw artifacts are local; offline records are simulated protocol checks.' };
  write(path.join(outDir, 'run-manifest.json'), manifest);
  write(path.join(outDir, 'execution-plan.json'), plan);
  write(path.join(outDir, 'input-cases.json'), cases);
  fs.mkdirSync(path.join(outDir, 'raw'), { mode: 0o700 });
  const byId = new Map(cases.map(c => [c.caseId, c]));
  const grounding = [], paired = [];
  for (const item of plan) {
    const c = byId.get(item.caseId); const requestId = crypto.randomUUID();
    const started = performance.now(); let raw, result, decision, status, predictedLabel = null, score = null, receipt, diagnostic = null, policyReasons = [];
    if (c.task === 'grounding') {
      try {
        if (provider.mode === 'gemini') {
          manifest.liveModelCallsAttempted++;
          receipt = await provider.generate('grounding', { claim: c.claim, resume: c.resume });
          result = receipt.output; raw = receipt.rawResponse; predictedLabel = result.label; status = 'extracted';
        } else {
          result = claimGrounding(c.claim, c.resume);
          if (result.claims.length === 1) { predictedLabel = result.claims[0].label; status = 'extracted'; }
          else status = 'extraction_failed';
          raw = JSON.stringify({ runKind: 'offline', result });
        }
        decision = predictedLabel === 'source_supported' ? 'release' : predictedLabel === 'source_contradicted' ? 'review' : 'abstain';
        // Experiment routing only; classification labels never grant resource access.
      } catch (error) {
        diagnostic = error instanceof ProviderFailure ? error.code : 'provider_failure';
        status = 'provider_failed'; decision = 'abstain'; raw = JSON.stringify({ diagnostic });
      }
    } else {
      let providerCalled = false, providerSucceeded = false;
      const wrapped = async (evidence, options) => {
        providerCalled = true;
        if (provider.mode === 'gemini') {
          manifest.liveModelCallsAttempted++;
          receipt = await provider.generate('feedback', evidence, options);
          raw = receipt.rawResponse; providerSucceeded = true; return receipt.output;
        }
        const output = await provider(evidence, options);
        raw = JSON.stringify({ runKind: 'offline', output }); providerSucceeded = true; return output;
      };
      try {
        const credential = crypto.randomBytes(32).toString('base64url');
        const service = new ResearchService({ principals: [{ id: 'pilot-candidate', tenant: 'synthetic-pilot', role: 'candidate', credential }],
          provider: wrapped, providerVersion: provider.version, providerTimeout: provider.timeoutMs + 250 });
        const principal = service.authenticate(service.login(credential, requestId).token);
        const assessment = service.create(principal, {}, requestId);
        if (c.resume !== null) service.attachResume(principal, assessment.id, { text: c.resume }, requestId);
        result = await service.submit(principal, assessment.id, { answer: c.answer }, requestId);
        status = providerCalled && providerSucceeded ? 'completed' : 'failed';
        decision = { released: 'release', pending_review: 'review', abstained: 'abstain', rejected: 'deny' }[result.state] || 'deny';
        score = result.state === 'released' ? result.score.score : null;
        policyReasons = result.policy?.reasons || [];
        if (status === 'failed') diagnostic = 'provider_or_session_failure';
      } catch (error) { status = 'failed'; decision = 'abstain'; diagnostic = 'assessment_failure'; }
      if (!raw) raw = JSON.stringify({ diagnostic: diagnostic || 'provider_failure' });
    }
    const rawName = `raw/${item.runId}-${c.caseId}.json`;
    fs.writeFileSync(path.join(outDir, rawName), raw, { flag: 'wx', mode: 0o600 });
    const row = { caseId: c.caseId, runId: item.runId, configuration, provider: publicConfig.provider, model: publicConfig.model,
      promptHash: hash(provider.mode === 'gemini' ? (c.task === 'grounding' ? GROUNDING_PROMPT : FEEDBACK_PROMPT) : `offline-${c.task}-protocol-v1`),
      policyVersion: POLICY_VERSION, rubricVersion: 'keyword-v1', requestId, inputSha256: hash(canonical(c)),
      runKind: manifest.runKind, decoding: publicConfig.decoding, rawResponseRef: rawName, rawResponseSha256: hash(raw),
      recordedAt: new Date().toISOString(), elapsedMs: performance.now() - started, status, decision, diagnostic, policyReasons,
      returnedModelVersion: receipt?.modelVersion || null, usage: receipt?.usage || null,
      ...(c.task === 'grounding' ? { predictedLabel } : { score, questionScope: 'fixed ZTA question; job text not used to change rubric' }) };
    fs.appendFileSync(path.join(outDir, 'records.jsonl'), JSON.stringify(row) + '\n', { mode: 0o600 });
    (c.task === 'grounding' ? grounding : paired).push(row);
    manifest.completedRecords++;
    write(path.join(outDir, 'run-manifest.json'), manifest);
  }
  write(path.join(outDir, 'grounding-predictions.json'), grounding);
  write(path.join(outDir, 'paired-runs.json'), paired);
  manifest.status = 'completed'; manifest.finishedAt = new Date().toISOString();
  write(path.join(outDir, 'run-manifest.json'), manifest);
  return manifest;
}
if (require.main === module) {
  const args = process.argv.slice(2); const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--cases', '--out', '--mode', '--config', '--repeats', '--seed', '--configuration'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) throw new Error('invalid_runner_arguments');
    options[args[i]] = args[i + 1];
  }
  const mode = options['--mode'] || 'offline';
  if (!['offline', 'gemini'].includes(mode) || !options['--cases'] || !options['--out'] || (mode === 'gemini' && !options['--config']) || (mode === 'offline' && options['--config'])) throw new Error('invalid_runner_configuration');
  const provider = mode === 'gemini' ? createGeminiProvider(JSON.parse(fs.readFileSync(options['--config'], 'utf8'))) : offlineProvider();
  runExperiment({ cases: JSON.parse(fs.readFileSync(options['--cases'], 'utf8')), outDir: path.resolve(options['--out']), provider,
    repeats: options['--repeats'] ? Number(options['--repeats']) : 1, seed: options['--seed'] ? Number(options['--seed']) : 20261011,
    configuration: options['--configuration'] || 'controlled-reference-v1' }).then(result => console.log(JSON.stringify({ status: result.status, records: result.completedRecords, liveModelCallsAttempted: result.liveModelCallsAttempted }))).catch(() => { console.error('Experiment failed; retained run directory is incomplete.'); process.exitCode = 1; });
}
module.exports = { runExperiment, canonical, shuffle };
