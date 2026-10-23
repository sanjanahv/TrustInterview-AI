'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'TrustInterview-AI/backend/research');
const tests = ['controls.test.cjs', 'persistence.test.cjs', 'http-persistence.test.cjs', 'google-identity.test.cjs'];
const result = spawnSync(process.execPath, ['--test', '--test-reporter=junit', ...tests.map(file => path.join(source, 'test', file))],
  { encoding: 'utf8', timeout: 60000 });
fs.writeFileSync(path.join(__dirname, 'backend-verification.xml'), result.stdout);
fs.writeFileSync(path.join(__dirname, 'backend-runtime.txt'), result.stderr);
const files = ['core.cjs', 'server.cjs', 'assessment-store.cjs', 'google-identity.cjs', 'package.json', 'package-lock.json',
  'google-config.example.json', 'README.md', ...tests.map(file => 'test/' + file), 'test/fixtures/crash.cjs'];
const sources = Object.fromEntries(files.map(file => {
  const bytes = fs.readFileSync(path.join(source, file)); const target = path.join(__dirname, 'source-snapshot', file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  return [file, crypto.createHash('sha256').update(bytes).digest('hex')];
}));
const frontendSources = Object.fromEntries(['App.js', 'App.test.js', 'pages/ResearchInterview.js', 'pages/ResearchInterview.css'].map(file => {
  const bytes = fs.readFileSync(path.join(root, 'TrustInterview-AI/frontend/src', file));
  const target = path.join(__dirname, 'frontend-source-snapshot', file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  return [file, crypto.createHash('sha256').update(bytes).digest('hex')];
}));
const summary = { recordedAt: new Date().toISOString(), node: process.version,
  googleAuthLibrary: JSON.parse(fs.readFileSync(path.join(source, 'node_modules/google-auth-library/package.json'), 'utf8')).version,
  exitCode: result.status, tests: Number(result.stdout.match(/<!-- tests (\d+) -->/)?.[1] || 0),
  passed: Number(result.stdout.match(/<!-- pass (\d+) -->/)?.[1] || 0), failed: Number(result.stdout.match(/<!-- fail (\d+) -->/)?.[1] || 0),
  liveGoogleLogins: 0, liveModelCalls: 0, providerTestMethod: 'Local RSA assertions verified by installed SDK; code exchange and key retrieval fixtures',
  sources, frontendSources };
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ tests: summary.tests, passed: summary.passed, failed: summary.failed, exitCode: summary.exitCode, liveGoogleLogins: 0 }));
if (result.status !== 0 || summary.tests !== 42 || summary.passed !== 42) process.exitCode = 1;
