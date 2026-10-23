'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cwd = path.resolve(__dirname, '../../TrustInterview-AI/frontend');
for (const [name, args] of [['frontend-tests.txt', ['node_modules/react-scripts/bin/react-scripts.js', 'test', '--watchAll=false', '--runInBand']],
  ['frontend-build.txt', ['node_modules/react-scripts/bin/react-scripts.js', 'build']]]) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000, env: { ...process.env, CI: 'true' } });
  fs.writeFileSync(path.join(__dirname, name), result.stdout + result.stderr);
  console.log(name + ': exit ' + result.status);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
