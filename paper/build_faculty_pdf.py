"""Compile the self-contained IEEE faculty draft; keep all cache/output in workspace."""
import os
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[1]
source_name = ('TrustInterview_IEEE_template_style.tex' if '--template-style' in sys.argv else
               'TrustInterview_IEEE_final.tex' if '--final' in sys.argv else
               'TrustInterview_IEEE_college.tex' if '--college' in sys.argv else 'TrustInterview_IEEE_faculty.tex')
out = root / 'output/pdf'
record = root / ('output/chunk31' if '--template-style' in sys.argv else
                 'output/chunk30' if '--final' in sys.argv else
                 'output/chunk27' if '--college' in sys.argv else 'output/chunk18')
out.mkdir(parents=True, exist_ok=True)
record.mkdir(parents=True, exist_ok=True)
cache = root / 'tools/tectonic-cache'
cache.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, TECTONIC_CACHE_DIR=str(cache))
command = [str(root / 'tools/tectonic/tectonic.exe'), '--untrusted', '--keep-logs', '--keep-intermediates',
           '--outdir', str(out), str(root / 'paper' / source_name)]
if '--cached' in sys.argv:
    command.insert(1, '--only-cached')
result = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, timeout=300)
(record / 'compile-output.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
print((result.stdout + result.stderr)[-6000:])
print('Compiler exit:', result.returncode)
raise SystemExit(result.returncode)
