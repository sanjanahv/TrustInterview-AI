'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const report = require('./evaluation-summary.json');
for (const [file, hash] of Object.entries(report.sourceManifest)) {
  const target = path.join(__dirname, 'source-snapshot', file);
  const original = path.resolve(__dirname, '../../TrustInterview-AI/backend/research', file);
  const bytes = fs.readFileSync(fs.existsSync(target) ? target : original);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('Snapshot mismatch: ' + file);
  if (!fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
}
console.log('Chunk 8 source snapshot preserved and verified.');
