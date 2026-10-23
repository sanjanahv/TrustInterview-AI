# Chunk 23: versioned subject-reference foundation

Implemented optional server-owned subject references in the controlled college interview service (research-0.6). Each new assessment stores a snapshot, version, review status and SHA-256 digest. Submit checks its integrity before passing text as reference evidence to the provider. Configuration changes cannot silently replace an existing assessment's reference. The cache context includes its digest. Stored assessment JSON retains the source without a schema migration.

The server accepts RESEARCH_SUBJECT_REFERENCE_FILE, with a bounded JSON file and validated source fields. No reference is enabled by default. The example source is explicitly research_draft; faculty approval has not been obtained or invented. Client assessment creation still accepts no source or authority fields.

The feedback prompt distinguishes reference quotations from student statements. Provider input accepts the optional reference source; output quotation matching rejects invented reference text. Result metadata states quotation_provenance_only and exposes draft/reviewed status. This is infrastructure for reference-grounded checking, not an implemented entailment or correctness classifier.

Verification: 83 backend tests passed, zero failed, including new tests for source validation/client substitution, assessment snapshot isolation, tamper-before-provider rejection and fabricated reference quotations. No live model calls. Frontend and paper unchanged. Next: a versioned technical-claim output contract and labelled subject-specific semantic checks, using faculty-reviewed references when available.
