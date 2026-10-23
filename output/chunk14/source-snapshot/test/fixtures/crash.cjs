'use strict';
const { SQLiteAssessmentStore } = require('../../assessment-store.cjs');
const { ResearchService } = require('../../core.cjs');
const store = new SQLiteAssessmentStore(process.argv[2]);
const service = new ResearchService({ principals: [{ id: 'candidate', tenant: 'A', role: 'candidate', credential: 'a'.repeat(32) }],
  provider: () => new Promise(() => {}), assessmentStore: store, audit: store.audit });
const { token } = service.login('a'.repeat(32), 'login');
const user = service.authenticate(token);
const { id } = service.create(user, {}, 'create');
service.submit(user, id, { answer: 'identity authorization resource' }, 'submit');
// Leave a hot rollback journal and an uncommitted fake release before abrupt exit.
store.db.exec('BEGIN IMMEDIATE');
store.db.prepare("UPDATE assessments SET state='released' WHERE id=?").run(id);
process.stdout.write(JSON.stringify({ id }));
process.exit(17);
