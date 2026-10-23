# Zero Trust negative-case audit

Checked against the controlled `TrustInterview-AI/backend/research` service, policy `research-0.8`. The 91-case JUnit report is `backend-tests.xml`. These are authored software tests, not a measured attack-prevention rate.

| ID | Attempt or failure | Current observed outcome | Evidence and limit |
|---|---|---|---|
| Z1 | Unknown credential or unprovisioned subject requests a session. | Credential is denied; identity fixture rejects unprovisioned mapping. | `test/controls.test.cjs`, `test/google-identity.test.cjs`. Local assertion fixtures, not live Google login. |
| Z2 | Expired or revoked session accesses an assessment. | Authentication returns `invalid_session`. | `test/controls.test.cjs`, opaque-session test. Volatile sessions require new login after restart. |
| Z3 | Another candidate or tenant reads the owner's assessment. | `resource_not_found`; a reviewer in another tenant is also denied. | `test/controls.test.cjs`, tenant/ownership/role test; `test/persistence.test.cjs` after reopen. A copied *owner* token is a separate case. |
| Z4 | Candidate claims a reviewer role or supplies a score. | Schema/role denial; server computes the keyword fixture score. | `test/controls.test.cjs`, client-score/role test. The score is not a valid competence grade. |
| Z5 | Candidate replays or races a second answer. | `invalid_state`; committed answer is not overwritten. | `test/controls.test.cjs`, replay and concurrent-submission tests. |
| Z6 | Session is revoked while provider work is pending. | The completed provider result is withheld and assessment abstains. | `test/controls.test.cjs`, revocation-during-provider test. This is a controlled asynchronous fixture. |
| Z7 | Audit write fails or process exits during evaluation. | No partial scored release; restart recovery abstains interrupted work. | `test/controls.test.cjs` audit-failure test; `test/persistence.test.cjs` rollback/crash tests. Single-process SQLite result, not power-loss certification. |
| Z8 | A valid owner bearer token is copied before expiry. | **Residual exposure demonstrated:** the copy authenticates as owner and can view the owner's assessment until revocation. | `test/controls.test.cjs`, copied-live-bearer-token test. There is no device binding or proof-of-possession in this service. |

The denial tests show specified boundaries on tested inputs; they do not establish a probability of resisting unknown attacks. Z8 is an observed limitation, not a blocked attempt. Privileged backend/database compromise and a compromised browser remain outside the prototype's demonstrated protection. The audit hash chain can reveal some local alteration but has no external anchor and does not prevent privileged rewriting. These untested threats must not be counted as observed failures or successes.

Output assurance is a distinct plane: an authorized request can still produce misleading or technically false quoted content, and an indirect bias cue can pass the lexical screen (`output/chunk28/current-policy-probes.json`, P2 and P9). These are not access-control failures, but they explain why ZTA authorization alone cannot validate interview feedback.
