# Mathematical models for a college interview bot

Research review: 2026-10-14. This is a proposal, not an implemented or validated model. No paper or project behaviour was changed in this chunk.

## Scope and implementation constraints

User-confirmed setting: college interview bot. Support student practice and authorized faculty/placement review. Do not assume a formal examination, employer selection, or autonomous grading mandate. Repository descriptions also contain campus-placement and resume-based features; college use does not automatically make resumes irrelevant.

The controlled service currently has one fixed ZTA question, a three-term keyword fixture score, exact quoted observations and practice/continue recommendation. It lacks a faculty-calibrated semantic rubric, generated explanatory claim contract and labelled semantic confidence estimator. The optional live provider has not been evaluated. Existing lexical bias exceptions do not provide population fairness evidence.

## Recommended combination

Claim-level semantic grounding plus selective release, protected by hard access gates, with paired assessment-consistency evaluation. These are adaptations of existing methods, not a claim to invent their mathematics.

### 1. Claim-level grounding

For output y, extract atomic claims C(y). Bind each claim to the relevant evidence type: student answer for student-attribution claims; faculty-approved reference material for domain facts; rubric and its matched evidence for evaluative claims. A resume may establish a source-relative assertion but cannot establish a textbook fact or externally verify a qualification.

For m>0, G(y,E) = (1/m) sum_j 1[label(c_j,E)=supported]. Report contradicted and undetermined fractions separately. If extraction fails or m=0, G is undefined, not one. Record extraction coverage and end-to-end failures. A learned NLI/alignment score is an estimate, not automatically a probability.

Motivation: FActScore evaluates atomic factual support; AlignScore evaluates input-output factual consistency. Neither validates this college domain without new labelled evaluation.

### 2. Selective release and review

Let A(x) be a Boolean conjunction of required identity, role, institution/resource scope, ownership and session-validity checks. Let P(x,y) require schema/provenance validity and successful durable commit. Let q(x,y) be a separately calibrated output reliability estimate. Release g_t(x,y)=A(x)P(x,y)1[q(x,y)>=t], subject to mandatory review rules. An access denial cannot be compensated by high output confidence. Review/abstention do not mean zero student ability.

For independently labelled held-out outputs i with error indicators e_i, Coverage(t)=sum_i g_t(i)/N and SelectiveRisk(t)=sum_i g_t(i)e_i/sum_i g_t(i). Risk is undefined when nothing is released. Report both to expose an all-abstain system. For evaluating output control quality separately, compute risk/coverage on access-eligible cases and report access denials in another denominator.

Choose thresholds using calibration data and assess on untouched test data. If searching many thresholds with confidence bounds, use an appropriate simultaneous bound or separately fixed validation procedure. Repeated outputs from the same answer are dependent and are not independent sample size.

Conformal Risk Control can control expected bounded monotone loss under its assumptions. The conditional error among released cases is a ratio and is not generally monotone in the threshold; do not apply the vanilla CRC formula and claim a conditional-risk guarantee. Model/source distribution changes also require reassessment. Classical selective prediction is the simpler first implementation.

### 3. Paired consistency for bias evaluation

T modifies a declared irrelevant feature while preserving question, evidence content and rubric. Faculty must verify preservation, especially grammar/style changes; communication tasks may legitimately assess language. Names/pronouns must not be treated as proxies that establish actual demographic identity.

For a meaningful normalized score s: Delta_i=s(x_i)-s(Tx_i). Report signed mean Delta, mean |Delta| and score-error changes against independently assigned gold scores. Signed mean alone can hide cancelling differences. For decision d in release/review/abstain: FlipRate=(1/n)sum_i 1[d(x_i)!=d(Tx_i)]. Also report directional review/abstention differences, missing scores and provider failures.

This is a controlled perturbation audit, not proof of causal counterfactual fairness. Kusner et al.'s formal definition requires causal assumptions and a structural model. Fixed keyword scores currently ignore identity by construction; they cannot demonstrate that an LLM evaluator is fair. Evaluate observation selection and practice/continue outcomes now, and meaningful scores only after rubric validation.

### 4. Rubric-based scoring and faculty calibration

With faculty-defined criteria r_k in [0,1] and nonnegative fixed weights summing to one: S=100 sum_k w_k r_k. Every criterion judgment should identify student-answer evidence and rubric expectation. Weights are an assessment-design choice, not learned evidence of fairness. Score calibration requires blind faculty marks, disagreement analysis, MAE and an agreement measure appropriate to the scale. Avoid awarding technical marks for verbosity, fluency or identity unless the declared construct warrants it.

This addresses the current score fixture, but increasing score sophistication alone does not solve hallucination or bias. Educational LLM grading research provides a relevant evaluation precedent.

### 5. Item Response Theory and Differential Item Functioning

For a calibrated binary item bank, the 2PL model is P(correct|theta,a_j,b_j)=sigmoid(a_j(theta-b_j)). Theta is latent ability, b_j difficulty, and a_j discrimination. Open-ended partial-credit answers require a suitable polytomous model rather than automatic binary conversion.

DIF tests whether item outcomes differ across groups conditional on comparable ability. A possible logistic model adds group and group-by-ability terms; their interpretation depends on adequate ability measurement, item design and model fit. DIF flags warrant content review and do not alone prove discrimination.

Use later for calibrated question difficulty/adaptive interviews. Requires shared anchor items, sufficient student responses, fit/identifiability checks and faculty validation. Seven newly generated questions per student do not provide a calibrated bank. IRT does not detect fabricated feedback or authorize access.

## Implementation sequence

1. Map actual college workflow, roles, practice versus assessed use, and relevant evidence sources.
2. Have faculty define one subject rubric and a small approved question/reference bank; preserve existing security invariants.
3. Build blind claim and criterion annotation packets. Separate development/calibration/test sets by base question/answer family, keeping perturbation variants together.
4. Add a versioned claim contract and an evaluated semantic checker in shadow mode. Do not silently replace the quote-only contract or treat self-reported LLM confidence as calibrated.
5. Evaluate grounding coverage, errors and paired decision differences; calibrate release thresholds and then test frozen policy.
6. Only after results, update the paper around measured behaviour. Keep IRT/DIF as a later option unless enough appropriate data exist.

## Primary sources inspected

- NIST SP 800-207 (2020): https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-207.pdf
- Geifman and El-Yaniv, Selective Classification for Deep Neural Networks (NeurIPS 2017): https://proceedings.neurips.cc/paper_files/paper/2017/hash/4a8423d5e91fda00bb7e46540e2b0cf1-Abstract.html
- Min et al., FActScore (EMNLP 2023): https://aclanthology.org/2023.emnlp-main.741/
- Zha et al., AlignScore (ACL 2023): https://aclanthology.org/2023.acl-long.634/
- Angelopoulos et al., Conformal Risk Control, revised June 2025: https://arxiv.org/html/2208.02814v4
- Kusner et al., Counterfactual Fairness (NeurIPS 2017): https://papers.neurips.cc/paper_files/paper/2017/hash/a486cd07e4ac3d270571622f4f316ec5-Abstract.html
- Grading Massive Open Online Courses Using Large Language Models (COLING 2025): https://aclanthology.org/2025.coling-main.263/
- Linguistic Bias in ChatGPT (EMNLP 2024): https://aclanthology.org/2024.emnlp-main.750/
- ETS, Basic Concepts of Item Response Theory (2020): https://www.ets.org/Media/Research/pdf/RM-20-06.pdf
- ETS, Differential Feature Functioning in Automated Essay Scoring (2017): https://www.ets.org/research/policy_research_reports/publications/chapter/2017/jxym.html
- Writing-style grading bias preprint (2026), supporting exploratory context, not a validated project result: https://arxiv.org/abs/2603.18765

Reject arbitrary weighted trust scores that permit confidence to compensate for failed authorization; keyword counts presented as fairness probabilities; cosine similarity presented as factual correctness; and educational model parameters invented without calibration.
