# Chunk 7: executable control reference

Implemented in `TrustInterview-AI/backend/research`, without modifying the legacy application entry point. This boundary is intentional and must remain explicit in the paper and faculty demonstration.

The reference service enforces provisioned identity, tenant/resource ownership, reviewer roles, expiring/revocable sessions, strict request schemas, server-derived scoring, structured evidence grounding, conservative bias/instruction review, fail-closed provider handling, isolated output cache writes, and correlated hash-chain audit events.

Seventeen automated tests exercise these invariants, including an actual loopback HTTP flow, an indirect prompt instruction that cannot alter server scoring, and fail-closed handling of audit write failure. The repository README explains exactly what the service does and does not implement.

Important incomplete items: legacy UI/API integration, external identity verification, transactional persistence, a real model adapter, semantic grounding, validated bias measurement, workload limits and retention, cache reuse, regeneration, and externally anchored audit storage. The narrow keyword rubric is an evaluation fixture rather than a validated interview scoring method.

The historical prototype traceability table in the paper remains valid for its original commit. These new files are uncommitted additions and are identified by SHA-256 hashes in the Chunk 8 manifest; they do not retroactively change the reviewed snapshot.
