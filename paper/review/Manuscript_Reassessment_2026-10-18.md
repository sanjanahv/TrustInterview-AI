# Manuscript reassessment: first careful revision

Status: review proposal only. The seven-page faculty source/PDF have not been replaced. No new implementation or efficacy results are claimed. Mathematical model work remains deferred.

## Assessment

Reviewer judgment: 6/10 overall as the current research manuscript; 7/10 for faculty discussion; 4/10 as a finished empirical paper centred on hallucination and bias effectiveness. Scores are subjective, not acceptance probabilities.

The previous 7/10 faculty-draft judgment recognized architecture, presentation and honest limitations. Reassessment against the clarified college use case exposes additional framing and emphasis gaps. The work has not become less relevant; its current manuscript does not yet reflect that intended priority well enough.

| Dimension | Rating | Evidence-based judgment |
|---|---:|---|
| College interview relevance | 8/10 for topic; 5/10 for present framing | Student feedback and assessment consistency matter, but the manuscript centres on hiring/resume matching. |
| ZTA foundation | 8/10 | Resource/session controls, transactional state and authorized review are concretely implemented; device, network and edge claims must remain separate. |
| Hallucination method | 5/10 | Provenance and bounded claim comparisons exist. Technical correctness and general semantic feedback support remain unimplemented/unvalidated. |
| Bias method | 4/10 | Explainable lexical review exists; technical-context exceptions are narrow. No independent demographic or presentation-style effectiveness results exist. |
| Empirical evidence | 3/10 | Tests and offline recording validate behaviour/procedure, not general efficacy. |
| Novelty argument | 6/10 | Coupled access and output release is plausible, but comparative benefit remains to be demonstrated. |
| Clarity and honesty | 8/10 | Limitations are explicit and formatting is sound. Repetition and historical detail dilute the main research question. |

## Priority gaps and exact treatment

1. Scope: college interview practice and authorized assessment/placement support. Do not quietly convert the product into an examination system or remove resume-based features that it actually has. The controlled research entry point is only a limited reference workflow, not the entire historical portal.
2. Hallucination: distinguish unsupported model attribution to a student, technically incorrect explanation and unsupported rubric judgment. Resume disagreement is a separate source discrepancy, not proof of dishonesty or a model hallucination. Current code does not implement all three semantic checks.
3. Bias: distinguish a sensitive term from unequal treatment. Measure comparable technical content under declared irrelevant variations. Language/style invariance applies only when communication quality is not an assessed construct. Present lexical holds as a review mechanism with potential unequal burden.
4. Output limitation: the provider currently emits exact quotations plus practice/continue. A valid quotation does not justify the recommendation or establish technical competence. General explanatory feedback checking requires a versioned claim contract and independent labels.
5. Subject references: research-0.6 adds optional server-owned version/hash-bound reference material. None is enabled by default; the example is a research draft. Do not call it faculty-approved or semantic verification. Faculty review status is an administrative assertion, not proof of actual review.
6. Evidence freshness: faculty draft says 69 backend tests (chunk 17). Chunk 23 records 83 after later changes. Retain 69 as the historical snapshot until a new source/report manifest is frozen; do not relabel old raw reports as 83. The five frontend tests, twelve tooling tests and 48 offline records come from different recorded snapshots and must be dated/identified accordingly.
7. Bias evaluation corpus: the existing pilot's age/marital/disability and job-role pairs are a historical procedure pilot. It is not automatically the final college test set. Prepare answer-content-preserving student variants; keep blind labels empty until independent reviewers supply them.
8. Comparisons: no live efficacy baseline/ablation results exist. Compare provenance-only checks, the bounded checker and the selected semantic extension on matched held-out inputs when ready. Preserve failures, extraction gaps and abstention/review denominators.
9. Page focus: reduce detailed authentication/storage narrative and historical microtiming prominence. Give the recovered space to hallucination taxonomy, bias methodology, examples and actual results when obtained. Do not fill empty result space with invented percentages.
10. Related work: retain relevant hiring literature as adjacent work, add college assessment and factual-support literature, and explain the domain differences. Citing another system's performance does not establish ours.

## Compact ZTA coverage plan

The 13 layer labels are project-specific legacy organization, not a NIST-prescribed 13-layer standard. Cover all labels compactly, with code provenance and test status. Do not state that the default controlled service runs all legacy middleware.

| Legacy labels | One-line purpose in paper | Current evidence boundary |
|---|---|---|
| L1 identity/session; L9 policy | Authenticate and authorize scoped assessment operations. | Controlled service has independent session/role/tenant/owner/state enforcement. |
| L2 device; L3 network; L10 edge | Reduce client, origin and transport exposure. | Legacy modules/configuration; not established by controlled-core tests or dashboard status. |
| L4 workload; L5 data; L8 governance | Bound and validate input and protect evidence handling. | Controlled service has bounded schema/text handling and hashes; no claim of encryption, PDF isolation or complete injection protection. |
| L6 audit; L7 automation; L11 threat intelligence | Record actions and support operational response. | Transactional audit/recovery is verified in the reference service; legacy SOAR/IP reputation efficacy is not established by those tests. |
| L12 bias risk | Route selected output risks to contextual human review. | Lexical findings and a bounded technical exception; no general fairness guarantee. |
| L13 grounding | Bind output to evidence and withhold unsupported artifacts. | Exact quotes, bounded technology-use comparison and optional reference provenance; not general factual verification. |

Allow approximately half to three-quarters of a page for the ZTA foundation and compact mapping within a seven-to-eight-page paper. Describe hallucination and bias in their own methods sections. This is a proposed content allocation, not a measured final layout.

## Proposed seven-to-eight-page emphasis

| Content | Approximate allocation |
|---|---:|
| Abstract, college problem and contributions | 1 page |
| Related work and threat assumptions | 0.75 page |
| Compact ZTA foundation and workflow diagram | 0.75 page |
| Hallucination/grounding method | 1.25 pages |
| Bias-risk method and paired evaluation | 1 page |
| Verification and genuine efficacy results, when available | 1.25 pages |
| Limitations, conclusion and references | 1 to 2 pages |

Do not force a page count by shrinking IEEE fonts/margins. Historical microtimings can move to supporting material if they do not answer the central questions.

## First revision delivered

Prepared a separate LaTeX text fragment with a proposed college-focused title, scope paragraph, hallucination/bias distinctions and concise ZTA positioning. It is not a full paper, is not included by the current source, and has not been compiled or approved. Final title/abstract/results and bibliography will be reconciled only after the staged content is approved and evidence gaps are addressed.

## Next single chunk

Create the college-focused failure-case and claim-to-evidence table: invented student attribution, incorrect subject explanation, unsupported rubric judgment, identity/presentation perturbations and unnecessary review. Mark each case as implemented, testable now or requiring an extension. Do not add another detector or mathematical model in that chunk.

## Primary literature checked for scope

- NIST SP 800-207: resource-focused ZTA and policy enforcement, not a prescribed 13-layer design: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf
- FActScore: atomic factual-support evaluation; useful grounding precedent, not project efficacy evidence: https://aclanthology.org/2023.emnlp-main.741/
- Grading Massive Open Online Courses Using Large Language Models: educational grading context, not direct validation of college interview scoring: https://aclanthology.org/2025.coling-main.263/
