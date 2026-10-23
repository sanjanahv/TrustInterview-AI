"""Reconcile the legacy framing with the retained preliminary evidence."""
from pathlib import Path
import re

paper = Path('paper/TrustInterview_IEEE_working.tex')
source = paper.read_text(encoding='utf-8')
archive = Path('paper/archive/TrustInterview_IEEE_before_claim_reconciliation.tex')
archive.parent.mkdir(parents=True, exist_ok=True)
if not archive.exists():
    archive.write_text(source, encoding='utf-8')

def replace_block(text, start, end, replacement):
    left = text.index(start)
    right = text.index(end, left)
    return text[:left] + replacement.strip() + '\n\n' + text[right:]

source = source.replace(
    r'\title{Zero Trust Architecture with Real-Time Bias Detection and Hallucination Prevention in AI-Powered Interview Systems}',
    r'\title{Zero Trust Architecture with Bias Risk and Grounding Controls for AI Interview Systems}')
source = replace_block(source, r'\begin{abstract}', r'\end{abstract}', r'''
\begin{abstract}
AI-assisted interviews require controls over both access to candidate resources and the release of model-generated assessments. This paper presents TrustInterview AI, a Zero Trust Architecture that separates access assurance from AI output assurance. Access decisions depend on identity, role, tenant, resource ownership and session context; output decisions depend on bias-risk evidence, grounding, provenance and control health. The architecture permits release, review and abstention rather than treating every uncertain output as valid or false. We distinguish the proposed architecture from the historical prototype through a code-to-requirement traceability analysis. A separate executable reference service implements selected access and output controls, with a narrow server-owned keyword rubric and strict evidence-quote validation. Seventeen automated control tests passed, and fourteen output-contract fixtures matched their specified decisions. These preliminary checks establish selected implementation invariants, not demographic fairness or hallucination detection accuracy. Component timings exclude model inference and deployment costs. An evaluation protocol specifies independent annotation, paired counterfactuals, adversarial workflows and system ablations. Live-model efficacy and integration with the original application remain unvalidated.
''')
source = replace_block(source, r'\begin{IEEEkeywords}', r'\end{IEEEkeywords}', r'''
\begin{IEEEkeywords}
Zero Trust Architecture, output assurance, bias risk, source grounding, AI-assisted interviews, policy enforcement
''')
source = replace_block(source, r'\section{Introduction}', r'\section{Related Work}', r'''
\section{Introduction}

An AI interview workflow transfers information across several boundaries: a candidate submits evidence, an application retrieves assessment resources, a model produces feedback, and a recruiter receives an evaluation. An authenticated request can still address another candidate's resource, while a correctly authorized model call can still produce unsupported or discriminatory content. These failure modes require separate decisions about access and output release.

Research on language-model hiring decisions documents sensitivity to demographic signals and candidate names~\cite{an2024discriminate,nghiem2024name}. Hallucination research also distinguishes generated claims from the evidence needed to support them~\cite{zhang2025sirens}. In an interview, an unsupported model statement about a candidate is different from an inconsistency in a candidate's own answer. Prompt injection introduces a further risk: candidate-supplied text may attempt to influence the workflow rather than merely describe qualifications~\cite{baxi2026prompt}. Combining these concerns under a single detector score obscures which boundary failed and what action should follow.

\subsection{Research Objective}

This work investigates how Zero Trust Architecture can govern an AI interview workflow while incorporating bias-risk and grounding controls. NIST SP 800-207 provides the access-control foundation~\cite{rose2020zero}; the proposed output-assurance plane is an application-level extension. Model output is treated as untrusted input to an enforcement decision, without describing the model as an intentional attacker. The objective is to make release conditions explicit, enforceable and auditable, rather than claim that access security alone establishes fairness.

\subsection{Architectural Approach}

The access-assurance plane evaluates identity, role, tenant, resource ownership and session context. The output-assurance plane evaluates the artifact to be released, including bias-risk evidence, source support, instruction-like content, provenance and control availability. Their decisions are coupled at workflow transitions: permission to invoke an assessment does not automatically permit release of its result. Unsupported or uncertain output can be withheld for review or lead to abstention. A candidate-provided resume supplies evidence for source-grounding checks, but does not independently prove the truth of a qualification.

\subsection{Contributions and Evidence Boundary}

The contributions are:
\begin{enumerate}
\item A dual-policy architecture and threat model connecting resource access with bias-risk and grounding decisions in an AI interview workflow.
\item A traceability analysis separating the historical prototype's implemented, partial, missing and simulated controls, together with an executable reference service for selected enforcement invariants.
\item A reproducible preliminary verification artifact and an evaluation protocol for security, output support, demographic counterfactuals and operational cost.
\end{enumerate}

The preliminary service uses a fixed keyword rubric and an offline provider fixture. It is separate from the original application and does not establish the efficacy of a deployed language-model interview system. The historical prototype's thirteen named modules provide implementation context; their count is not treated as evidence of architectural novelty or independent protection.

\subsection{Paper Organization}

Section II reviews related work. Section III defines terminology and the threat model. Section IV presents the dual-policy architecture. Section V traces implementation requirements to the reviewed prototype. Section VI specifies the evaluation protocol and reports limited reference-service checks. Sections VII and VIII discuss limitations and conclusions.
''')
source = replace_block(source, r'\section{Discussion}', r'\section{Conclusion}', r'''
\section{Discussion}

\subsection{What the Preliminary Evidence Establishes}

The reference-service checks demonstrate selected transitions between access authorization and output release. Tenant and ownership checks restrict assessment access, while malformed or unsupported feedback is withheld. Client-submitted scores cannot change the server-owned rubric result. These are concrete enforcement properties for the tested implementation and inputs; passing tests does not establish resistance to all attacks.

The output fixtures distinguish useful constraints from broader claims. Exact evidence quotations provide a checkable provenance requirement, but a quotation can reproduce a false candidate statement or selectively omit relevant context. Sensitive-attribute patterns can route an output to review, but their presence does not prove discrimination and their absence does not prove fairness. The reference service therefore offers a constrained release boundary rather than a general hallucination or bias detector. The NIST generative AI risk profile provides a broader risk-management context for evaluating these residual concerns~\cite{nist2024genai}.

\subsection{Implementation and Evaluation Limitations}

The original API and interface remain outside the new reference boundary. The reference service uses provisioned credentials, volatile assessment state, an offline provider and a narrow keyword scorer. Its hash-chain audit detects changes to retained records but lacks external anchoring; a storage administrator could rewrite the chain or truncate its tail. Cache entries are isolated by context, but cache reuse and eviction have not been implemented. Provider timeouts bound waiting without cancelling computation. These limitations prevent a production-readiness claim.

The seventeen tests and fourteen policy fixtures were selected by the implementer. No independently annotated discrimination or semantic-grounding corpus was used, and no live-model calls were made. The eight counterfactual strings exercise the fixed scorer rather than a learned assessment model. The component microbenchmark excludes network transport, persistence, inference, review and concurrency, so it cannot establish deployment latency or throughput. Larger samples alone would not resolve these construct-validity limitations; the study needs the independently labelled tasks and integrated workflow described in the evaluation protocol.

\subsection{Human Review and Governance}

Human review is an authorized workflow state, not an automatic remedy for model bias. Review consistency, evidence access, disagreement and override reasons require evaluation alongside model outcomes. Audit records can support investigation of a decision, but recording a policy outcome does not establish legal compliance or prove that a hiring decision was nondiscriminatory. This work makes no GDPR or FCRA compliance claim. Institutional review and context-specific governance remain prerequisites for any later study involving actual applicants.

\subsection{Next Research Steps}

The next implementation step is integration with verified identity and transactional assessment storage, followed by a versioned live-model adapter and a frozen release. The empirical study should then measure ownership violations, injected workflow changes, source-supported and unsupported claims, paired demographic outcomes and reviewer decisions. Each result must retain failures, abstentions and overrides. Semantic grounding and context-aware bias assessment can be compared with the current structural checks through the planned ablations. Video, biometric inference and model training are outside this paper's scope.
''')
source = replace_block(source, r'\section{Conclusion}', r'\section*{Acknowledgment}', r'''
\section{Conclusion}

TrustInterview AI proposes a Zero Trust Architecture in which access assurance and AI output assurance enforce separate policies at interview-workflow boundaries. Bias-risk and grounding evidence inform release, review or abstention decisions rather than being presented as guarantees of fairness or factual truth. A prototype traceability analysis identifies enforcement gaps, and an isolated reference service provides reproducible preliminary checks of selected controls. Seventeen automated tests passed and fourteen contract fixtures matched their specifications, while known coverage limitations remain visible. These results support a limited implementation demonstration. Integration, independent annotation and live-model experiments are required before drawing conclusions about hiring fairness, hallucination reduction or operational performance.
''')
for key in ['garcia2024compliance', 'thompson2023fcra', 'wilson2023explainable']:
    source = re.sub(r'\\bibitem\{' + key + r'\}.*?(?=\\bibitem\{|\\end\{thebibliography\})', '', source, flags=re.S)
source = source.replace(
    '%  DRAFT WARNING: Abstract, Introduction, Discussion and Conclusion retain\n%  legacy claims pending reconciliation. Do not submit this draft as final.',
    '%  DRAFT STATUS: Claims reconciled with preliminary artifacts.\n%  Full efficacy study and compiled IEEE layout verification remain pending.')
source = source.replace('%  Zero Trust Architecture with Real-Time Bias Detection and\n%  Hallucination Prevention in AI-Powered Interview Systems',
                        '%  Zero Trust Architecture with Bias Risk and Grounding Controls\n%  for AI Interview Systems')
source = source.replace(r'\begin{thebibliography}{10}', r'\begin{thebibliography}{99}')
paper.write_text(source, encoding='utf-8')
print('Reconciled title, abstract, introduction, discussion, conclusion and bibliography.')
