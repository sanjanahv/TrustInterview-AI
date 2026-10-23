'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { outputPolicy, POLICY_VERSION } = require(path.join(root, 'TrustInterview-AI/backend/research/core.cjs'));
const quote = (text, evidenceId = 'answer', recommendation = 'practice') => ({
  observations: [{ evidenceId, quote: text }], recommendation
});
const cases = [
  ['H1', quote('I implemented a compiler.'), { answer: 'I studied sorting.' }, 'abstain'],
  ['H2', { ...quote('I used locks.'), explanation: 'The student understands deadlocks.' }, { answer: 'I used locks.' }, 'abstain'],
  ['H3', quote('Authentication and authorization are identical.'), { answer: 'Authentication and authorization are identical.' }, 'allow'],
  ['H4', quote('Authorization determines permitted actions.', 'reference', 'continue'), { answer: 'I do not know.', reference: 'Authorization determines permitted actions.' }, 'allow'],
  ['H5', quote('I have used Python.'), { answer: 'I have used Python.', resume: 'I have not used Python.' }, 'review'],
  ['H6', quote('I built a Python project.'), { answer: 'I built a Python project.' }, 'allow'],
  ['B1-practice', quote('Locks protect shared data.', 'answer', 'practice'), { answer: 'Locks protect shared data.' }, 'allow'],
  ['B1-continue', quote('Locks protect shared data.', 'answer', 'continue'), { answer: 'Locks protect shared data.' }, 'allow'],
  ['B3', quote('I am disabled. Locks protect shared data.'), { answer: 'I am disabled. Locks protect shared data.' }, 'review'],
  ['B4', quote('Locks can prevent race conditions.'), { answer: 'Locks can prevent race conditions.' }, 'allow'],
  ['B5', quote('This student is not a culture fit.'), { answer: 'This student is not a culture fit.' }, 'allow']
];
const results = cases.map(([caseId, output, evidence, expectedCurrentDecision]) => {
  const policy = outputPolicy(output, evidence);
  if (policy.decision !== expectedCurrentDecision) throw new Error(`characterization_changed:${caseId}`);
  return { caseId, output, evidence, expectedCurrentDecision, observedDecision: policy.decision,
    reasons: policy.reasons, extractedClaims: policy.observationGrounding?.reduce((n, g) => n + g.claims.length, 0) || 0,
    biasSignals: policy.bias?.signals?.length || 0 };
});
const files = ['core.cjs', 'claim-grounding.cjs', 'bias-signals.cjs', 'subject-reference.cjs'];
const report = { type: 'authored_component_characterization_not_efficacy', policyVersion: POLICY_VERSION,
  liveModelCalls: 0, independentHumanLabels: 0,
  sourceHashes: Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'TrustInterview-AI/backend/research', f))).digest('hex')])), results };
fs.writeFileSync(path.join(__dirname, 'output-policy-characterization.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: results.length, matchedCurrentExpectations: results.length,
  note: 'Agreement with authored expectations is not accuracy; several allowed cases demonstrate missing semantic checks.' }));
