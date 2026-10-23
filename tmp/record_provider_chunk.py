from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'output/chunk17'
out.mkdir(parents=True, exist_ok=True)
script = (root / 'output/chunk14/run_verification.cjs').read_text(encoding='utf-8')
script = script.replace("'claim-grounding.test.cjs'];", "'claim-grounding.test.cjs', 'model-provider.test.cjs', 'experiment.test.cjs'];")
script = script.replace("const files = ['claim-grounding.cjs'", "const files = ['model-provider.cjs', 'model-config.example.json', 'evaluation/run-experiment.cjs', 'claim-grounding.cjs'")
script = script.replace('summary.tests !== 58', 'summary.tests !== 69').replace('summary.passed !== 58', 'summary.passed !== 69')
(out / 'run_verification.cjs').write_text(script, encoding='utf-8')
(out / 'verify_frontend.cjs').write_text((root / 'output/chunk14/verify_frontend.cjs').read_text(encoding='utf-8'), encoding='utf-8')
paper = root / 'paper/TrustInterview_IEEE_working.tex'
text = paper.read_text(encoding='utf-8')
anchor = '\\subsection{Metrics}'
section = r'''\subsection{Controlled Provider Adapter and Output Runner}

The reference workflow subsequently adds an optional Gemini REST adapter behind explicit server-side configuration. The endpoint is fixed, credentials remain outside prompts and retained artifacts, and only bounded answer, question and optional resume text are transmitted. Requests use a constrained JSON schema and permit no tool invocation. A timeout aborts the request; provider errors, blocked or incomplete responses, malformed JSON and oversized responses fail closed without automatic retries or an offline fallback. The application's existing output PEP still rejects fabricated quotations and unexpected score fields. The default remains an offline fixture, and the interface identifies the configured feedback mode. This optional adapter has been exercised with transport fixtures, not a live provider, so provider interoperability and live-output behaviour remain unverified.

A sequential experiment runner supports a bounded, seeded randomized plan and requires a new output directory for each run. It retains case-bound hashes, template hashes, model and decoding metadata, request identifiers, response or sanitized error artifacts, output decisions and explicit failure records. Grounding predictions and paired records are exported separately for the annotation importer. The live grounding task requests source-relative labels with exact source quotations; local validation checks their structural provenance, not the semantic correctness of the labels. The paired task executes the controlled assessment workflow with its fixed ZTA question and keyword rubric; job text does not alter this rubric. Thus, the runner can inspect feedback-release and review disparities but cannot establish hiring-score fairness.

Eleven additional provider and runner tests pass, bringing backend verification to sixty-nine tests. A smoke run over the forty-eight synthetic pilot cases retains forty-eight offline records and zero live model calls. These records test the recording protocol and constrained baseline, not efficacy. Human annotations remain incomplete, so no prediction-to-gold analysis is performed. For successful bounded responses, local artifacts retain the response envelope; rejected or failed requests retain sanitized diagnostics rather than unbounded remote error bodies. No real candidate data were transmitted and no live sign-in or model experiment is claimed.

'''
assert text.count(anchor) == 1
paper.write_text(text.replace(anchor, section + anchor, 1), encoding='utf-8')
readme = root / 'TrustInterview-AI/backend/research/README.md'
with readme.open('a', encoding='utf-8') as f:
    f.write('\n## Optional Gemini adapter and runner\n\nDefault feedback remains offline. Set `RESEARCH_PROVIDER_MODE=gemini` and `RESEARCH_MODEL_CONFIG_FILE` to a private local JSON file following `model-config.example.json` to select live feedback. Choose a model available to your account; the example deliberately contains placeholders. Keep private configuration inside ignored `local/`. Invalid live configuration fails startup; there is no offline fallback. Requests use a fixed Google endpoint, API key header, bounded untrusted evidence, JSON response schema, timeout cancellation and local output enforcement. No retries or tool calls. Do not use real applicant data in pilot experiments. Provider interoperability has not yet been verified live.\n\n`evaluation/run-experiment.cjs` supports explicit offline or Gemini mode, a new output directory, seeded order, up to 1000 total case-run records and at most ten repetitions. It writes raw successful envelopes or sanitized failure diagnostics, source hashes, metadata, policy decisions, and separate grounding/paired exports. See `output/chunk17/Provider_Runner_Guide.md` in the workspace for usage and limitations. Paired runs retain the fixed ZTA question and keyword score; they do not evaluate general hiring competence. Live grounding labels are untrusted predictions, not ground truth.\n')
