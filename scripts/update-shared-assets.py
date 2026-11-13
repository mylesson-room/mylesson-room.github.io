"""Refresh GoStudy asset URLs and verify every catalog page uses the shared dictionary."""
import hashlib
import re
from pathlib import Path
from functools import lru_cache

ROOT = Path(__file__).resolve().parent.parent
ASSET = re.compile(r'(assets/(?:gostudy-[a-z-]+|business-ai-workbook)\.(?:js|css))(?:\?v=[\w-]+)?(?=["\'])')
@lru_cache
def digest(url):
    return hashlib.sha256((ROOT / url).read_bytes()).hexdigest()[:12]

for path in sorted(ROOT.glob('*.html')):
    original = html = path.read_text()
    if 'data-vocab-course=' not in html and path.name not in {'login.html','gostudy-account.html','gostudy-teacher.html','gostudy-ui-kit.html'}:
        continue
    if 'data-vocab-course=' in html and 'assets/gostudy-glass-vocabulary.js' not in html:
        raise SystemExit(f'{path.name}: shared dictionary missing')
    if '<meta name="gostudy-current-lesson">' in html and 'assets/gostudy-lesson-room.css' not in html:
        styles = ('gostudy-lesson-room.css', 'business-ai-workbook.css?v=2', 'gostudy-color-workbook.css')
        links = ''.join(f'<link rel="stylesheet" href="assets/{style}">\n' for style in styles)
        html = html.replace('</head>', links + '</head>', 1)
    if '<meta name="gostudy-current-lesson">' in html or 'assets/gostudy-vimbox-workbook.js' in html:
        html = re.sub(r'(<script (?:defer )?src="assets/gostudy-sync\.js)', r'<script src="assets/gostudy-classroom-ui.js"></script>\1', html, count=1) if 'assets/gostudy-classroom-ui.js' not in html else html
    if 'id="student-home"' in html and 'assets/gostudy-lesson-header.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="assets/gostudy-lesson-header.css"></head>', 1)
    def version(match):
        url = match[1]
        stamp = digest(url)
        return f'{url}?v={stamp}'
    updated = ASSET.sub(version, html)
    if updated != original:
        path.write_text(updated)
