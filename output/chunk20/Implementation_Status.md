# Chunk 20: narrow contextual bias exceptions

The controlled project now uses policy research-0.4 and contextual-review-v2. The paper remains unchanged.

## Implemented

- Signals retain exact matches and offsets, and add context, rule identifier and requiresReview.
- Technical `race condition(s)` matches avoid a bias hold only when no other unmatched `race` reference occurs in the complete bound source.
- Three exact whole-source disclosures (married, disabled, pregnant) avoid automatic bias review. Quotation provenance must still pass. Cropped statements, suffixes and reported speech do not qualify.
- All other sensitive references remain review signals. No statement is certified non-discriminatory.
- Grounding abstention, unsupported evidence and instruction-like holds retain precedence.

## Verification

`rtk proxy npm run test:research`: 79 passed, zero failed/skipped/cancelled. Tests cover technical exceptions, demographic race suffixes, neutral disclosure variants, cropped-source bypass attempts, explicit discriminatory statements, instruction holds, fabricated quotations and service-level score/release behaviour. Tests are authored regression cases, not independently labelled efficacy evaluation. No live model calls were made.

## Limits and next chunk

General paraphrases, coded discrimination, intersectional effects and neutral disclosures in ordinary multi-sentence prose remain unresolved. Technical phrase recognition also remains a bounded heuristic. Equal fixture scores in three authored disclosure cases are not a fairness result.

Next: prepare a separate blind-labelled challenge set for contextual bias and grounding, covering realistic prose and adversarial near-misses. Measure errors before broadening exceptions; preserve the frozen cases and distinguish training/pilot inputs from held-out evaluation.
