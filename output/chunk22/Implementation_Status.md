# Chunk 22: college workflow correction and reviewer evidence

## Workflow traced

TrustInterview-AI/frontend/src/App.js mounts ResearchInterview. That page calls /api/research assessment and reviewer endpoints. The controlled backend is the default package entry point. Historical dynamic question/evaluation screens and routes are separate legacy code, not the active controlled workflow. The current controlled assessment still has one fixed ZTA question and a keyword score fixture; it is not yet a complete college mock-interview grading engine.

## Changes

- Policy research-0.5, contextual-review-v3 removes the three poorly motivated whole-source married/disabled/pregnant exemptions introduced in chunk 20. Sensitive references remain review signals, not proof of discrimination. This corrects direction following the user's college-use clarification; it does not claim to solve unnecessary demographic holds.
- The bounded technical race-condition exception is retained.
- Authorized reviewer UI now shows the matched bias term, category, contextual classification, source and observation number.
- Reviewer UI also displays quotation-level claim comparisons and their resume evidence; previously these backend findings were not displayed.
- UI explicitly distinguishes review signals from discrimination, dishonesty and student ability. No new automatic grading or student rejection rule was added.
- The paper and proposed mathematical models remain unchanged.

## Verification

Backend: 79 passed, zero failed. Frontend: five passed, including assertions that reviewer explanations and contradiction evidence are displayed, while existing held-score non-disclosure remains covered. Production frontend build compiled successfully.

## Remaining gaps

General semantic feedback checking, faculty-approved subject rubrics and references, and realistic independently labelled college-answer cases remain needed. Resume-relative claim comparison does not establish technical correctness. A lexical review hold still does not measure demographic fairness. No live model calls or efficacy measurements were made.
