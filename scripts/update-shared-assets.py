"""Refresh GoStudy asset URLs and verify every catalog page uses the shared dictionary."""
import hashlib
import re
from pathlib import Path
from functools import lru_cache

ROOT = Path(__file__).resolve().parent.parent
ASSET = re.compile(r'(assets/(?:gostudy-(?:[a-z-]+|v1-[a-z-]+)|business-ai-workbook)\.(?:js|css))(?:\?v=[\w-]+)?(?=["\'])')
@lru_cache
def digest(url):
    return hashlib.sha256((ROOT / url).read_bytes()).hexdigest()[:12]

for path in sorted(ROOT.glob('*.html')):
    original = html = path.read_text()
    if 'data-vocab-course=' not in html and 'data-finance-live' not in html and 'data-ielts-private-lesson' not in html and 'data-placement-' not in html and path.name not in {'login.html','gostudy-account.html','gostudy-teacher.html','gostudy-ui-kit.html'}:
        continue
    # Course-restricted cabinets mount Michael's shared vocabulary dynamically
    # only after the existing Supabase enrollment/role check succeeds.
    shared_cabinet = (
        path.name in {
            'student-general-english-b1-stories.html',
            'student-general-english-b1.html',
            'student-tiktok-a2.html',
        }
        and (
            'data-unified-b1-cabinet' in html
            or 'data-unified-course-cabinet' in html
        )
        and 'id="cabinet-settings"' in html
        and 'assets/gostudy-v1-cabinet.css' in html
        and 'assets/gostudy-sync.js' in html
    )
    if 'data-vocab-course=' in html and 'assets/gostudy-glass-vocabulary.js' not in html and not shared_cabinet:
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
