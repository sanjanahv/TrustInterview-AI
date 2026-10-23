# Chunk 19: observation grounding and explainable bias signals

Implemented directly in TrustInterview-AI/backend/research. The faculty paper remains unchanged.

## Changes

- Policy version research-0.3 independently applies the existing explicit-use-v1 claim checker to each structurally valid model observation, against the bound resume.
- Undetermined observation claims abstain; contradictions hold for review; abstention takes precedence over review.
- Quotes containing no Unicode letters or numbers are rejected rather than accepted as evidence.
- Extracted lexical bias signals carry category, source identifier, observation index, exact matched text and quote-relative UTF-16 start/end offsets. They explicitly state that they are review signals, not discrimination findings.
- Existing lexical vocabulary is preserved. Benign demographic disclosures and technical uses such as 'race condition' still cause review; this known contextual limitation is tested rather than silently described as solved.

## Verification

Command: `rtk proxy npm run test:research` from TrustInterview-AI/backend.

Result: 75 tests passed, zero failed/skipped/cancelled. Six new tests cover exact Unicode offsets, lexical limitations, fabricated/non-content quotes, observation grounding, decision precedence and service-level withholding of an ungrounded question-source observation. This is implementation verification, not independently measured fairness or hallucination efficacy.

## Remaining scope

The whole-line technology-use grammar still excludes general prose, paraphrases, duration and competence inference. An empty extracted claim set does not establish semantic verification. Bias screening remains lexical; no contextual discrimination classifier or demographic efficacy estimate was introduced. No live provider requests were made.

Next chunk: build a separately versioned contextual bias policy with explicit technical-context and neutral-disclosure cases, retain injection holds separately, and measure its errors on independently labelled held-out examples before claiming improvement.
