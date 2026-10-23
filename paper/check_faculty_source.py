from collections import Counter
from pathlib import Path
import json
import re
root = Path(__file__).resolve().parents[1]
source = (root / 'paper/TrustInterview_IEEE_faculty.tex').read_text(encoding='utf-8')
citations = {key.strip() for group in re.findall(r'\\cite\{([^}]+)\}', source) for key in group.split(',')}
bib = re.findall(r'\\bibitem\{([^}]+)\}', source)
labels = re.findall(r'\\label\{([^}]+)\}', source)
refs = set(re.findall(r'\\ref\{([^}]+)\}', source))
report = {'citations': len(citations), 'references': len(bib), 'missingReferences': sorted(citations - set(bib)),
          'unusedReferences': sorted(set(bib) - citations), 'duplicateReferences': [k for k, n in Counter(bib).items() if n > 1],
          'missingLabels': sorted(refs - set(labels)), 'duplicateLabels': [k for k, n in Counter(labels).items() if n > 1],
          'braceBalance': source.count('{') - source.count('}'), 'figures': source.count(r'\begin{figure'),
          'tables': source.count(r'\begin{table'), 'approximateSourceWords': len(source.split())}
assert not any(report[k] for k in ['missingReferences', 'unusedReferences', 'duplicateReferences', 'missingLabels', 'duplicateLabels', 'braceBalance'])
assert r'\documentclass[conference]{IEEEtran}' in source
assert not any(token in source for token in [r'\usepackage{geometry}', r'\linespread', r'\setlength{\textheight}', r'\setlength{\textwidth}'])
out = root / 'output/chunk18'
out.mkdir(parents=True, exist_ok=True)
(out / 'source-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
