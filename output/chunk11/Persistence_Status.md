# Chunk 11: transactional assessment persistence

The default controlled API now uses SQLite for assessments and audit events. The local database is `TrustInterview-AI/backend/research/local/assessments.sqlite`, inside the ignored local directory. `RESEARCH_DATABASE_FILE` selects another private path. No real candidate data or old JSONL logs were migrated.

Assessment creation, evaluation-state changes and review decisions commit together with their audit event. Updates check the stored record version. A failed audit append rolls back the associated transition, so an approved score cannot become durable without that decision record. Answer evidence and review reasons are retained in the assessment document; audit-event payloads omit their raw contents.

Pending assessments and approved review decisions survive database reopen. Sessions and cache entries remain in memory; users must sign in again after a restart. On recovery, an interrupted `evaluating` assessment becomes `abstained` and gains a recovery event. The service does not automatically retry it or publish a score. The store holds exclusive database ownership, so a second instance cannot recover a first instance's active work.

## Retained verification

**27 tests passed; zero failed.** `backend-verification.xml` contains the actual test report; `verification-summary.json` contains the runtime and source hashes; `source-snapshot` retains the tested source.

Nine added checks cover pending/released records after restart, session invalidation, atomic create rollback, atomic review rollback, stale-write rejection, exclusive ownership, abrupt process exit with an uncommitted fake release, persisted tenant/owner checks, retained audit corruption, and the HTTP restart workflow. Several outcomes are combined within individual tests. The full suite also retains the prior eighteen access/output workflow tests.

The crash fixture exits its own subprocess abruptly after beginning an uncommitted release. Reopening the database rolls back that update, and service recovery abstains the previously committed evaluation. This is a tested process-exit scenario, not a hardware power-loss, network-filesystem or backup-recovery certification.

## Scope and remaining work

This is a single-process research store. Its evidence is plaintext, its audit hash chain lacks independent anchoring, and production retention, encryption, backups, capacity limits and distributed operation remain unvalidated. Database access uses synchronous calls, whose effect on deployment latency has not been measured. The tested Node 22.20.0 runtime reports its built-in SQLite API as experimental; the implementation uses no additional SQLite package.

The IEEE source now describes persistence separately from the earlier 17-test reference snapshot and 18-test interface integration. The original four-configuration timing table remains an in-memory component benchmark, not a measurement of this SQLite release. The next research boundary is verified external identity, followed by resume-source handling and a live-model evaluation with independent annotation.
