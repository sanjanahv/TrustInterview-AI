from pathlib import Path
root = Path(__file__).resolve().parents[1]
paper = root / 'paper/TrustInterview_IEEE_working.tex'
text = paper.read_text(encoding='utf-8')
anchor = '\\subsection{Metrics}'
section = r'''\subsection{Prepared Synthetic Annotation Pilot}

A versioned pilot packet now contains twenty-four claim-grounding cases and twelve paired inputs, each with two variants. Grounding cases cover explicit agreement and contradiction, missing evidence, paraphrases, aliases, conflicting statements, quantities, dates, duration, competence inference, reported speech and instruction-like source content. Claim origin is recorded to distinguish candidate--resume inconsistency from unsupported model assertions. These examples are authored study material, not observed model outputs or independently labelled results. Annotators judge semantic support beyond the reference checker's controlled grammar so that its coverage limitations can be measured rather than excluded from the task.

The paired inputs cover three synthetic junior technical roles and four controlled signals: pronouns, age, marital status and disclosed disability. Within each pair, only the declared signal changes; the job, technical evidence and answer remain identical. These choices require faculty review before a larger study, and do not represent the demographic distribution of an applicant population. Automated packet validation checks twelve complete pairs, forty-eight unique case identifiers, matching technical content, file hashes and two differently ordered blank annotation packets. Pair identifiers, author categories and predictions are excluded from the annotator packets. The written guide defines source-relative labels, evidence spans, ambiguity handling, independent annotation and third-reviewer adjudication. Input-comparability annotation is kept separate from later output-fairness measurement.

No human annotations, adjudications or live model responses have been collected for this packet; consequently it supports no accuracy, discrimination or fairness estimate. It is a procedure pilot and will be excluded from the final held-out test set. Final collection requires independent reviewers, an agreed job rubric, reviewed attribute choices and a powered sample-size design. Extraction coverage, model-origin grounding, candidate-origin inconsistency and demographic differences in release, abstention and review burden must be reported separately. Missing extractions cannot be counted as successful verification, and equality under the fixed keyword scorer is not sufficient evidence of fairness.

'''
assert text.count(anchor) == 1
paper.write_text(text.replace(anchor, section + anchor, 1), encoding='utf-8')
