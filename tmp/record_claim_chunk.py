from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'output/chunk14'
out.mkdir(parents=True, exist_ok=True)
script = (root / 'output/chunk13/run_verification.cjs').read_text(encoding='utf-8')
script = script.replace("'resume.test.cjs'];", "'resume.test.cjs', 'claim-grounding.test.cjs'];")
script = script.replace("const files = ['core.cjs'", "const files = ['claim-grounding.cjs', 'core.cjs'")
script = script.replace('summary.tests !== 50', 'summary.tests !== 58').replace('summary.passed !== 50', 'summary.passed !== 58')
(out / 'run_verification.cjs').write_text(script, encoding='utf-8')
(out / 'verify_frontend.cjs').write_text((root / 'output/chunk13/verify_frontend.cjs').read_text(encoding='utf-8'), encoding='utf-8')
paper = root / 'paper/TrustInterview_IEEE_working.tex'
text = paper.read_text(encoding='utf-8')
anchor = '\\subsection{Transactional Persistence and Restart Recovery}'
section = r'''\subsection{Controlled Claim-Level Grounding}

The next reference revision adds a bounded claim comparison rather than a general semantic entailment model. It recognises whole-line first-person technology-use statements of the form ``I have used Python'' and their explicit ``not used'' negations. A fixed alias vocabulary distinguishes Java from JavaScript and preserves technologies containing punctuation. Each extracted claim receives an identifier, its original text, a source-relative label, a reason and exact resume quotations. Matching polarity yields source-supported; opposite polarity yields source-contradicted. Missing evidence, conflicting source assertions, unrecognised technologies and wording outside the controlled grammar yield undetermined. Resume omission is not contradiction. Statements outside the extraction scope are not silently counted as successfully verified claims.

The output PEP incorporates these labels under policy version \texttt{research-0.2}. Undetermined extracted claims cause abstention, and source contradictions hold otherwise releasable output for authorized review. A structurally invalid provider output remains blocked regardless of claim labels. Neither agreement nor a reviewer decision proves a candidate's qualifications. Claim evidence is persisted with the attempt and shown to the candidate and authorized reviewer; fixed keyword scoring remains independent of resume statements. Eight additional tests cover polarity, aliases, missing and conflicting evidence, unsupported wording, provenance and enforcement, bringing the cumulative backend suite to fifty-eight passing tests. These are authored contract cases, not an independently annotated accuracy benchmark. General resume prose, temporal claims, experience duration, competence, reported speech and factual verification require a broader annotation protocol and are not established by this implementation. Candidate--resume inconsistency remains distinct from model hallucination; the provider's generated quotations continue to undergo the separate structural grounding check.

'''
assert anchor in text
paper.write_text(text.replace(anchor, section + anchor, 1), encoding='utf-8')
readme = root / 'TrustInterview-AI/backend/research/README.md'
with readme.open('a', encoding='utf-8') as f:
    f.write('\n## Controlled claim grounding (policy research-0.2)\n\n`claim-grounding.cjs` compares whole-line `I have used TECHNOLOGY.` and `I have not used TECHNOLOGY.` statements against optional resume evidence. A fixed alias vocabulary is supported. Same polarity is source_supported; opposite polarity is source_contradicted; missing, conflicting or unsupported evidence is undetermined. Unknown extracted claims abstain; contradictions hold otherwise valid output for review. No claims extracted means out of scope, not verified. This is controlled-language source comparison, not general entailment, qualification verification, a fairness metric or a measured hallucination detector. Original answer and source quotes are retained. The default provider is still offline.\n')
(out / 'Claim_Grounding_Status.md').write_text('''# Chunk 14: controlled claim grounding

Implemented a bounded first-person technology-use checker with explicit negation, a fixed alias vocabulary, source-supported/source-contradicted/undetermined labels, exact source quotations and claim IDs. Missing evidence is undetermined; conflicting source statements do not pick a convenient label. Outside-scope statements are not verified. Unknown extracted claims abstain; source contradictions require authorized review. Output-contract failures still abstain. Candidate-resume inconsistency and model-generated unsupported quotations remain distinct.

Policy version advanced to research-0.2. Grounding records persist with the attempt and are displayed to candidates and authorized reviewers. Resume contents do not change the fixed answer score. Eight new contract tests bring backend verification to 58 passing tests. Exact snapshots, JUnit and frontend logs are retained here. Earlier chunk snapshots are unchanged.

Limitations: controlled grammar rather than general semantic inference; no independent ground-truth corpus or measured accuracy; no live model calls; no verified qualifications or inferred dishonesty. Authored cases establish deterministic behavior only. Future work must evaluate general prose, temporality, duration and counterfactual fairness separately. IEEE PDF compilation remains pending.
''', encoding='utf-8')
