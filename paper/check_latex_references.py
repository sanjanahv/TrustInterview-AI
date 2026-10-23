import re
from pathlib import Path

source = Path("paper/TrustInterview_IEEE_working.tex").read_text(encoding="utf-8")
citations = {
    key.strip()
    for group in re.findall(r"\\cite\{([^}]+)\}", source)
    for key in group.split(",")
}
bibliography = set(re.findall(r"\\bibitem\{([^}]+)\}", source))
print(f"Citations: {len(citations)}")
print(f"Bibliography entries: {len(bibliography)}")
print("Missing:", sorted(citations - bibliography))
print("Unused:", sorted(bibliography - citations))
related_start = source.index(r"\section{Related Work}")
related_end = source.index(r"\section{Terminology and Threat Model}", related_start)
related = source[related_start:related_end]
print(f"Related-work words: {len(related.split())}")
print("Related-work subsections:", related.count("\\subsection"))
threat_start = related_end
threat_end = source.index(r"\section{Dual Policy Zero Trust Architecture}", threat_start)
threat_model = source[threat_start:threat_end]
print(f"Threat-model words: {len(threat_model.split())}")
print("Threat-model rows:", len(re.findall(r"^T\d+\s*&", threat_model, re.MULTILINE)))
architecture_start = threat_end
architecture_end = source.index(r"\section{Prototype Implementation and Traceability}", architecture_start)
architecture = source[architecture_start:architecture_end]
print(f"Architecture words: {len(architecture.split())}")
print("Architecture subsections:", architecture.count("\\subsection"))
implementation_start = architecture_end
implementation_end = source.index(r"\section{Evaluation}", implementation_start)
implementation = source[implementation_start:implementation_end]
print(f"Implementation words: {len(implementation.split())}")
print("Traceability rows:", len(re.findall(r"^R\d+\s*&", implementation, re.MULTILINE)))
evaluation_start = implementation_end
evaluation_end = source.index(r"\section{Discussion}", evaluation_start)
evaluation = source[evaluation_start:evaluation_end]
print(f"Evaluation-protocol words: {len(evaluation.split())}")
print("Evaluation subsections:", evaluation.count("\\subsection"))
print("Evaluation corpus rows:", len(re.findall(r"^(Access and state|Sensitive-content|Grounding corpus|Adversarial-resume)", evaluation, re.MULTILINE)))
labels = re.findall(r"\\label\{([^}]+)\}", source)
refs = set(re.findall(r"\\ref\{([^}]+)\}", source))
print("Duplicate labels:", sorted(k for k in set(labels) if labels.count(k) > 1))
print("Missing labels:", sorted(refs - set(labels)))
print(f"Brace balance: {source.count('{') - source.count('}')}")
