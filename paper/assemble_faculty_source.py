from pathlib import Path
import re
root = Path(__file__).resolve().parent
working = (root / 'TrustInterview_IEEE_working.tex').read_text(encoding='utf-8')
archive = root / 'archive/TrustInterview_IEEE_before_eight_page_consolidation.tex'
if not archive.exists():
    archive.write_text(working, encoding='utf-8')
faculty = root / 'TrustInterview_IEEE_faculty.tex'
source = faculty.read_text(encoding='utf-8')
if r'\begin{thebibliography}' in source:
    raise SystemExit('Faculty source already assembled; edit it directly without re-appending references.')
bibliography = working[working.index(r'\begin{thebibliography}'):working.index(r'\end{thebibliography}')]
bibliography = re.sub(r'\\bibitem\{eu2024aiact\}.*?(?=\\bibitem)', '', bibliography, flags=re.S)
bibliography = bibliography.replace('Available: https://genai.owasp.org/llm-top-10/', r'Available: \url{https://genai.owasp.org/llm-top-10/}')
bibliography = bibliography.replace('Available: https://developers.google.com/identity/openid-connect/openid-connect.', r'Available: \url{https://developers.google.com/identity/openid-connect/openid-connect}.')
bibliography += r'''
\bibitem{google_gemini}
Google,
``Structured outputs,''
Google AI for Developers documentation. [Online]. Available:
\url{https://ai.google.dev/gemini-api/docs/generate-content/structured-output}.
Accessed: Oct. 11, 2026.

\end{thebibliography}
\end{document}
'''
faculty.write_text(source + '\n' + bibliography, encoding='utf-8')
print('Faculty source assembled with inline references; long working draft preserved.')
