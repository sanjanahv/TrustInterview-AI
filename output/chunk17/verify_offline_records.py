import hashlib
import json
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'TrustInterview-AI/backend/research/evaluation'))
from annotation_tools import validate_run
out = Path(__file__).resolve().parent
run = out / 'offline-smoke'
read = lambda name: json.loads((run / name).read_text(encoding='utf-8'))
cases = read('input-cases.json')
by_id = {c['caseId']: c for c in cases}
manifest = read('run-manifest.json')
grounding, paired = read('grounding-predictions.json'), read('paired-runs.json')
records = [json.loads(line) for line in (run / 'records.jsonl').read_text(encoding='utf-8').splitlines()]
assert manifest['status'] == 'completed' and manifest['liveModelCallsAttempted'] == 0
assert manifest['completedRecords'] == manifest['plannedRecords'] == len(records) == 48
assert len(grounding) == len(paired) == 24
assert {r['caseId'] for r in records} == set(by_id)
assert {r['caseId'] for r in grounding} == {c['caseId'] for c in cases if c['task'] == 'grounding'}
assert {r['caseId'] for r in paired} == {c['caseId'] for c in cases if c['task'] == 'paired_input'}
for row in records:
    validate_run(row, by_id[row['caseId']])  # Verifies Node/Python canonical input hash compatibility.
    assert row['runKind'] == 'offline'
    raw = run / row['rawResponseRef']
    assert hashlib.sha256(raw.read_bytes()).hexdigest() == row['rawResponseSha256']
    json.loads(raw.read_text(encoding='utf-8'))
    if row['caseId'] in {c['caseId'] for c in cases if c['task'] == 'paired_input'}:
        assert row['score'] is None or row['decision'] == 'release'
report = {'validation': 'passed', 'records': 48, 'groundingRecords': 24, 'pairedRecords': 24,
          'liveModelCalls': 0, 'humanLabels': 0, 'efficacyAnalysisPerformed': False,
          'checks': ['record_counts', 'complete_case_coverage', 'raw_artifact_hashes', 'importer_metadata', 'cross_language_input_hashes', 'offline_mode']}
(out / 'offline-protocol-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print('Verified 48 offline records, raw hashes and Python importer compatibility. No efficacy analysis.')
