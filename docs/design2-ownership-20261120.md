# GoStudy | Design 2 ownership / handoff — 2026-11-20

**Status:** Draft UI/UX pilot only. Not published to production; authenticated visual E2E and customer acceptance still required. No educational-content change.

## Responsibility split

- **Design 2:** visual UI and layout of student dashboards/lessons; approved Michael components; responsive desktop/mobile, visual translation/video/chat controls and navigation (without changing authorization, transport or stored data).
- **Centralization:** Supabase backups/restore, credentials, auth/RLS, profiles, teacher-student links, active assignments, migration and data integrity, storage, chat/answer routing and realtime permissions.
- Do not duplicate or overwrite each other's branches. UI changes touching auth/data require an architecture review by Centralization; no direct DB writes.

## Verified main baseline (read on 2026-11-20)

- `main` commit `2b6e1ddd51fd8fa9a15ea6a2caebc07839f7a575`.
- 18 legacy `student-*.html` addresses, **not** 18 distinct users. Recent live SQL census found 16 student identities + 1 teacher.
- 12 dashboards use the shared Michael renderer directly, one B1 stories route uses it behind a course access gate; three more are in draft PR #49; Sweden and Turkey retain independent HTML/CSS/JS.
- *Common dashboard rendering alone is not full lesson/video/chat/translation parity.*
- Michael dashboard: `student-business-ai-finance.html`; lesson: `business-ai-finance-b2-02.html`.
- Alla dashboard: `student-english-placement.html`; current lesson: `my-trip-to-vietnam-a2.html`.

## Active PR registry — avoid overlap

| PR | Owner / responsibility | Touches or blockers |
| --- | --- | --- |
| #5 `architecture/unified-platform-v1` | **Centralization** | Large architecture WIP, including `assets/gostudy-v1-cabinet.js/css`, `assets/gostudy-v1-vocabulary.js`, student routes, teacher panel |
| #49 `architecture/michael-unification-protected-cabinets-20261120` | **Shared handoff required**: UI of three student routes and Centralization-owned `assets/gostudy-sync.js` access gate in one PR | No parallel edits to these files until this PR is assigned/split |
| #50 `architecture/legacy-browser-data-snapshot-20261120` | **Centralization** | Browser-only historic data, recovery tooling |
| Design 2 current `design2/michael-alla-feed-parity-20261120` | **Design 2** | One Alla lesson HTML page, independent contract test and workflow, this note |

## Current Design 2 change

- On **Alla's private A2 Vietnam lesson only**, opt in to the **existing, exact Michael-approved** lesson feed CSS `assets/gostudy-michael-feed.css?v=4` using `data-premium-feed="michael-v1"`.
- This reuses the same paper layout, continuous page edge, responsive padding, activity/pager presentation. No copied lesson shell; no new identity/auth/video/word/chat behavior.
- The existing lesson JSON, translation flag, paths, storage keys, exercise IDs, homework, private access gate, and student dashboard remain untouched.
- The static test reconstructs Alla's exact previous HTML and verifies its original Git blob SHA. It also protects Michael's unchanged reference SHA. No cross-account credentials needed.
- **Not yet proven:** what an authenticated teacher and student see on both screen sizes, actual CSS layout in real browsers, protected content loading, homework and video lifecycle. Keep PR **DRAFT** pending tests and customer acceptance.

## Next Design 2 files after coordination

1. `assets/gostudy-michael-feed.css` — only if visual desktop/mobile comparison shows a reusable layout defect; *reuse this file*, do not create another custom feed template.
2. `assets/gostudy-jaas-video.css`, `assets/gostudy-jaas-video.js` — visual chrome and lifecycle after Centralization confirms room/token authorization, with real Michael + Alla teacher/student checks. Do not copy finance-only endpoints.
3. `assets/gostudy-michael-chat.css` and common translation selection presentation — reuse the approved UI; backend/storage changes belong to Centralization.
4. Remaining lesson templates and `student-sweden.html`/`student-turkey.html` **only after** Centralization confirms assignment mappings, browser data capture, backup and rollback; never delete legacy routes.
5. The three PR #49 student files **only after** ownership/splitting is resolved. Do not edit `assets/gostudy-sync.js` in Design 2.

### Release gate

- Visual screenshots and responsive interaction at desktop and phone resolutions for Michael **and** Alla.
- Authenticated student and teacher smoke checks; no unauthorized pages or damaged progress.
- Recorded results, explicit acceptance; then Centralization coordinates final migration merge.


## Browser verification — PR #51 (2026-11-20)

CI: [Design 2 test run #44715253248](https://github.com/mylesson-room/mylesson-room.github.io/actions/runs/44715253248).
- Browser: Chromium on GitHub Actions (1365 x 850 desktop and 390 x 844 touch mobile); actual repository HTML/CSS/JS files served locally.
- Login and Supabase API responses mocked with **synthetic** IDs, so no real accounts, production secrets, backend reads, or writes. This is NOT a verified live authorization or cross-account RLS test.
- Michael student desktop/mobile, Alla student desktop/mobile, Alla teacher mobile: all 5 browser rendering/navigation test cases passed.
- Both lessons match the approved Michael CSS computed values for lesson paper color, horizontal padding, continuous bottom edge, and section heading gradient at both breakpoints.
- Neither lesson had horizontal page overflow; lesson navigation advanced from `page-0` to `page-1`; common translation-selection control rendered.
- Visual screenshot artifacts available on the run under `design2-michael-alla-mock-screenshots` (5 screenshots). Screenshots are mock-auth test renders, **not** visual proof of production access.
- **Known functional gap:** Michael has embedded JaaS two-person video tiles and connect control; Alla still has old external Telemost button. Do **not** silently replace functional Telemost with a mock call button. Centralization must confirm secure room membership/token support for Vietnam A2 before Design 2 reuses `assets/gostudy-jaas-video.js/css`.
- Not yet tested: live Supabase permissions, student and teacher logins under real accounts, camera/mic permissions, live translation service responses, cross-device and cross-user answer sync, video persistence on mobile, overall accessibility review.
- Production remains unchanged; customer acceptance and Centralization security/backup signoff required before merge/release.

**Next safe Design 2 task:** prepare reusable VIDEO UI/chrome integration only after Centralization provides a secure reusable course-independent token interface. Do not edit `assets/gostudy-sync.js`, database schema, or Supabase auth.
