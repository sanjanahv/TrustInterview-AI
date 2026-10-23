# Chunk 8: preliminary executable evaluation

Run recorded at **2026-10-10T15:39:30.095Z**. Source identity is the base commit plus the file hashes in `evaluation-summary.json`; the new research directory has not been committed.

| Check | Observed outcome | What it supports |
| --- | --- | --- |
| Automated controls | 17 passed, 0 failed | Selected access/output/state invariants; includes loopback HTTP integration |
| Output-contract fixtures | 14 matched specified decisions | Structural contract conformance; not detection accuracy |
| Name/gender smoke variants | 8 variants, identical keyword score | Stability of this fixed scorer on these strings; not demographic fairness |
| Component microbenchmark | 1000 iterations per configuration, 4000 retained records | Local synchronous component timings; not application latency |
| Live model calls | 0 | No model efficacy conclusions are available |
| Independent annotations | None | No bias/hallucination precision, recall, or fairness gap can be reported |

All results remain focused on the ZTA access boundary and its integrated output assurance boundary. The fixtures deliberately retain examples that pass despite a possible factual falsehood, indirect instruction, or uncovered demographic attribute.

## Component timings

Node v22.20.0, Windows x64, Intel Core i5-1155G7; single process, concurrency one, 50 warm-up rounds, seeded randomized order. Each row has 1000 observations. Values are milliseconds, rounded to four decimals.

| Configuration | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| C0: keyword score | 0.0013 | 0.0027 | 0.0053 |
| C1: access checks + score | 0.0052 | 0.0116 | 0.0283 |
| C2: output contract + score | 0.0029 | 0.0065 | 0.0240 |
| C3: both + in-memory audit | 0.0160 | 0.0386 | 0.1458 |

These configurations are component analogues of the paper's proposed C0--C3 study, not deployed system ablations. No model call, HTTP transport, disk write, human review, throughput, or concurrency measurement is included. The figures must not be compared directly with the manuscript's previous 94 ms or model latency claims.

## Evidence files

- `control-tests.xml`: actual Node test output.
- `evaluation-summary.json`: environment, source hashes, protocol settings and summaries.
- `output-contract-records.json`: all inputs, expected policy decisions, actual decisions and reasons.
- `counterfactual-smoke-records.json`: all eight synthetic scoring variants.
- `latency-records.jsonl`: all 4000 raw component timings.

The IEEE working source contains a preliminary reference-service verification subsection. During Chunk 9, its title, abstract, introduction, discussion and conclusion were reconciled with the retained evidence, and unsupported legacy claims were removed. The pre-reconciliation source is preserved in `paper/archive`. There is no installed LaTeX compiler, so only source consistency has been checked. If the benchmark is rerun, regenerate this timing table and the corresponding LaTeX table from the new JSON rather than retaining these values.

## Next evidence required

Integrate the reference boundary with the original application, freeze a release, connect a live provider, collect the independently labelled corpus described in the evaluation protocol, and execute paired fairness, semantic grounding, adversarial workflow, and deployment latency experiments. Human review should include agreement and override consistency. The present artifacts support a preliminary implementation demonstration, not a completed efficacy study.
