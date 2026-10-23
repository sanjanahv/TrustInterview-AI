"""Check the current IEEE artifact against retained local evidence."""
from __future__ import annotations

import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
tex = ROOT / 'paper/TrustInterview_IEEE_final.tex'
pdf = ROOT / 'output/pdf/TrustInterview_IEEE_final.pdf'
log = ROOT / 'output/pdf/TrustInterview_IEEE_final.log'
report = ROOT / 'output/chunk30/backend-tests.xml'
probes = ROOT / 'output/chunk28/current-policy-probes.json'

source = tex.read_text(encoding='utf-8')
cited = {k.strip() for group in re.findall(r'\\cite\{([^}]+)\}', source) for k in group.split(',')}
listed = set(re.findall(r'\\bibitem\{([^}]+)\}', source))
assert cited == listed, {'missing': sorted(cited - listed), 'uncited': sorted(listed - cited)}
assert r'\documentclass[conference]{IEEEtran}' in source
assert 'Overfull' not in log.read_text(encoding='utf-8')
assert 'undefined' not in log.read_text(encoding='utf-8')

with fitz.open(pdf) as document:
    pages = len(document)
    assert 7 <= pages <= 8, pages
    assert all(abs(page.rect.width - 612) < 1 and abs(page.rect.height - 792) < 1 for page in document)

tests = ET.parse(report).getroot()
test_cases = tests.findall('.//testcase')
assert len(test_cases) == 91 and not tests.findall('.//failure') and not tests.findall('.//error')

probe_data = json.loads(probes.read_text(encoding='utf-8'))
assert probe_data['policyVersion'] == 'research-0.8'
assert len(probe_data['cases']) == 9
assert all(case['expectedDecision'] == case['observedDecision'] for case in probe_data['cases'])
assert probe_data['liveModelCalls'] == probe_data['independentHumanLabels'] == 0

summary = {
    'source': str(tex.relative_to(ROOT)),
    'pdf': str(pdf.relative_to(ROOT)),
    'pages': pages,
    'bibliographyEntries': len(listed),
    'backendTestsPassed': len(test_cases),
    'authoredCurrentPolicyProbes': len(probe_data['cases']),
    'liveModelCalls': 0,
    'independentHumanLabels': 0,
    'sha256': {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
               for path in (tex, pdf, report, probes)},
}
destination = ROOT / 'output/chunk30/final-verification.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2))
