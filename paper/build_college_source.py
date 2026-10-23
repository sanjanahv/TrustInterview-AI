"""Assemble a reviewable college-scope IEEE source from the preserved faculty draft.

Every replacement must match once, so a changed input cannot silently produce a
partly revised manuscript. The previous source is never overwritten.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source = (root / 'paper/TrustInterview_IEEE_faculty.tex').read_text(encoding='utf-8')

def replace(old, new):
    global source
    if source.count(old) != 1:
        raise RuntimeError(f'expected one match, found {source.count(old)}: {old[:90]!r}')
    source = source.replace(old, new)

def between(start, end, new):
    global source
    a = source.find(start)
    b = source.find(end, a + len(start))
    if a < 0 or b < 0 or source.find(start, a + 1) >= 0:
        raise RuntimeError(f'bad section boundary: {start!r}')
    source = source[:a] + new + source[b:]

replace('% Faculty review draft; source and evidence frozen after layout verification.',
        '% College interview faculty review draft; implementation and claims audited Oct. 18, 2026.')
replace('Zero Trust Architecture with Bias Risk and Grounding Controls for AI Interview Systems',
        'Grounding and Bias-Risk Controls for a College Interview Bot with Zero Trust Access')
between('\\begin{abstract}\n', '\\end{abstract}', r'''\begin{abstract}
College interview bots must protect student assessments while preventing unsupported feedback and unequal review burden. We present TrustInterview AI as a controlled reference workflow with two decisions: server-side resource access and the release of evidence quotations. The access decision checks provisioned identity, role, scope, ownership and session validity. The output decision checks quotation provenance, a bounded source-relative claim grammar, selected bias-risk signals and control availability. Versioned subject references can be bound to assessments, but draft references require review. The provider returns quotations only; automatic practice/continue judgments are withheld because the current keyword score is not a validated rubric. Ninety backend tests and six interface tests pass. Earlier artifacts contain twelve analysis-tool tests and a forty-eight-record synthetic offline pilot. These are conformance and recording results, with no live model calls or independently labelled efficacy data. The architecture demonstrates selected release boundaries; general technical correctness and demographic fairness remain unmeasured.
''')
replace('Zero Trust Architecture, AI interviews, bias risk, source grounding, output assurance, policy enforcement',
        'college interview bot, zero trust, hallucination risk, bias risk, source grounding, output assurance')
between('\\section{Introduction}\n', '\\section{Related Work}', r'''\section{Introduction}
A college interview bot may ask a technical question, receive a student's answer and return feedback for practice or authorized assessment review. Its output can incorrectly attribute a statement to the student, repeat a technical error as if it were correct, or treat otherwise comparable answers differently. A valid login does not make generated feedback reliable, and a warning has little value if the warned artifact is still released. The research problem is therefore to control both access to an assessment and release of its output.

The project also includes historical campus-placement and resume features. Our measured implementation is a narrower controlled candidate/reviewer workflow with one fixed Zero Trust Architecture (ZTA) question and a keyword score used to test authority boundaries. It does not establish academic grading validity or make an employer selection decision. The submitted paper should be assessed as a systems and architecture study with preliminary verification, rather than an efficacy study of automated grading.

NIST SP 800-207 grounds the resource-access decision in a policy engine and enforcement point~\cite{rose2020zero}. We couple this with an application-level output decision that treats model responses as untrusted proposed artifacts. The contribution is the explicit interaction: source and risk checks can withhold output after an otherwise authorized request, while a model cannot grant itself resource access. This does not make semantic correctness or fairness an inherent property of ZTA.

We distinguish three feedback errors. Student attribution requires evidence from the student's answer. A technical explanation requires a reviewed subject source and semantic assessment. A judgment of mastery requires a declared rubric and answer evidence. A resume statement supplies only candidate-origin evidence; it neither proves a qualification nor establishes domain truth. Our implemented checks cover exact quotation provenance, a narrow technology-use grammar and selected review signals. General technical entailment and fair scoring remain evaluation goals. We contribute a coupled release design, a versioned controlled prototype and a reproducible verification and evaluation protocol.

''')
between('\\section{Related Work}\n', '\\section{Terminology and Threat Model}', r'''\section{Related Work}
NIST SP 800-207 describes policy decision and enforcement for protected resources~\cite{rose2020zero}; SP 800-207A discusses cloud-native access control~\cite{chandramouli2023zero}. The NIST Generative AI Profile separately treats confabulation and harmful bias as risks needing evaluation~\cite{nist2024genai}. None of these sources defines a 13-layer ZTA standard or implies that authorization verifies a model's statement.

FActScore motivates claim-level factual support rather than treating a whole answer as one correct or incorrect unit~\cite{min2023factscore}. AlignScore shows why semantic consistency requires methods beyond matching a quotation to source text~\cite{zha2023alignscore}; we do not claim either method is implemented here. Educational grading research has examined instructor-provided answers and rubrics~\cite{golchin2025grading}, reinforcing the need for a meaningful assessment construct before presenting a bot judgment as a grade. SelfCheckGPT estimates unreliable generation from sample consistency~\cite{manakul2023selfcheck}, which also differs from evidence support.

Fairness in a student-facing bot concerns comparable feedback and review decisions for comparable technical answers. Studies of language-model hiring decisions and name effects supply adjacent counterfactual methods~\cite{an2024discriminate,nghiem2024name}; their employment outcomes cannot be imported as college interview results. Research on language varieties shows that style can affect model responses~\cite{fleisig2024linguistic}. For technical interviews, style variants need faculty validation that meaning is preserved; communication quality can be a legitimate criterion only when it is explicitly assessed. A sensitive-word screen by itself cannot establish equal treatment.

Untrusted student material can also carry instructions. Resume-screening attacks and OWASP guidance motivate treating source text as data, not policy~\cite{baxi2026prompt,owasp2025llm}. Our architectural position is the coupling of resource authorization, source-constrained output and review state; its practical benefit over simpler controls still requires matched experiments.

''')
replace('The protected assets are resume text, answers, assessment state, scores, proposed feedback and review records. Candidates access their own assessments within an assigned tenant; reviewers inspect held assessments within their tenant.',
        'The protected assets are student answers, optional resume and subject-reference text, assessment state, test scores, proposed quotations and review records. Students access their own assessments within an assigned scope; authorized reviewers inspect held assessments within that scope.')
replace('Source-supported means the available evidence supports a statement in the declared scope.',
        'Source-supported means the available evidence supports a statement within the declared comparison scope.')
replace('Bias-risk evidence is a signal for inspection, not a discrimination finding.',
        'Bias-risk evidence is a signal for inspection, not a discrimination finding or an estimate of unequal treatment.')

between('\\begin{table}[t]\n\\caption{Threats and required enforcement outcomes}',
        'Table~\\ref{tab:threats} identifies workflow threats', r'''\begin{table}[t]
\caption{Project-specific layer map and evidence boundary}
\label{tab:layers}
\centering
\begin{tabular}{@{}L{0.32\columnwidth}L{0.61\columnwidth}@{}}
\toprule
Legacy labels & Controlled-workflow interpretation \\
\midrule
L1 identity, L9 policy & Server-side session, role, scope and ownership decisions are exercised. \\
L2 device, L3 network, L10 edge & Legacy protections; not established by controlled-service tests. \\
L4 workload, L5 data, L8 governance & Bounded schemas and evidence hashes are exercised; legacy PDF and edge paths are separate. \\
L6 audit, L7 automation, L11 threat intelligence & Transactional audit and recovery are exercised; legacy IP response is outside this result. \\
L12 bias, L13 grounding & Selected review signals, exact quotations and bounded claim comparison are exercised; efficacy is unmeasured. \\
\bottomrule
\end{tabular}
\end{table}

''')
replace('Table~\\ref{tab:threats} identifies workflow threats rather than an exhaustive attack taxonomy.',
        'Table~\\ref{tab:layers} summarizes the thirteen project-specific legacy labels; they are not a NIST-prescribed layer model, and the default controlled service does not mount every legacy middleware path.')
replace('An optional plain-text resume is attached once before submission.',
        'An optional plain-text resume is attached once before submission.')
replace('The feedback contract permits bounded exact quotations linked to answer, question or resume.',
        'The feedback contract permits bounded exact quotations linked to answer, question, resume or an optional versioned subject reference.')
replace('Accordingly, quote matching is never reported as general semantic hallucination detection.',
        'A research-draft reference quotation is held for review; an unknown or fabricated quotation causes abstention. Even a faculty-reviewed status is an administrative record, not proof that the quoted content is correct. Accordingly, quotation matching is not reported as general semantic hallucination detection.')
replace('The current claim checker adds a deliberately limited source comparison.',
        'The current claim checker adds a deliberately limited resume-relative source comparison to both the answer and valid quoted observations.')
replace('The output screen checks quoted text for selected sensitive-attribute and instruction-like phrases using word boundaries.',
        'The output screen records exact matches and quote-relative offsets for selected sensitive-attribute and instruction-like phrases. A bounded technical exception handles \emph{race condition} when no other race reference occurs in the bound source.')
replace('This prevents certain flagged artifacts from being silently released but leaves indirect language, context and vocabulary coverage unresolved.',
        'This prevents certain flagged artifacts from being silently released but may impose review on benign disclosures and may miss indirect or stylistic effects. These are fairness risks to measure, not verified mitigations.')
replace('Source contradiction or selected risk trigger, with otherwise valid output & Hold for review',
        'Source contradiction, draft subject reference or selected risk trigger & Hold for review')
replace('No blocking condition in the implemented scope & Release',
        'No blocking condition in the implemented scope & Release quotes and fixture score')
replace('Approval authorizes release of that artifact; it does not verify a qualification or validate the scoring rubric.',
        'Approval authorizes release of its quotations; it does not verify technical correctness, student mastery or the scoring rubric.')
replace('The fixture score is the rounded percentage',
        'The fixture score is the rounded percentage')
replace('Resume evidence & Owned immutable text and digest; no PDF/OCR or qualification verification.',
        'Evidence sources & Owned resume text and optional versioned subject reference; no semantic truth guarantee.')
replace('Output assurance & Exact quotations, bounded claim grammar and review triggers; no validated general detector.',
        'Output assurance & Exact quotations, bounded claim grammar, draft-source holds and review triggers; no validated general detector.')
replace('Scoring & Server-owned three-term keyword fixture; no competence or hiring validity.',
        'Scoring & Server-owned three-term keyword fixture; no student competence validity.')
replace('Grounding predictions and paired-output records are exported separately.',
        'Grounding predictions and paired-output records are exported separately in the earlier protocol pilot.')
replace('The paired workflow keeps the fixed ZTA question and keyword score; job text does not alter that rubric.',
        'The earlier paired workflow kept the fixed ZTA question and keyword score; its job-text perturbations do not alter that rubric.')
replace('It cannot measure model-driven candidate ranking or general hiring-score fairness.',
        'It cannot measure model-driven student grading fairness. College-specific answer and presentation pairs are required for that question.')
replace('Table~\\ref{tab:verification} reports the current checks.',
        'Table~\\ref{tab:verification} distinguishes the latest controlled checks from earlier protocol artifacts.')
replace('69 tests passed', '90 tests passed')
replace('5 tests passed; build succeeded', '6 tests passed; build succeeded')
replace('Synthetic offline recording pilot & 48 complete records; 0 live calls',
        'Earlier synthetic offline recording pilot & 48 records; 0 live calls')
replace('The forty-eight-case runner smoke check retains',
        'The earlier forty-eight-case runner smoke check retains')
replace('These records are explicitly offline, and no prediction-to-gold analysis is performed because human labels remain blank.',
        'These earlier records are offline protocol artifacts, not outputs of the latest policy version; no prediction-to-gold analysis is performed because human labels remain blank.')
replace('The efficacy study asks four questions.',
        'The proposed efficacy study asks four questions.')
replace('whether output decisions and error burdens change across qualification-preserving demographic pairs.',
        'whether output decisions and error burdens change across meaning-preserving student-answer and identity/presentation pairs.')
replace('Pairs cover three junior technical roles and four declared signals: pronouns, age, marital status and disclosed disability.',
        'The earlier pilot pairs cover three junior technical roles and four declared signals: pronouns, age, marital status and disclosed disability.')
replace('These signals require faculty review before a larger study and do not represent a population\'s distribution or legitimate hiring criteria.',
        'These pilot inputs require faculty review and a college-specific redesign before a larger study; they do not represent a student population.')
replace('Fairness analysis compares paired output scores only when the rubric is meaningful and the scores are available.',
        'Bias analysis compares paired output scores only when the rubric is meaningful and the scores are available.')
replace('Ranking or selection-rate claims require a defined ranking task and a predeclared selection threshold; neither is evaluated here.',
        'Academic grading or ranking claims require a validated task and rubric; neither is evaluated here.')
replace('The optional provider has not been exercised live, and timeout or model-version effects have not been measured in deployment.',
        'The optional provider has not been exercised live, and timeout or model-version effects have not been measured in deployment. The current provider contract asks for quotations only; legacy practice/continue recommendations are withheld in storage and read paths because a keyword fixture cannot justify an assessment judgment.')
replace('The current score must not be used for autonomous employment decisions.',
        'The current score must not be used for academic grading or autonomous placement decisions.')
replace('Verification records 69 passing backend tests, five interface tests and twelve analysis-tool tests.',
        'Current verification records 90 passing backend tests and six interface tests; a separate earlier artifact records twelve analysis-tool tests.')
replace('The 48 offline pilot records establish recording and importer compatibility.',
        'The earlier 48 offline pilot records establish recording and importer compatibility for their frozen version.')
replace('demographic fairness, competence scoring and live-provider reliability remain unvalidated.',
        'demographic fairness, student competence scoring and live-provider reliability remain unvalidated.')

# The historical benchmark does not estimate the later system and consumes space
# better spent stating current limits. It remains in the preserved faculty source.
between('\\subsection{Historical Component Timing}\n',
        '\\subsection{Research Questions and Study Configurations}', '')
replace('The historical timing configurations are component analogues, not evidence that these live system ablations have been run.',
        'The earlier component timings are not evidence that these live system ablations have been run.')

old_bib = source[source.index('\\begin{thebibliography}{99}'):source.index('\\end{thebibliography}')]
items = dict(re.findall(r'\\bibitem\{([^}]+)\}(.*?)(?=\\bibitem\{|\Z)', old_bib, flags=re.S))
items.update({
    'min2023factscore': 'S. Min \\emph{et al.}, ``FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation,\'\' in \\emph{Proc. EMNLP}, 2023, pp. 12076--12100, doi: 10.18653/v1/2023.emnlp-main.741.\n',
    'zha2023alignscore': 'Y. Zha, Y. Yang, R. Li, and Z. Hu, ``AlignScore: Evaluating Factual Consistency with A Unified Alignment Function,\'\' in \\emph{Proc. ACL}, 2023, pp. 11328--11348, doi: 10.18653/v1/2023.acl-long.634.\n',
    'golchin2025grading': 'S. Golchin, N. Garuda, C. Impey, and M. Wenger, ``Grading Massive Open Online Courses Using Large Language Models,\'\' in \\emph{Proc. COLING}, 2025, pp. 3899--3912. [Online]. Available: \\url{https://aclanthology.org/2025.coling-main.263/}\n',
    'fleisig2024linguistic': 'E. Fleisig \\emph{et al.}, ``Linguistic Bias in ChatGPT: Language Models Reinforce Dialect Discrimination,\'\' in \\emph{Proc. EMNLP}, 2024, pp. 13541--13564, doi: 10.18653/v1/2024.emnlp-main.750.\n'
})
citations = []
for group in re.findall(r'\\cite\{([^}]+)\}', source[:source.index('\\begin{thebibliography}{99}')]):
    for key in group.split(','):
        if key not in citations:
            citations.append(key)
missing = set(citations) - set(items)
if missing:
    raise RuntimeError(f'uncited bibliography source missing: {missing}')
source = source.replace(old_bib, '\\begin{thebibliography}{99}\n' +
                        ''.join('\\bibitem{' + key + '}' + items[key].strip() + '\n\n' for key in citations))
replace('\\IEEEtriggeratref{4}', '\\IEEEtriggeratref{11}')
target = root / 'paper/TrustInterview_IEEE_college.tex'
target.write_text(source, encoding='utf-8')
print(f'Wrote {target.name}; {len(citations)} cited references; {len(source.split())} source words')
