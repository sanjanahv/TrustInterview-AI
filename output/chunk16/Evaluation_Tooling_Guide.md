# Annotation and evaluation tooling

The standalone Python tool is `TrustInterview-AI/backend/research/evaluation/annotation_tools.py`. It has no third-party dependencies and does not change API behavior. Its schema and arithmetic tests use explicitly artificial unit fixtures, not human study labels or real model outputs.

## Validate reviewer packets

From the workspace root, use actual completed copies when available:

```powershell
rtk proxy python TrustInterview-AI/backend/research/evaluation/annotation_tools.py --cases output/chunk15/pilot-cases.json --annotator-a output/chunk15/annotator-A-BLANK.json --annotator-b output/chunk15/annotator-B-BLANK.json --adjudication output/chunk15/adjudication-BLANK.json --report output/chunk16/annotation-readiness.json
```

With the present blank packets, this produces `pending_annotations`, completion counts of zero, and null agreement, ground truth and efficacy metrics. It does not invent labels. Copy packets before annotating; preserve the frozen originals. Case text and identifiers must be unchanged. Each completed row needs a task-valid label, rationale, boolean ambiguity flag, one consistent reviewer identity per packet and an ISO timestamp with timezone. Source-supported and source-contradicted labels need exact resume evidence; missing source cannot support a quotation. Evidence offsets use Unicode code points, not JavaScript UTF-16 code units.

After both complete packets are validated, the tool reports per-task raw agreement, Cohen's kappa, distributions, ambiguity counts and exact evidence-span-set agreement. Empty span sets are included in exact agreement; this measure is not token overlap or semantic span agreement. Undefined kappa remains null with a reason. Different reviewer IDs are required, but IDs cannot prove that two independent people actually performed the work.

Every disagreement and every flagged ambiguous case requires third-reviewer adjudication before predictions can be evaluated. Unambiguous agreement is retained as consensus. Completed adjudication needs a task-valid final label, reason, a different reviewer identity and a timestamp at or after both original annotations. Ambiguity flags remain in the report even after adjudication. The tool does not assess the correctness of a person's reasoning.

## Import grounding predictions

Supply `--grounding-predictions PATH` only after annotations and adjudication are ready. The file must be a JSON list containing exactly one record for each grounding case in one matched run and configuration. Required metadata:

- `caseId`, `runId`, `configuration`, `provider`, `model`, `policyVersion`, `rubricVersion`, `requestId`.
- `runKind`: `live` or `offline`; `decoding`: an object with actual settings; `recordedAt`: ISO timestamp with timezone.
- `promptHash` and `rawResponseSha256`: lowercase SHA-256 strings. `rawResponseRef` points to the retained raw output or error artifact. The importer checks hash syntax; it does not fetch or verify response files or provider authenticity.
- `inputSha256`: hash of the canonical full case object. Generate it with the tool's `case_hash(case)` function, which uses sorted JSON keys, UTF-8, unescaped Unicode and compact separators. It is checked against the imported case.
- `status`: `extracted`, `extraction_failed`, or `provider_failed`. `predictedLabel` is a grounding label only for `extracted`, otherwise null. `decision`: `release`, `abstain`, `review`, or `deny`. A failed provider cannot release.

This schema evaluates one declared claim per case. Future multi-claim model outputs require a frozen claim-alignment protocol, not arbitrary selection of a convenient claim. Candidate-origin and model-origin cases are reported separately. Missing predictions are errors in end-to-end accuracy and false negatives for the gold class; extraction-conditional metrics and extraction coverage are shown separately. Complete failure rows are retained. Semantic `undetermined` labels and operational `abstain` decisions are separate concepts. Confusion matrices have a missing-prediction column; per-class F1 and macro-F1 use zero for undefined precision/recall and include all three predefined classes. Conditional metrics on an empty extracted subset remain null.

## Import paired runs

Add `--paired-runs PATH --author-manifest output/chunk15/author-manifest.json`. Each configuration/run ID must include every paired case, including failed calls, with the same metadata as above. Pair members must use the same provider, model, prompt template hash, decoding settings, rubric, policy and run kind. `status` is `completed` or `failed`; `score` is null or a finite number from 0 to 100. Held and failed scores must be null. A failed decision can be null; failed calls cannot release.

Pair contrasts use variant 1 minus variant 0. The report retains per-pair score and release/review/abstention contrasts, failed-variant counts, input-comparability labels and descriptive summaries per attribute/configuration. Missing scores remain null. Summaries show completed/scored pair-run denominators and unique pair counts, so repeated runs are not disguised as independent applicants. Failed pairs are retained in raw contrasts and counted, while completed-pair rate summaries explicitly exclude them. Failure disparities must be analyzed separately before interpreting output differences as bias. No ranking, selection rates, hypothesis tests, confidence intervals or population fairness conclusions are produced by this pilot tool.

## Reproducibility and present limits

Reports record SHA-256 hashes of their input files. A report cannot overwrite an input. Freeze real annotations and outputs before analyzing them; hashes show which files were used, not who authored them. Keep response artifacts locally without secrets or real applicant data. Review the annotation provenance and experiment protocol with faculty.

Current status: 0 completed human annotations; 0 adjudications; 0 live model outputs for this pilot. Only readiness and tooling tests have been run. A powered final study, uncertainty intervals, independent annotation and real output collection remain pending. The pilot must be excluded from the final held-out corpus.
