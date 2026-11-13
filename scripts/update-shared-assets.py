"""Refresh GoStudy asset URLs and verify every catalog page uses the shared dictionary."""
import hashlib
import re
from pathlib import Path
from functools import lru_cache

ROOT = Path(__file__).resolve().parent.parent
ASSET = re.compile(r'(assets/gostudy-[a-z-]+\.(?:js|css))(?:\?v=[\w-]+)?(?=["\'])')
@lru_cache
def digest(url):
    return hashlib.sha256((ROOT / url).read_bytes()).hexdigest()[:12]

for path in sorted(ROOT.glob('*.html')):
    html = path.read_text()
    if 'data-vocab-course=' not in html and path.name not in {'login.html','gostudy-account.html','gostudy-teacher.html'}:
        continue
    if 'data-vocab-course=' in html and 'assets/gostudy-glass-vocabulary.js' not in html:
        raise SystemExit(f'{path.name}: shared dictionary missing')
    def version(match):
        url = match[1]
        stamp = digest(url)
        return f'{url}?v={stamp}'
    updated = ASSET.sub(version, html)
    if updated != html:
        path.write_text(updated)
