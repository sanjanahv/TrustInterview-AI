'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { claimGrounding } = require('../../TrustInterview-AI/backend/research/claim-grounding.cjs');
const cases = [
  ['agreement', 'I have used Python.', 'I have used Python.', 'source_supported'],
  ['negation', 'I have used Python.', 'I have not used Python.', 'source_contradicted'],
  ['negative_agreement', 'I have not used Python.', 'I have not used Python.', 'source_supported'],
  ['missing', 'I have used Python.', null, 'undetermined'],
  ['keyword_only', 'I have used Python.', 'Skills: Python', 'undetermined'],
  ['conflicting', 'I have used Python.', 'I have used Python.\nI have not used Python.', 'undetermined'],
  ['alias', 'I have used JS.', 'I have used JavaScript.', 'source_supported'],
  ['punctuation', 'I have used C++.', 'I have used cpp.', 'source_supported'],
  ['substring', 'I have used Java.', 'I have used JavaScript.', 'undetermined'],
  ['condition', 'I have used Python.', 'If I have used Python.', 'undetermined'],
  ['duration', 'I have used Python for ten years.', 'I have used Python for ten years.', 'undetermined'],
  ['unsupported_technology', 'I have used Rust.', 'I have used Rust.', 'undetermined']
];
const records = cases.map(([id, answer, resume, expected]) => {
  const result = claimGrounding(answer, resume);
  return { id, answer, resume, expected, result, matchesSpecification: result.claims[0]?.label === expected };
});
fs.writeFileSync(path.join(__dirname, 'authored-claim-cases.json'), JSON.stringify({
  purpose: 'Authored behavior examples, not independent annotations or an accuracy estimate', records
}, null, 2) + '\n');
if (records.some(x => !x.matchesSpecification)) throw new Error('example_contract_mismatch');
console.log('Recorded 12 authored examples; all match their specified labels. No accuracy inference.');
