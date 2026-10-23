# Unsupported recommendation boundary

Status: implemented in research-0.7. Final manuscript and PDF unchanged pending user approval. This completes the unsupported-recommendation correction, not general semantic hallucination detection or fairness validation.

## Changes and rationale

- New model schema/prompt and offline fixture return evidence observations only. No meaningful assessment rubric exists yet, so asking for practice/continue judgments is unsupported.
- The service accepts legacy practice/continue responses for compatibility but removes their recommendation before persistence, cache and response release. It records recommendation status as withheld, with reason no_validated_assessment_rubric.
- Candidate and reviewer read paths project observations only, preventing previously stored recommendations from reappearing. Reviewer approval releases quotations, not an assessment judgment.
- The interface explains that quotations establish neither technical correctness nor mastery. The score remains explicitly a test-rubric fixture.
- Fabricated evidence, extra output authority fields, sensitive-content holds and session/resource rules continue to apply. Valid evidence can still be shared without an automatic mastery judgment.

## Validation

Backend tests cover quote-only output, opposite legacy recommendations, old-record reads, reviewer approval, invalid extra fields and fabricated evidence. The provider test checks that its requested schema has no recommendation. Interface regression checks that a legacy recommendation is not displayed and the limitation text appears. See verification-summary.json for completed commands and retained report paths.

## Remaining gaps

Technical truth, attribution beyond exact quotations, semantic rubric assessment and demographic/presentation consistency remain unvalidated. This change withholds unsupported judgments; it does not improve or claim semantic classification accuracy. No live model calls, human labels or invented efficacy values were added. Historical experiment files remain untouched.
