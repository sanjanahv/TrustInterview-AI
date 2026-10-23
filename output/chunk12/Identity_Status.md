# Chunk 12: Google identity adapter

Implemented a provider sign-in adapter in the controlled API and connected the React sign-in screen. The historical Passport/mock-login workflow remains outside this boundary.

The adapter uses `google-auth-library` 11.2.0 for code exchange and ID-token verification. It additionally checks browser-bound one-use state, nonce, expected signing header, authorized party, verified-email flag, transaction age and a server-provisioned Google subject binding. A verified subject grants only its configured tenant and candidate/reviewer role. Browser roles, token role fields, account names and email domains do not determine authorization.

Authorization includes an S256 PKCE challenge and code exchange carries the retained verifier. The callback issues a short-lived HttpOnly handoff, then redirects to a fixed frontend origin. Application bearer tokens are not placed in redirect URLs. Handoff redemption checks the exact Origin and permits one use. Provider mode disables local credential issuance and does not fall back to mock identities on error or absent configuration. Local mode remains explicitly available for faculty demonstrations.

## Verification retained

**42 backend tests and four interface tests passed. The frontend production build succeeded.** The backend total comprises the prior 27 control/persistence tests and 15 provider-boundary tests.

The new tests verify actual RSA signatures using the installed Google SDK. A locally generated test public key replaces network certificate retrieval, and authorization-code exchange is a fixture. Negative cases include wrong signatures, issuer, audience, nonce, authorized party, expiry, browser cookie, replay, unassigned subject, Origin and provider failure. An HTTP test exercises provider mode from start through callback and session redemption while confirming that demo login is disabled.

`backend-verification.xml`, `frontend-tests.txt` and `frontend-build.txt` retain actual results. `verification-summary.json` records the dependency version, source hashes and **zero live Google logins**. Backend and frontend source snapshots are retained separately. The original Chunk 8 benchmark is still preserved and is not evidence of OAuth latency.

## Live configuration still required

No real Google sign-in was performed. It requires a Google OAuth **web application** client, the exact registered redirect URI, and administrator-provisioned provider subjects. A verified account is not automatically enrolled or assigned a role.

Copy `backend/research/google-config.example.json` into the ignored `backend/research/local/google-config.json`. Fill in the client ID, client secret and account bindings privately. Use the exact frontend origin and callback origin; the development callback is `http://localhost:3000/api/research/oauth/google/callback`, served through the frontend proxy. Set `RESEARCH_AUTH_MODE=google` and `RESEARCH_GOOGLE_CONFIG_FILE` to that local file before starting the backend. Do not put the secret into chat, the paper, result logs or tracked files. See the research README for dependency installation and deployment assumptions.

The SDK and protocol fixtures have not established real-provider interoperability, key rotation behavior, consent behavior, MFA assurance, revocation handling or institutional identity assurance. Provider waiting is bounded by a timeout, but SDK work is not cancelled. The assessment provider remains an offline quote fixture, and its keyword scorer is not a validated competence measure.

The paper now reports the adapter separately from live-provider validation. The next independent work is resume evidence integration; a configured Google account test remains pending.

Primary implementation reference: [Google OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect).
