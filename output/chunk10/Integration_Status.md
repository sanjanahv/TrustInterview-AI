# Chunk 10: controlled candidate/reviewer workflow

The default root and backend start commands now run the controlled research API on loopback port 5001. The existing React application uses `/api/research` through its development proxy. The historical App is preserved as `frontend/src/LegacyApp.js`, and the historical backend remains available only through the explicitly named backend `start:legacy` command.

The integrated workflow signs in with a provisioned credential, creates a server-owned assessment, submits only the answer, withholds held/abstained feedback and scores, and permits a same-tenant reviewer to inspect evidence and record a reasoned release decision. Sessions and credentials are held in browser memory rather than local/session storage. Server authorization remains authoritative.

Validation: 18 backend tests passed; two React workflow tests passed; the frontend production build compiled successfully. The added HTTP test exercises hold, unauthorized review denial, cross-tenant denial, authorized approval and candidate result release. Browser layout has not been visually inspected.

The original Chunk 8 evidence and its exact source files are preserved in `output/chunk8/source-snapshot`. New evaluator runs write `output/current-evaluation` so that they do not overwrite those historical results. The paper describes the integration separately from the earlier 17-test snapshot and component benchmark.

## Local demonstration

Random local candidate/reviewer credentials have been provisioned in `TrustInterview-AI/backend/research/local/principals.json`. This directory is excluded by the research directory's `.gitignore`. Credentials were not printed into results or committed. Keep the file private; the mode flags used during creation do not enforce Windows ACLs.

1. From `TrustInterview-AI`, run `rtk proxy npm start`.
2. From `TrustInterview-AI/frontend`, run `rtk proxy npm start` in a second terminal.
3. Open the local provisioning file and use the candidate credential to sign in.
4. Create an assessment and submit an answer. A phrase such as `gender identity` exercises the sensitive-reference review route; it is not evidence of discriminatory behavior.
5. Copy the displayed assessment ID, sign out, and sign in with the reviewer credential. Load the assessment and record an approval or rejection with a reason.
6. Sign in as the candidate and use `Existing assessment ID` to reopen the original assessment and see its release state. Ownership is checked by the server. Copy the ID before sign-out because the interface does not persist it.

The default service is not left running by this change. The local provisioning script refuses to overwrite existing credentials.

## Remaining scope

This integrates the constrained reference assessment workflow, not the original resume/OAuth workflow. Verified external identities, transactional persistence, resume extraction/evidence handling, validated semantic scoring and a live model adapter remain outstanding. The provider is still an offline quote fixture and the score is still a fixed keyword test rubric. No fairness, hallucination accuracy, deployment performance or production-readiness claim follows from these checks.
