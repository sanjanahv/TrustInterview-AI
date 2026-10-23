from pathlib import Path
root = Path(__file__).resolve().parents[1]
paper = root / 'paper/TrustInterview_IEEE_working.tex'
text = paper.read_text(encoding='utf-8')
anchor = '\\subsection{Metrics}'
section = r'''\subsection{Annotation Ingestion and Pilot Analysis Tooling}

A standalone analysis tool now validates completed reviewer packets against the frozen case text and identifiers. It checks task-specific label sets, exact Unicode code-point evidence spans, completion timestamps and consistent, distinct reviewer identifiers. Disagreement and flagged ambiguity require an independently identified adjudicator before prediction analysis proceeds. Reviewer identifiers and file hashes cannot establish actual human independence or annotation quality; these remain study-procedure requirements. Agreement is reported separately by task, with raw agreement, Cohen's $\kappa$, label distributions, ambiguity counts and exact span-set agreement. Degenerate or empty agreement calculations remain explicitly undefined.

The prediction importer requires case-bound input hashes and declared model, prompt, policy, rubric and decoding metadata. Grounding analysis retains missing extractions and provider failures in the end-to-end denominator, reports extraction-conditional performance separately and stratifies candidate-origin and model-origin claims. Semantic undetermined labels remain distinct from operational abstention. Paired analysis preserves failed variants and unavailable scores, reports the direction of each contrast and separates completed-pair and scored-pair denominators. Repeated runs are accompanied by unique pair counts. The tool produces descriptive pilot summaries only; powered inference, confidence intervals, rank comparisons and selection-rate analysis are not implemented by this utility. Twelve artificial schema and arithmetic tests pass. Running it against the present packets yields zero completed annotations and a pending status, with agreement and efficacy metrics unset. No synthetic test labels are presented as study ground truth.

'''
assert text.count(anchor) == 1
paper.write_text(text.replace(anchor, section + anchor, 1), encoding='utf-8')
