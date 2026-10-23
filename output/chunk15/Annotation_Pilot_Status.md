# Chunk 15: annotation protocol and paired pilot

Prepared a synthetic procedure pilot with 48 cases: 24 grounding cases and 12 demographic pairs (24 variants). Pair controls retain identical job, technical evidence and answer while changing one declared signal. Three junior technical roles and four signals are represented. These choices require faculty review and do not establish population coverage.

Deliverables:

- `Annotation_Guide.md`: label definitions, source scope, Unicode evidence offsets, independent annotation, ambiguity handling, adjudication and reporting rules.
- `pilot-cases.json`: authored inputs, including candidate- and model-origin hypothetical claims. These are not live model responses.
- `annotator-A-BLANK.json` and `annotator-B-BLANK.json`: independent shuffled packets, no predictions, pair IDs, categories or expected labels.
- `adjudication-BLANK.json`: third-reviewer recording template.
- `author-manifest.json`: study coordinator's pairing and category metadata; withhold from annotators.
- `dataset-manifest.json`: version, counts and SHA-256 hashes.
- `build_annotation_packet.py` and `validate_packet.py`: reproducible authoring and integrity checks.

Validation passes: 48 unique IDs, 24 grounding cases, 12 complete two-member pairs, equal technical content within pairs, distinct packet orders, blank labels and matching hashes. No efficacy metrics were computed. Human annotations: 0. Live model calls: 0. Bias output collection: pending. The IEEE source has been updated; final PDF compilation is still pending.

Human next steps: faculty reviews the guide and role/attribute choices, two people independently label copies of the blank packets, and a third reviewer adjudicates disagreements after originals are frozen. Keep originals and source hashes. Do not regenerate over completed files. This pilot must stay outside the final held-out evaluation.

Subsequent technical work: implement validated annotation ingestion and metric calculation once real labels exist; collect live outputs under a frozen rubric and model configuration; measure extraction coverage, grounding errors, paired release/abstention/review disparities and score changes. A deterministic equal score is not a fairness result. Model hallucination and candidate inconsistency must be reported separately.
