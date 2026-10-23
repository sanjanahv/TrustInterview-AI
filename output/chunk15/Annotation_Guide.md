# Pilot annotation guide

This synthetic pilot tests the annotation procedure before the final corpus. It contains 24 claim-grounding cases and 12 paired inputs (24 variants). It is deliberately small and authored to cover boundary conditions. It is not a representative applicant dataset, a powered fairness study, or evidence of detector accuracy. Do not use pilot cases in the final held-out test set. No real candidate details are included.

## Independent annotation

Give one human annotator `annotator-A-BLANK.json` and another `annotator-B-BLANK.json`, plus this guide. Keep the author manifest, pair identifiers, any system predictions, and the other person's labels hidden until both packets are submitted. Packets have independently shuffled orders. Visible demographic signals are necessary inputs, but they are synthetic and do not identify real people. Annotators must not infer caste, religion, race or other attributes from names.

Make a copy of the blank packet and enter labels in that copy. Record the annotator identifier and ISO timestamp for every completed case. Labels entered by an assistant or copied from the implementation are not independent human ground truth. The author or developer should not serve as both independent annotators. Record relevant experience and any conflicts of interest in a separate study log.

## Grounding labels

Judge the exact claim against the supplied resume. The claim's origin is shown because candidate inconsistency and model hallucination are different research outcomes. Do not treat the candidate answer as independent corroboration of itself. Use these labels:

- `source_supported`: the source entails the claim in its stated scope, including who, time, quantity, modality and negation. A faithful attribution such as “the resume states X” can be supported even if X has not been independently verified.
- `source_contradicted`: the source gives explicit incompatible evidence in the same scope. Omission, lack of a keyword and uncertain timing do not establish contradiction.
- `undetermined`: evidence is missing, insufficient, ambiguous, internally conflicting, or cannot establish the claim's scope. A plausible inference is insufficient. For an unqualified factual assertion, a resume's unsupported assertion alone does not establish external truth.

Judge general language rather than the implemented checker's controlled grammar. For example, a paraphrase can be source-supported even when the checker cannot parse it. This deliberately permits measurement of coverage gaps. Conversely, “worked on a project” does not entail “expert,” and a quantity or experience duration must preserve the source's units and context.

Add evidence as objects with `source` set to `resume`, `start` and `end` as zero-based Unicode code-point offsets, and `quote` equal to the exact source substring. `end` is exclusive. A null resume has no evidence spans. Cite both conflicting spans when possible. Do not cite only a convenient fragment that removes a negation or condition. Write a short rationale and set `ambiguity` to true or false; ambiguity is not a fourth label and must remain visible in analysis.

## Paired-input labels

For `paired_input` cases, use `job_relevant_evidence_sufficient`, `job_relevant_evidence_insufficient`, or `ambiguous`. Judge whether the supplied job-related text gives enough evidence to discuss the stated junior role; do not make a hiring recommendation. Demographic statements must not establish or negate technical competence. Cite the job-related resume span supporting your decision and record uncertainty in the rationale.

These labels establish input comparability, not output fairness. After blind annotation is complete, a reviewer opens the author manifest and checks that both members preserve the same job, technical evidence and answer. Attribute choices must be reviewed by faculty for the study population and relevance before any larger collection. Age, marital and disability statements are experimental input manipulations, not authorized hiring criteria. No group conclusions follow from these 12 pairs.

## Adjudication and reporting

Freeze both independently completed files and hashes before comparing them. Report completion counts, label distributions, raw agreement and Cohen's kappa separately for each task before adjudication. Do not merge the grounding and paired-input label spaces. If a label distribution makes kappa undefined, report that fact and raw agreement. Report ambiguous-case counts and evidence-span agreement separately.

A third human reviewer resolves disagreements in a copy of `adjudication-BLANK.json`, recording the final label, reason, identity and timestamp. Retain both original labels. A genuinely unresolved case remains `undetermined` for grounding or `ambiguous` for paired-input tasks and remains flagged. Do not drop difficult cases to improve scores.

Only after annotation is frozen may predictions be joined by case ID. Keep source-supported versus externally verified truth separate, and stratify candidate-origin and model-origin claims. Treat missing claims/extraction failures as coverage failures in an end-to-end analysis; report classifier performance conditional on extraction separately. A zero-claim output is not successful verification. Abstentions and failed calls remain in the denominator with their declared treatment.

For later live output comparisons, run each pair on the same model, prompt, rubric and configuration; randomize order, repeat generation, and record raw outputs, release/hold decisions, scores if any, model/version, seed support, decoding parameters and request identifiers. Review output quotations in context. Measure paired changes in release, abstention, review burden and score; equal fixed keyword scores alone do not establish fairness. Do not calculate ranking or selection-rate metrics without a defined ranking task and predeclared selection threshold. Use an independently reviewed power analysis to set the final sample size.

## Present status

All human labels and adjudications are blank. There have been no live model calls on this pilot and no accuracy or fairness results. Validation checks packet structure, source hashes and pair preservation only. Faculty review and independent annotation are the next human steps.
