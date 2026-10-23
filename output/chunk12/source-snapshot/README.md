# Research reference service: ZTA, output grounding, and bias review

This service implements the paper's dual-policy reference workflow. The root and backend `npm start` commands now select it, and the default React application uses its candidate/reviewer endpoints. The original App is preserved as `frontend/src/LegacyApp.js`; it is not mounted by the default interface. The historical Express API, OAuth flow, resume uploads and detectors have **not** been retrofitted. The optional backend `start:legacy` command runs that older API and is outside this control boundary.

## What is implemented

Access assurance uses preprovisioned candidate/reviewer identities, tenant binding, opaque expiring sessions, server-side revocation, exact HTTP routes and methods, resource ownership, and independent role checks. Login has a per-peer limit of ten attempts per minute. Role, tenant, and assessment owner cannot be submitted as mutable request fields. Sessions are bearer credentials, so token theft remains a risk.

The server creates assessments and derives a bounded score from its own fixed keyword rubric. Client scores and model scores are rejected. This is a reproducible test scorer, **not a validated measure of interview performance**. One answer is accepted per assessment; an immediate state transition prevents concurrent replacement. Scores are withheld while an output is under review or has abstained.

Output assurance requires a strict structured result containing one to ten observations. Every observation must cite a known evidence identifier and contain an exact, nonempty quote from that evidence. Unsupported observations and malformed output cause abstention. This enforces provenance but cannot establish factual truth, semantic correctness, completeness, or unbiased selection of quotations. A provider could select a misleading but literal substring. The only recommendations permitted are `practice` and `continue`.

Word-boundary patterns route selected sensitive references and instruction-like quotations to human review. They are conservative routing heuristics, **not a discrimination classifier**. An authorized reviewer from the same tenant can inspect evidence and approve or reject a held output with a recorded reason. Unsupported grounding cannot be overridden through this endpoint. Review decisions themselves still require an evaluation of consistency and fairness.

Provider exceptions, timeouts, and sessions revoked/expired during evaluation cause abstention. No default zero score is released. The timeout bounds waiting but does not cancel provider work or stop a CPU-blocking adapter; live adapters need cancellation and resource isolation. There is no regeneration loop in this version.

Validated output cache entries bind tenant, candidate, session, assessment, answer, rubric, provider, and policy version. Entries are removed on logout. This version writes entries but does **not** reuse them; cache-hit performance and expiration eviction are not implemented or claimed.

Correlated audit events record access/output outcomes without raw credentials, answers, or reviewer reasons. A SHA-256 chain detects modifications to retained records. It is not signed, independently anchored, or immutable: an actor who controls storage can rewrite the chain or truncate its tail. Audit append failure prevents a successful HTTP response. The default API now stores assessments, answer evidence, scores, review reasons and audit events in SQLite. Assessment transitions and their audit events commit in one transaction, with version checks against stale updates. Sessions and cache entries remain volatile and all old sessions become invalid after restart. The database contains plaintext synthetic evidence; storage encryption, backup/restore validation, workload limits and a production retention policy are not implemented.

The single-process store uses exclusive SQLite ownership, rollback journaling and full synchronous commits. A second instance cannot open the active database. On restart, a committed `evaluating` state becomes `abstained`, with a recovery audit event and no released score. The tests include an abrupt process exit with an uncommitted fake release. This is a software-crash check, not a hardware power-loss certification. The in-memory adapter remains available for isolated tests and component benchmarking.

## Run and verify

Node 22.20.0 or later is required. Run `rtk proxy npm ci --ignore-scripts` in this research directory to install the locked Google authentication dependency. Local credentials and SQLite do not use it, but provider verification and its tests do. The built-in SQLite API is experimental in the tested runtime, as documented in the [Node 22.20.0 SQLite documentation](https://nodejs.org/download/release/v22.20.0/docs/api/sqlite.html). Lock ownership follows the [SQLite locking-mode documentation](https://www.sqlite.org/pragma.html#pragma_locking_mode). From the workspace root:

```powershell
rtk proxy node --test TrustInterview-AI/backend/research/test/controls.test.cjs
rtk proxy node --test TrustInterview-AI/backend/research/test/persistence.test.cjs TrustInterview-AI/backend/research/test/http-persistence.test.cjs
rtk proxy node --test TrustInterview-AI/backend/research/test/google-identity.test.cjs
rtk proxy node TrustInterview-AI/backend/research/evaluate.cjs
```

The second command writes raw records and a source-hash manifest to `output/current-evaluation`. The original Chunk 8 results and exact source snapshot remain frozen separately. Expected fixture decisions are hand-authored specifications, not independently annotated ground truth. The runner makes no live model calls.

For a local faculty demonstration, run `rtk proxy node TrustInterview-AI/backend/research/setup-local.cjs` once from the workspace root. It provisions a candidate and reviewer with random credentials in the ignored `backend/research/local/principals.json`. It does not print or overwrite credentials. Open that file locally to obtain each sign-in credential. From `TrustInterview-AI`, run `rtk proxy npm start`; from `TrustInterview-AI/frontend`, run `rtk proxy npm start` in another terminal. The frontend development proxy forwards `/api/research` to port 5001. The candidate creates an assessment and submits an answer; the reviewer uses the displayed assessment ID to inspect flagged feedback. After review, the candidate refreshes the result.

For separately provisioned identities, set `RESEARCH_PRINCIPALS_FILE` or `RESEARCH_PRINCIPALS` to a JSON array with exactly `id`, `tenant`, `role`, and `credential`. Roles are `candidate` or `reviewer`; use a unique cryptographically random credential of at least 32 bytes for each identity. `RESEARCH_DATABASE_FILE` selects the private database; its default is the ignored `local/assessments.sqlite`. The former `RESEARCH_AUDIT_FILE` option is rejected with a migration message. Old JSONL logs are preserved and are not imported into the new audit chain. On Windows, file-mode flags do not substitute for reviewing filesystem ACLs. There are no default credentials or anonymous session issuers. The service listens on `127.0.0.1:5001`; `RESEARCH_PORT` can change the port, but the frontend proxy must match. Its bundled provider simply quotes supplied answers and is a fixture, not an LLM. Never place actual credentials in the repository, shell history, evaluation files, or paper.

All paths below have the `/api/research` prefix. Health is also under this prefix. The service provides no cross-origin browser API; development uses the same-origin proxy, and a deployment would need the frontend and API served through a shared origin.

| Method and path | Required identity | Purpose |
| --- | --- | --- |
| `GET /health` | None | Minimal liveness response |
| `POST /session` | Provisioned credential in JSON | Issue opaque session |
| `DELETE /session` | Bearer session | Revoke current session |
| `POST /assessments` | Candidate; empty JSON object | Create server-owned assessment |
| `POST /assessments/{id}/answer` | Owning candidate | Submit JSON `answer` only |
| `GET /assessments/{id}` | Owning candidate | Read state and released result |
| `GET /reviews/{id}` | Same-tenant reviewer | Inspect pending output and evidence |
| `POST /reviews/{id}` | Same-tenant reviewer | JSON `decision` and reason |

## What must precede a research efficacy claim

The candidate/reviewer reference workflow and single-process transactional persistence are implemented. A Google authorization-code adapter now verifies assertions with Google's SDK and enforces browser state, nonce and provisioned subject bindings. Its verification tests use locally signed assertions; a real configured Google sign-in has not been performed. Resume evidence handling, validated scoring and a live model adapter remain incomplete. Freeze the release and rubric, collect independent human annotations and demographic counterfactuals, and run the preregistered security/output/fairness/latency experiments. A passing unit test is not a detection-rate or fairness result.

## Google identity mode

The adapter follows the [Google OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect) using the installed `google-auth-library` 11.2.0. The lock file records the dependency versions. The SDK exchanges the authorization code and verifies token signatures, issuer, audience and time claims. The adapter additionally pins RS256 headers, rejects token-directed key URLs, checks nonce, authorized party, verified email and transaction age, and maps the verified `sub` to a server-provisioned tenant, identity and role. It does not assign roles from browser data, token role claims, names or email domains, and it does not auto-enrol unknown subjects.

An expiring, one-use state is bound to an HttpOnly browser cookie. Authorization requests carry an S256 PKCE challenge; code exchange uses the retained verifier. The callback creates a one-use, sixty-second handoff in an HttpOnly cookie and redirects to the fixed frontend origin without a bearer token in the URL. The frontend redeems it through a JSON POST whose Origin must exactly match the configured frontend. Cookies use Secure for HTTPS configurations; HTTP is permitted only for loopback development. Provider state and handoffs are volatile and invalidated on service restart. Timeout bounds waiting but does not cancel SDK work.

To configure a real login, obtain a Google **web application** OAuth client and register the exact callback URI. Copy `google-config.example.json` to the ignored `local/google-config.json`; fill in the client ID/secret and administrator-verified Google subjects and role bindings locally. Do not paste secrets into chat or commit the private file. The frontend origin and callback origin must match; development uses the frontend's `/api/research` proxy. Set `RESEARCH_AUTH_MODE=google` and `RESEARCH_GOOGLE_CONFIG_FILE` to the private file before starting the backend. Missing/invalid Google configuration is a startup error; there is no automatic demo or mock fallback. In Google mode, the credential session-issuance route is disabled. `RESEARCH_AUTH_MODE=local` retains the explicitly labelled faculty-demo credentials.

The identity tests execute real RSA signature verification through the installed SDK with a local test public key substituted for network certificate retrieval. Token exchange is a fixture. They cover wrong signatures, issuer/audience/nonce, expiry, browser binding, replay, unknown subjects, Origin, provider failures and the integrated HTTP handoff. These are protocol-boundary checks, not proof of a successful real Google account login, institutional identity assurance, MFA, provider revocation monitoring or production session security.
