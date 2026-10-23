# Chunk 13: resume evidence and grounding

Implemented optional assessment-owned plain-text resume attachment in the controlled API and candidate interface. Candidate role, tenant and owner are enforced. Text is bounded to 8000 UTF-8 bytes, immutable after attachment, and committed with a hash-bearing audit event. Hash checking precedes provider invocation. Provider input is copied, and cache context includes the resume digest. Authorized reviewers can see resume evidence for held outputs.

Grounding remains structural: observations must quote an available source exactly. Missing resume evidence and fabricated quotations abstain. Lexical sensitive and instruction-like quotations are held for review. Candidate-supplied statements are explicitly unverified; neither a matching quote nor a content hash establishes external truth. Scores remain answer-only fixed keyword scores. The default provider remains offline and quotes the answer; test providers exercise resume quotations.

Verification: 50 backend tests pass, including eight new resume tests. Four frontend tests pass and the production frontend build succeeds. Exact source snapshots and a JUnit report are retained beside this file; frontend logs are also retained. Manuscript checks find 15 citations and 15 bibliography entries, no missing or duplicate labels, and balanced braces. Prior chunk snapshots and timings remain unchanged and their artifact verifier passes. No live model call or live Google login occurred. The IEEE PDF has not yet been compiled.

Remaining: semantic claim support/contradiction/unknown decisions, annotated fairness and hallucination experiments, a bounded PDF/OCR path if needed, a live provider adapter, and final IEEE compilation and layout review. Full efficacy has not been measured.
