"""Download a pinned official portable compiler into this workspace only."""
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile
root = Path(__file__).resolve().parents[1]
dest = root / 'tools/tectonic'
dest.mkdir(parents=True, exist_ok=True)
headers = {'User-Agent': 'TrustInterview-faculty-paper-build'}
def get(url, limit):
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('download exceeds bound')
    return data
release_url = 'https://api.github.com/repos/tectonic-typesetting/tectonic/releases/tags/tectonic%400.17.0'
metadata = json.loads(get(release_url, 2_000_000))
asset = next(a for a in metadata['assets'] if 'x86_64-pc-windows-msvc' in a['name'] and a['name'].endswith('.zip'))
url = asset['browser_download_url']
assert url.startswith('https://github.com/tectonic-typesetting/tectonic/releases/download/')
data = get(url, 70_000_000)
sha = hashlib.sha256(data).hexdigest()
if asset.get('digest'):
    assert asset['digest'] == 'sha256:' + sha
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    executable = next(info for info in archive.infolist() if Path(info.filename).name == 'tectonic.exe')
    assert executable.file_size < 100_000_000
    binary = archive.read(executable)
target = dest / 'tectonic.exe'
if target.exists():
    assert target.read_bytes() == binary
else:
    target.write_bytes(binary)
(dest / 'download-manifest.json').write_text(json.dumps({'release': metadata['tag_name'], 'source': url,
    'archiveSha256': sha, 'executableSha256': hashlib.sha256(binary).hexdigest(),
    'releaseAssetDigestChecked': bool(asset.get('digest'))}, indent=2) + '\n', encoding='utf-8')
print('Portable official Tectonic installed inside workspace; archive digest checked:', bool(asset.get('digest')))
