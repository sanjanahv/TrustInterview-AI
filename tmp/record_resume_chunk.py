from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'output/chunk13'
out.mkdir(parents=True, exist_ok=True)
script = (root / 'output/chunk12/run_verification.cjs').read_text(encoding='utf-8')
script = script.replace("'google-identity.test.cjs'];", "'google-identity.test.cjs', 'resume.test.cjs'];")
script = script.replace('summary.tests !== 42', 'summary.tests !== 50').replace('summary.passed !== 42', 'summary.passed !== 50')
(out / 'run_verification.cjs').write_text(script, encoding='utf-8')
paper = root / 'paper/TrustInterview_IEEE_working.tex'
text = paper.read_text(encoding='utf-8')
anchor = '\\subsection{Transactional Persistence and Restart Recovery}'
section = r'''\subsection{Bound Resume Evidence}

The subsequent reference workflow accepts an optional, candidate-supplied plain-text resume before answer submission. Attachment enforces candidate role, tenant and assessment ownership, rejects unexpected fields and invalid text, and limits the source to 8000 UTF-8 bytes. The assessment stores the text and its SHA-256 digest transactionally with an audit event containing the digest rather than the resume text. Attachment is permitted once; sources cannot be replaced after submission. The digest is checked before provider invocation and included in the cache context. This binding detects content mismatch within the workflow; it does not authenticate the resume author or withstand an administrator rewriting both text and digest.

The provider receives an isolated copy of the assessment's answer, question and attached resume. The output policy accepts only bounded quotations linked to those source identifiers. An absent source or an unsupported quotation causes abstention, while selected sensitive-attribute and instruction-like quotations require review. These decisions concern output provenance: an exact quotation from a candidate-supplied resume does not verify a qualification, establish semantic entailment or identify candidate dishonesty. The existing keyword score is unchanged by resume contents. The default offline provider still quotes the answer; resume quotations are exercised through controlled test providers. Eight additional tests cover access isolation, bounded ingestion, source immutability, missing and fabricated evidence, review triggers, provider mutation, SQLite restart and hash mismatch, and the HTTP route. The cumulative backend suite contains fifty passing tests. These checks are not annotated hallucination or fairness measurements. PDF parsing, OCR and semantic three-way claim classification remain unimplemented in this reference workflow.

'''
assert anchor in text
text = text.replace(anchor, section + anchor, 1)
paper.write_text(text, encoding='utf-8')
readme = root / 'TrustInterview-AI/backend/research/README.md'
with readme.open('a', encoding='utf-8') as f:
    f.write('\n## Resume evidence\n\nPOST `/api/research/assessments/{id}/resume` with exactly `{ "text": "..." }` attaches optional candidate-supplied plain text once before answering. Maximum 8000 UTF-8 bytes; binary controls and malformed Unicode are rejected. Candidate ownership and tenant checks apply. Sources are persisted with SHA-256 and checked before provider invocation. Feedback can cite `resume` only when an exact quotation exists. Missing or fabricated citations abstain; lexical sensitive/instruction triggers hold output for review. Resume text is not proof of qualifications and does not affect the fixed score. The default offline provider quotes the answer; resume citations are tested with injected providers. No PDF/OCR or semantic entailment classifier is implemented. Resume evidence is stored in plaintext under the same persistence limitations as answers.\n')
(out / 'Resume_Grounding_Status.md').write_text('''# Chunk 13: resume evidence and grounding

Implemented optional assessment-owned plain-text resume attachment in the controlled API and candidate interface. Candidate role, tenant and owner are enforced. Text is bounded to 8000 UTF-8 bytes, immutable after attachment, and committed with a hash-bearing audit event. Hash checking precedes provider invocation. Provider input is copied, and cache context includes the resume digest. Authorized reviewers can see resume evidence for held outputs.

Grounding remains structural: observations must quote an available source exactly. Missing resume evidence and fabricated quotations abstain. Lexical sensitive and instruction-like quotations are held for review. Candidate-supplied statements are explicitly unverified; neither a matching quote nor a content hash establishes external truth. Scores remain answer-only fixed keyword scores. The default provider remains offline and quotes the answer; test providers exercise resume quotations.

Verification: 50 backend tests pass, including eight new resume tests. Exact source snapshots and a JUnit report are retained beside this file. Prior chunk snapshots and timings remain unchanged. No live model call or live Google login occurred. Frontend test/build results are recorded separately.

Remaining: semantic claim support/contradiction/unknown decisions, annotated fairness and hallucination experiments, a bounded PDF/OCR path if needed, a live provider adapter, and final IEEE compilation and layout review. Full efficacy has not been measured.
''', encoding='utf-8')
