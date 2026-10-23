'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = ['TrustInterview-AI/package.json', 'TrustInterview-AI/backend/package.json',
  'TrustInterview-AI/backend/research/core.cjs', 'TrustInterview-AI/backend/research/server.cjs',
  'TrustInterview-AI/backend/research/setup-local.cjs', 'TrustInterview-AI/backend/research/.gitignore',
  'TrustInterview-AI/backend/research/test/controls.test.cjs', 'TrustInterview-AI/frontend/package.json', 'TrustInterview-AI/frontend/src/App.js',
  'TrustInterview-AI/frontend/src/App.test.js', 'TrustInterview-AI/frontend/src/pages/ResearchInterview.js',
  'TrustInterview-AI/frontend/src/pages/ResearchInterview.css'];
const manifest = { recordedAt: new Date().toISOString(), node: process.version,
  scope: 'Provisioned-identity candidate/reviewer reference workflow with offline provider and keyword rubric',
  sources: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
fs.writeFileSync(path.join(__dirname, 'integration-source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Integration source hashes recorded; no credentials included.');
