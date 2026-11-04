# TrustInterview AI

TrustInterview AI is a research and engineering workspace for studying evidence-grounded AI interview assessment, hallucination controls, bias, reviewer oversight, and zero-trust architecture.

The repository preserves the implementation snapshots, verification artifacts, experiment records, and IEEE-style manuscript sources used to evaluate the prototype's claims.

## Research focus

- Grounding interview feedback in exact candidate evidence
- Withholding unsupported recommendations when no validated assessment rubric exists
- Detecting fabricated or unverifiable evidence
- Separating candidate, reviewer, and administrative access
- Testing persistence, identity, policy, and provider failure modes
- Documenting limitations around correctness, fairness, and model efficacy

## Repository guide

```text
paper/      IEEE manuscript sources, review notes, and verification scripts
output/     Versioned implementation snapshots and validation evidence
tmp/        Reproducibility inputs, review diffs, caches, and working artifacts
tools/      Pinned tooling used by the research workflow
*.pdf       Generated research reports and manuscript builds
```

Several `output/chunk*/source-snapshot/` directories contain frozen application snapshots used to reproduce specific findings. Their adjacent verification summaries describe the exact scope and commands for each research stage.

## Reproducing a reviewed snapshot

Choose the output chunk referenced by the relevant status report, then follow that chunk's README or verification summary. A typical Node.js snapshot can be inspected with:

```bash
cd output/<chunk>/source-snapshot
npm install
npm test
```

Use the commands recorded in that chunk's evidence files when they differ. The repository intentionally retains historical snapshots, so the newest-numbered directory is not automatically authoritative for every claim.

## Current limitations

This work does not establish that an AI system can determine candidate mastery, technical truth, employability, or demographic fairness. Exact quotations provide evidence of what was said, not proof that a statement is correct. Automated recommendations are withheld where a validated assessment rubric is unavailable.

## Research status

Research prototype and evidence archive. It is not a production hiring system and must not be used as the sole basis for employment decisions.
