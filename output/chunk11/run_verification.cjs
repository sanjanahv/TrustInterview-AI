'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const sourceRoot = path.join(root, 'TrustInterview-AI/backend/research');
const tests = ['controls.test.cjs', 'persistence.test.cjs', 'http-persistence.test.cjs'].map(file => path.join(sourceRoot, 'test', file));
const result = spawnSync(process.execPath, ['--test', '--test-reporter=junit', ...tests], { encoding: 'utf8', timeout: 30000 });
fs.writeFileSync(path.join(__dirname, 'backend-verification.xml'), result.stdout);
fs.writeFileSync(path.join(__dirname, 'backend-runtime.txt'), result.stderr);
const files = ['core.cjs', 'assessment-store.cjs', 'server.cjs', 'package.json', 'README.md',
  'test/controls.test.cjs', 'test/persistence.test.cjs', 'test/http-persistence.test.cjs', 'test/fixtures/crash.cjs'];
const sources = Object.fromEntries(files.map(file => {
  const bytes = fs.readFileSync(path.join(sourceRoot, file));
  const target = path.join(__dirname, 'source-snapshot', file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  return [file, crypto.createHash('sha256').update(bytes).digest('hex')];
}));
const summary = { recordedAt: new Date().toISOString(), node: process.version, exitCode: result.status,
  tests: Number(result.stdout.match(/<!-- tests (\d+) -->/)?.[1] || 0),
  passed: Number(result.stdout.match(/<!-- pass (\d+) -->/)?.[1] || 0),
  failed: Number(result.stdout.match(/<!-- fail (\d+) -->/)?.[1] || 0),
  sources, limitations: ['Offline provider and keyword rubric.', 'No verified external identity.',
    'Single-process database; no distributed scaling.', 'No storage encryption or independent audit anchoring.', 'No real candidate study.'] };
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ tests: summary.tests, passed: summary.passed, failed: summary.failed, exitCode: summary.exitCode }));
if (result.status !== 0 || summary.tests !== 27 || summary.passed !== 27) process.exitCode = 1;
