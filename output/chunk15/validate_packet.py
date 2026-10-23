"""Validate authoring integrity without inventing annotations or accuracy."""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parent
read = lambda name: json.loads((root / name).read_text(encoding='utf-8'))
manifest = read('dataset-manifest.json')
for name, expected in manifest['sha256'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
cases = read('pilot-cases.json')
ids = {c['caseId'] for c in cases}
assert len(cases) == len(ids) == 48
assert sum(c['task'] == 'grounding' for c in cases) == 24
for letter in ['A', 'B']:
    packet = read(f'annotator-{letter}-BLANK.json')
    assert {c['caseId'] for c in packet} == ids
    for c in packet:
        assert not any(k in c for k in ['prediction', 'expectedLabel', 'pairId', 'category', 'variant'])
        assert c['annotation'] == dict(label=None, evidence=[], rationale=None, ambiguity=None, annotatorId=None, completedAt=None)
assert [c['caseId'] for c in read('annotator-A-BLANK.json')] != [c['caseId'] for c in read('annotator-B-BLANK.json')]
by_id = {c['caseId']: c for c in cases}
pairs = {}
for item in read('author-manifest.json')['cases']:
    if item['pairId']:
        pairs.setdefault(item['pairId'], []).append(item)
assert len(pairs) == 12
for members in pairs.values():
    assert len(members) == 2 and {m['variant'] for m in members} == {0, 1}
    a, b = [by_id[m['caseId']] for m in members]
    assert a['job'] == b['job'] and a['answer'] == b['answer']
    assert a['resume'].split('\n', 1)[1] == b['resume'].split('\n', 1)[1]
    assert a['resume'].split('\n', 1)[0] != b['resume'].split('\n', 1)[0]
report = {'validation': 'passed', 'uniqueCases': len(ids), 'groundingCases': 24,
          'pairs': len(pairs), 'humanLabelsCompleted': 0, 'efficacyMetricsComputed': False,
          'checks': ['sha256', 'unique_identifiers', 'blind_blank_packets', 'distinct_orders', 'pair_content_preservation']}
(root / 'packet-validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print('Validated hashes, 48 unique cases, blind blank packets and 12 qualification-preserving pairs. No efficacy metrics computed.')
