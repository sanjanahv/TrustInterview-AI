"""Check the compiled IEEE paper and render every page for visual inspection."""
from pathlib import Path
import hashlib
import json
import re
import fitz
root = Path(__file__).resolve().parents[1]
pdf = root / 'output/pdf/TrustInterview_IEEE_faculty.pdf'
source = root / 'paper/TrustInterview_IEEE_faculty.tex'
out = root / 'output/chunk18'
renders = root / 'tmp/pdfs/faculty-review'
renders.mkdir(parents=True, exist_ok=True)
document = fitz.open(pdf)
texts, page_report = [], []
for number, page in enumerate(document, 1):
    text = page.get_text()
    texts.append(text)
    page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False).save(renders / f'page-{number:02d}.png')
    outside = []
    fonts = set()
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                fonts.add(round(span['size'], 2))
                box = fitz.Rect(span['bbox'])
                if box.x0 < 0 or box.y0 < 0 or box.x1 > page.rect.width + .5 or box.y1 > page.rect.height + .5:
                    outside.append(span['text'])
    page_report.append({'page': number, 'words': len(text.split()), 'widthPt': page.rect.width,
                        'heightPt': page.rect.height, 'fontSizesPt': sorted(fonts), 'textOutsidePage': outside})
combined = '\n'.join(texts)
backend = json.loads((root / 'output/chunk17/verification-summary.json').read_text(encoding='utf-8'))
smoke = json.loads((root / 'output/chunk17/offline-smoke/run-manifest.json').read_text(encoding='utf-8'))
frontend = (root / 'output/chunk17/frontend-tests.txt').read_text(encoding='utf-8')
tooling = (root / 'output/chunk16/tooling-tests.txt').read_text(encoding='utf-8')
assert backend['tests'] == backend['passed'] == 69 and backend['failed'] == 0
assert 'Tests:       5 passed, 5 total' in frontend
assert re.search(r'Ran 12 tests', tooling) and tooling.rstrip().endswith('OK')
assert smoke['status'] == 'completed' and smoke['completedRecords'] == 48 and smoke['liveModelCallsAttempted'] == 0
compact = re.sub(r'\s+', '', combined)
assert 'REFERENCES' in compact and 'CONCLUSION' in compact and 'Fig.1.' in compact
assert not re.search(r'\[\?+\]|\?\?', combined)
assert not any(p['textOutsidePage'] for p in page_report)
log_path = root / 'output/pdf/TrustInterview_IEEE_faculty.log'
log = log_path.read_text(encoding='utf-8', errors='replace') if log_path.exists() else ''
report = {'pages': len(document), 'withinEightPageMaximum': len(document) <= 8,
          'withinSevenToEightPageTarget': 7 <= len(document) <= 8,
          'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'pdfSha256': hashlib.sha256(pdf.read_bytes()).hexdigest(),
          'backendTests': 69, 'frontendTests': 5, 'toolingTests': 12, 'offlineRecords': 48, 'liveModelCalls': 0,
          'undefinedCitationOrReferenceWarnings': bool(re.search(r'(Citation|Reference).*undefined', log)),
          'overfullBoxWarnings': re.findall(r'Overfull \\[hv]box[^\n]*', log),
          'underfullBoxWarnings': re.findall(r'Underfull \\[hv]box[^\n]*', log),
          'pageDetails': page_report, 'visualReview': 'pending manual page inspection'}
(out / 'pdf-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
(out / 'compiled-text.txt').write_text(combined, encoding='utf-8')
print(json.dumps({k: report[k] for k in ['pages', 'withinEightPageMaximum', 'withinSevenToEightPageTarget', 'overfullBoxWarnings', 'undefinedCitationOrReferenceWarnings']}))
