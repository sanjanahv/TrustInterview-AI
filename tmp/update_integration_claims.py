from pathlib import Path
file = Path('paper/TrustInterview_IEEE_working.tex')
source = file.read_text(encoding='utf-8')
replacements = {
    'Live-model efficacy and integration with the original application remain unvalidated.': 'Live-model efficacy, verified external identity and resume-workflow integration remain unvalidated.',
    'It is separate from the original application and does not establish the efficacy of a deployed language-model interview system.': 'Its candidate and reviewer workflow now connects to the default interface, but excludes the historical resume and OAuth routes and does not establish the efficacy of a deployed language-model interview system.',
    'The original API and interface remain outside the new reference boundary.': 'The historical resume and OAuth routes remain outside the new reference boundary.',
    'The historical prototype and its interface have not been integrated with these controls.': 'At this retained snapshot, the historical prototype and its interface had not been integrated with these controls.',
    'and integration with the original interface remain required before the full protocol can be executed.': 'and integration with the historical resume workflow remain required before the full protocol can be executed.',
}
for old, new in replacements.items():
    if old not in source:
        raise RuntimeError('Expected manuscript anchor missing: ' + old)
    source = source.replace(old, new)
file.write_text(source, encoding='utf-8')
print('Integration claims reconciled with the retained snapshot and new workflow.')
