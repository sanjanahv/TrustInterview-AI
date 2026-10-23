# Controlled provider and experiment runner

The default application remains offline. An optional Gemini adapter is now implemented using the [official REST structured-output format](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en), checked on 11 October 2026. Live interoperability has not been tested. Model availability must be confirmed in the account used for the experiment; no current model is silently assumed.

## Local configuration

Copy `TrustInterview-AI/backend/research/model-config.example.json` into the ignored `local/` directory and replace placeholders locally. Do not put a key in the paper, chat, repository, CLI arguments or output directory. The file has exactly `model`, `apiKey`, `timeoutMs`, `maxOutputTokens` and `temperature`. Supported ranges are enforced. The adapter fixes the HTTPS Google endpoint and puts the key only in a request header. It sends no provisioned identity, role, tenant or session credentials.

For application feedback, set `RESEARCH_PROVIDER_MODE=gemini` and `RESEARCH_MODEL_CONFIG_FILE` to that private file before starting the controlled backend. Offline mode is the default. Invalid mode or missing live configuration fails startup. The UI displays the configured mode. The model returns constrained quotations and a practice recommendation; the server keeps its existing ownership checks, score rubric and output-release policy. Timeout cancellation and provider errors cause abstention. No provider error causes an automatic offline result.

The API persists assessment evidence and released/held results; it does not persist full provider response envelopes. Full successful response artifacts are retained by the experiment runner. Failed HTTP responses and rejected output bodies are represented by sanitized diagnostics, not unlimited remote error bodies. No retry or tool invocation is used. No real resume data should be sent during this synthetic pilot.

## Run the pilot protocol

From the workspace root, an offline recording check is:

```powershell
rtk proxy node TrustInterview-AI/backend/research/evaluation/run-experiment.cjs --cases output/chunk15/pilot-cases.json --out output/chunk17/NEW_OFFLINE_RUN --mode offline --repeats 1 --seed 20261011
```

For a later live experiment, choose `--mode gemini --config PATH_TO_PRIVATE_CONFIG` and a fresh output directory. That invocation makes external model requests and can incur account charges. No live invocation was run in this chunk. Use only the reviewed synthetic corpus until the study protocol permits other data. The runner accepts at most 1000 case-run records and ten repetitions. It is sequential, makes no retries and does not implement concurrency/load measurement. A directory that already exists is rejected.

Each run records the randomized plan and original input cases before processing. Successful bounded response envelopes or sanitized error diagnostics are saved before each JSONL record. Records include case and prompt-template hashes, request ID, model/provider, returned model version when available, decoding settings, token usage when supplied, duration, status, release decision and raw artifact hash/reference. The run manifest remains `running` if recording is interrupted; partial runs are not complete studies. This filesystem recorder is not a transactional store and does not promise crash-safe fsync or power-loss recovery.

`grounding-predictions.json` and `paired-runs.json` can later be passed to the annotation importer. The offline grounding baseline is the controlled-language checker; no matching claim is an extraction failure. Live grounding requests source-relative semantic labels and exact resume quotations, but quote existence does not validate the label. Independent human labels are still required. The paired task goes through `ResearchService` authorization, attachment and release checks using synthetic provisioned credentials. It retains the fixed ZTA question and answer-only keyword score. Job text does not change the assessment question or score. Consequently, model-driven hiring scores, candidate ranking and general job fairness are not measured. Hold/abstain/release disparities and source-selection differences can be studied within this limited workflow.

The example smoke run is `offline-smoke/`: 48 complete records, explicitly offline, zero live model calls. No human labels, accuracy, fairness or end-to-end deployment latency results are reported. Component-level prompt instructions are defense in depth; tests and the output PEP, rather than prompt compliance alone, define the supported release guarantees.
