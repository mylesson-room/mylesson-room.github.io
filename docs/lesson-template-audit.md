# GoStudy — legacy lesson migration audit
Checked: 2026-11-17. Scope: existing root-level lesson HTML pages (excluding homework, cabinets and practice).
The following 37 pages do **not** import `assets/gostudy-v1-lesson.js`. They are still candidates for migration to the shared step-based renderer. This is a template audit, not an assessment of their teaching quality.

- `art-mosaics-b1.html`
- `business-ai-b2c1.html`
- `business-ai-finance-b2.html`
- `country-house-a2-02.html`
- `country-house-a2.html`
- `feed-b2-02.html`
- `feed-b2-03.html`
- `feed-b2-04.html`
- `feed-choice-b2.html`
- `finance-b1-02.html`
- `finance-b1.html`
- `first-sales-c1-02.html`
- `first-sales-c1.html`
- `general-english-b1-01.html`
- `general-english-b1-stories-01.html`
- `general-english-b2-m01-l01.html`
- `ielts-reading-01.html`
- `ielts-reading-02.html`
- `ielts-reading-03.html`
- `international-sports-trip-b1.html`
- `pharma-c1-02.html`
- `pharma-c1-03.html`
- `pharma-c1.html`
- `sweden-a2-02.html`
- `sweden-a2.html`
- `tiktok-a2.html`
- `travel-a2-02.html`
- `travel-a2-03.html`
- `travel-a2-04.html`
- `travel-b1-02.html`
- `travel-b1-03.html`
- `travel-b2-02.html`
- `travel-b2-03.html`
- `travel-b2-04.html`
- `travel-disruptions-b2.html`
- `travel-weekend-a2.html`
- `turkey-b1.html`

## Already using the shared v1 lesson shell
- `art-b1-02.html`, `art-b1-03.html`
- `business-ai-b2c1-02.html`, `business-ai-b2c1-03.html`
- `business-ai-finance-b2-02.html` (Michael; legacy `labels/pages` data retained for answer compatibility)
- `country-house-a2-03.html`, `country-house-a2-04.html`
- `general-english-b2-01.html` (Victoria; legacy `labels/pages` data retained)

## Migration order
1. Existing active student lessons on old shells, one course at a time, with answer-key compatibility mapping and snapshot tests.
2. Homework pages and student cabinets to reusable components.
3. Remaining archived or older lessons.
Do not delete old storage keys or room events during migration. New lessons must use `lesson.steps` with stable IDs and supported types; enforced by `scripts/check-template-contract.cjs`.
