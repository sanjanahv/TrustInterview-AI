'use strict';
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

class TransitionConflict extends Error {
  constructor() { super('assessment_transition_conflict'); this.status = 409; this.code = 'invalid_state'; }
}

class MemoryAssessmentStore {
  constructor() { this.records = new Map(); }
  get(id) { const value = this.records.get(id); return value ? structuredClone(value) : undefined; }
  create(value, audit, event) {
    if (this.records.has(value.id)) throw new TransitionConflict();
    const next = { ...structuredClone(value), version: 1 };
    audit.append(event);
    this.records.set(value.id, next);
    return structuredClone(next);
  }
  commit(value, version, audit, event) {
    const previous = this.records.get(value.id);
    if (!previous || previous.version !== version || previous.tenant !== value.tenant || previous.owner !== value.owner)
      throw new TransitionConflict();
    const next = { ...structuredClone(value), version: version + 1 };
    audit.append(event);
    this.records.set(value.id, next);
    return structuredClone(next);
  }
  recoverInterrupted() { return 0; }
}

class SQLiteAssessmentStore {
  constructor(file) {
    const { DatabaseSync } = require('node:sqlite');
    this.db = new DatabaseSync(file, { timeout: 250, allowExtension: false });
    try {
      // This reference service owns the DB for its lifetime. OS locks are released on crash.
      this.db.exec('PRAGMA locking_mode=EXCLUSIVE; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;');
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version !== 0 && version !== 1) throw new Error('unsupported_database_schema');
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS assessments (
          id TEXT PRIMARY KEY, tenant TEXT NOT NULL, owner TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('awaiting_answer','evaluating','released','pending_review','abstained','rejected')),
          version INTEGER NOT NULL CHECK(version > 0), document TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS audit_events (
          sequence INTEGER PRIMARY KEY, document TEXT NOT NULL
        ) STRICT;
        PRAGMA user_version=1;
        COMMIT;`);
      this.verifyAudit();
    } catch (error) { this.db.close(); throw error; }
    const store = this;
    this.audit = { append: data => store.appendAudit(data), get events() { return store.events(); } };
  }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  events() { return this.db.prepare('SELECT document FROM audit_events ORDER BY sequence').all().map(row => JSON.parse(row.document)); }
  verifyAudit() {
    let previous = '0';
    const rows = this.db.prepare('SELECT sequence, document FROM audit_events ORDER BY sequence').all();
    for (let i = 0; i < rows.length; i++) {
      const event = JSON.parse(rows[i].document); const { hash: actual, ...body } = event;
      if (rows[i].sequence !== i + 1 || body.sequence !== i + 1 || body.previousHash !== previous
          || hash(JSON.stringify(body)) !== actual) throw new Error('audit_integrity_failure');
      previous = actual;
    }
  }
  appendAudit(data) {
    const append = () => {
      const last = this.db.prepare('SELECT sequence, document FROM audit_events ORDER BY sequence DESC LIMIT 1').get();
      const previousHash = last ? JSON.parse(last.document).hash : '0';
      const event = { sequence: (last?.sequence || 0) + 1, previousHash, ...data };
      event.hash = hash(JSON.stringify(event));
      this.db.prepare('INSERT INTO audit_events(sequence, document) VALUES (?, ?)').run(event.sequence, JSON.stringify(event));
      return event;
    };
    return this.db.isTransaction ? append() : this.transaction(append);
  }
  get(id) {
    const row = this.db.prepare('SELECT * FROM assessments WHERE id=?').get(id);
    if (!row) return undefined;
    const value = JSON.parse(row.document);
    if (value.id !== row.id || value.tenant !== row.tenant || value.owner !== row.owner
        || value.state !== row.state || value.version !== row.version) throw new Error('assessment_integrity_failure');
    return value;
  }
  requireAudit(audit) { if (audit !== this.audit) throw new Error('transactional_audit_required'); }
  create(value, audit, event) {
    this.requireAudit(audit);
    const next = { ...structuredClone(value), version: 1 };
    return this.transaction(() => {
      this.db.prepare('INSERT INTO assessments(id, tenant, owner, state, version, document) VALUES (?, ?, ?, ?, ?, ?)')
        .run(next.id, next.tenant, next.owner, next.state, next.version, JSON.stringify(next));
      audit.append(event);
      return next;
    });
  }
  commit(value, version, audit, event) {
    this.requireAudit(audit);
    const next = { ...structuredClone(value), version: version + 1 };
    return this.transaction(() => {
      const result = this.db.prepare('UPDATE assessments SET state=?, version=?, document=? WHERE id=? AND tenant=? AND owner=? AND version=?')
        .run(next.state, next.version, JSON.stringify(next), next.id, next.tenant, next.owner, version);
      if (result.changes !== 1) throw new TransitionConflict();
      audit.append(event);
      return next;
    });
  }
  recoverInterrupted(baseEvent) {
    const rows = this.db.prepare("SELECT id FROM assessments WHERE state='evaluating'").all();
    return this.transaction(() => {
      for (const { id } of rows) {
        const value = this.get(id);
        value.state = 'abstained';
        value.policy = { decision: 'abstain', reasons: ['interrupted_evaluation'], policy: baseEvent.policy };
        delete value.output; delete value.score;
        this.db.prepare('UPDATE assessments SET state=?, version=?, document=? WHERE id=?').run(
          value.state, value.version + 1, JSON.stringify({ ...value, version: value.version + 1 }), id);
        this.audit.append({ ...baseEvent, assessmentId: id, reasons: ['interrupted_evaluation'] });
      }
      return rows.length;
    });
  }
  close() { this.db.close(); }
}
module.exports = { MemoryAssessmentStore, SQLiteAssessmentStore, TransitionConflict };
