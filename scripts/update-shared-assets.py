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

def classroom_controls(html):
    dictionary = any(name in html for name in (
        'gostudy-v1-lesson.js', 'gostudy-v1-workbook.js', 'gostudy-v1-vocabulary.js',
        'gostudy-glass-vocabulary.js', 'data-unified-b1-cabinet', 'data-unified-course-cabinet',
    ))
    attributes = []
    if dictionary:
        attributes.append('data-word-actions')
        if 'assets/gostudy-word-actions.js' not in html:
            shared = (
                '<link rel="stylesheet" href="assets/gostudy-word-actions.css">\n'
                '<script src="assets/gostudy-word-actions.js" '
                'data-finance-live-src="assets/gostudy-finance-live.js"></script>\n'
            )
            html = html.replace('</head>', shared + '</head>', 1)
    if 'gostudy-v1-workbook.js' in html:
        attributes.append('data-stable-writing')
    if 'data-jaas-video-pilot' in html and 'data-homework-only' not in html:
        attributes.append('data-jaas-mobile-panel')
    return re.sub(r'<body(?=\s|>)[^>]*>', lambda match:
                  match[0][:-1] + ''.join(' ' + attribute for attribute in attributes
                                         if attribute not in match[0]) + '>', html, count=1)


for path in sorted(ROOT.glob('*.html')):
    original = path.read_text()
    html = classroom_controls(original)
    if 'data-vocab-course=' not in html and 'data-finance-live' not in html and 'data-ielts-private-lesson' not in html and 'data-placement-' not in html and path.name not in {'login.html','gostudy-account.html','gostudy-teacher.html','gostudy-ui-kit.html'}:
        if html != original:
            path.write_text(ASSET.sub(lambda match: f'{match[1]}?v={digest(match[1])}', html))
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
