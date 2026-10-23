from pathlib import Path
import re
paper = Path(__file__).resolve().parent / 'TrustInterview_IEEE_faculty.tex'
source = paper.read_text(encoding='utf-8')
start = source.index(r'\begin{thebibliography}{99}')
end = source.index(r'\end{thebibliography}', start)
body = source[:start]
order = []
for group in re.findall(r'\\cite\{([^}]+)\}', body):
    for key in group.split(','):
        if key.strip() not in order:
            order.append(key.strip())
entries = {}
for match in re.finditer(r'\\bibitem\{([^}]+)\}(.*?)(?=\\bibitem|\Z)', source[start + len(r'\begin{thebibliography}{99}'):end], re.S):
    entries[match[1]] = '\\bibitem{' + match[1] + '}' + match[2].strip() + '\n\n'
assert set(entries) == set(order)
paper.write_text(body + '\\begin{thebibliography}{99}\n\n' + ''.join(entries[key] for key in order) + source[end:], encoding='utf-8')
print('References ordered by first citation.')
