"""Retain test report and source hashes; never create study gold labels."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
source = root / 'TrustInterview-AI/backend/research/evaluation'
result = subprocess.run([sys.executable, '-m', 'unittest', '-v', 'test_annotation_tools.py'], cwd=source, capture_output=True, text=True)
(out / 'tooling-tests.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
hashes = {}
for name in ['annotation_tools.py', 'test_annotation_tools.py']:
    data = (source / name).read_bytes()
    target = out / 'source-snapshot' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    hashes[name] = hashlib.sha256(data).hexdigest()
(out / 'tooling-verification.json').write_text(json.dumps({'exitCode': result.returncode, 'python': sys.version,
    'purpose': 'Artificial schema/arithmetic fixtures; not human annotations or efficacy results',
    'completedHumanAnnotations': 0, 'liveModelCalls': 0, 'sourceSha256': hashes}, indent=2) + '\n', encoding='utf-8')
print(f'Tooling tests exit: {result.returncode}; exact sources retained')
raise SystemExit(result.returncode)
