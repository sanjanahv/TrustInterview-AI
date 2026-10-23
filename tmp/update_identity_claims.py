from pathlib import Path
paper = Path('paper/TrustInterview_IEEE_working.tex')
source = paper.read_text(encoding='utf-8')
section = r'''
\subsection{Provider Identity Adapter and Verification Scope}

A subsequent release adds a Google OpenID Connect authorization-code adapter following the provider's documented server flow~\cite{google_oidc}. Google's authentication library verifies the token signature and provider claims. The application additionally checks a browser-bound, expiring one-use state, nonce, authorized party, verified-email flag and transaction age. Authorization uses a provisioned provider subject mapped to a server-held tenant, identity and role. Neither a browser role field nor an email-domain match grants reviewer access. An S256 code challenge is supplied during authorization and its retained verifier accompanies code exchange.

The callback creates a short-lived, one-use HttpOnly handoff cookie and redirects to a fixed frontend origin without placing an application bearer token in the URL. The interface redeems the handoff through an origin-checked JSON request. In provider mode, local credential issuance is disabled, and absent provider configuration does not trigger a mock fallback. Sessions remain subject to the existing ownership, tenant and resource policies.

Fifteen added identity tests include actual RSA signature verification through the installed SDK using a local test key in place of fetched provider keys. They exercise invalid signatures, issuer and audience mismatch, nonce mismatch, expired assertions, browser binding, replay, unassigned subjects, provider failures and HTTP handoff. Combined with the prior suites, forty-two backend tests pass. Four interface tests pass and the frontend build succeeds. The token exchange and key retrieval are fixtures: no live Google sign-in has been performed. Provider configuration, account enrolment, consent, MFA assurance, revocation handling and deployment behavior remain unvalidated. These checks demonstrate selected protocol boundaries and do not establish institutional identity assurance or end-to-end provider interoperability.

'''
if r'\subsection{Provider Identity Adapter and Verification Scope}' not in source:
    source = source.replace(r'\section{Evaluation}', section + r'\section{Evaluation}', 1)
source = source.replace('The next implementation steps are verified external identity and resume-evidence integration, followed by a versioned live-model adapter and a frozen release.',
                        'The next steps are a configured live-provider identity test and resume-evidence integration, followed by a versioned live-model adapter and a frozen release.')
source = source.replace('The current reference service uses provisioned credentials, single-process SQLite assessment and audit storage, an offline provider and a narrow keyword scorer.',
                        'The current reference service offers explicitly separate local-demo and Google-provider authentication modes, single-process SQLite assessment and audit storage, an offline assessment provider and a narrow keyword scorer. Provider verification has been tested with signed fixtures, but not a live Google account.')
bib = r'''
\bibitem{google_oidc}
Google,
``OpenID Connect,''
Google Identity documentation. [Online]. Available: https://developers.google.com/identity/openid-connect/openid-connect. Accessed: Oct. 11, 2026.

'''
if r'\bibitem{google_oidc}' not in source:
    source = source.replace(r'\end{thebibliography}', bib + r'\end{thebibliography}', 1)
paper.write_text(source, encoding='utf-8')
print('Identity adapter described with explicit signed-fixture and live-provider boundaries.')
