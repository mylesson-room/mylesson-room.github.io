# GoStudy: Michael ↔ B1 Stories parity audit (20 November 2026)

## Ground truth
The Michael reference consists of `student-business-ai-finance.html`, `business-ai-finance-b2-02.html`,
`gostudy-v1-cabinet.js/css`, `gostudy-v1-lesson.js/css` and his scoped feed/chat layers.
The B1 Stories course is `student-general-english-b1-stories.html`,
`general-english-b1-stories-01.html` and its original *separate*
`general-english-b1-stories-01-homework.html`.

## Confirmed differences and decisions

| Area | Prior B1 implementation | Action / remaining limitation |
|---|---|---|
| Student cabinet UI | Legacy `#student-home` markup from `gostudy-sync.js` with a simple reveal-only trainer. | **Changed:** B1 now loads the EXACT `gostudy-v1-cabinet.js/css` template used by Michael, only after the existing course access check. |
| Cabinet homework | Old homework belongs to the previously completed story, not the new Toxic Co-workers material. | **Preserved:** same URL, cloud key and content; different card title prevents mislabelling. |
| Cabinet dictionary and training | B1 legacy training is one-mode; Michael has cards, multiple choice, typed answers and listening. | **Changed:** reuse Michael's four-mode training UI. Existing B1 vocabulary progress key is unchanged; teacher-assigned words are read from existing B1 course RPC. |
| Word mastery | Michael tracks learned words in a finance-specific progress table. | **Not yet equivalent:** B1 has the shared training UI, but cross-device learned/needs-practice status still requires a course-neutral backend. Do not point B1 at the finance table. |
| Lesson renderer | Michael has a bespoke finance lesson engine; B1 has `gostudy-vimbox-workbook.js` and B1-compatible progress/answers. | **Not yet one codebase:** migrated premium heading visuals, collapsible sections and adjustable sidebar; did NOT replace B1 exercise engine or its cloud-answer identifiers. |
| Video | Michael and B1 share the JaaS frontend but use different protected token functions. | **Aligned presentation:** B1 keeps its separate authorized video room but now uses the EXACT Michael premium video CSS rules from one shared file. The B1 video stylesheet is limited to course-specific panel integration. |
| Chat | Michael uses finance events; B1 uses protected chat Edge Function with a dedicated progress key. | **Existing:** similar compact presentation, different transport/persistence; avoid merging without backend migration and acceptance. |
| Translation | Michael's own selection/Google pilot; B1 glass vocabulary's Google translation implementation. | **Aligned interaction:** B1 disables the old floating round dictionary and large sidebar translation. It now uses the top-right Dictionary control and a compact near-selection Google pilot derived from Michael's algorithm; B1 still saves to its own course vocabulary store (no finance records). |
| Teacher answer monitoring | Michael's finance realtime hooks; B1 reader polls course-authorized teacher view and uses workbook key. | **Not yet identical:** preserve reliable B1 source; do not silently migrate responses or rename storage keys. |
| CSS | Separate historical lesson styles and course overrides. | **Partially changed:** B1 cabinet now reuses shared Michael stylesheet, B1 lesson remains scoped CSS until a safe cross-course component migration. |

## Safety constraints
- Never modify or delete live Supabase records in this visual-parity branch.
- No change to any other student's cabinet, Michael's finance room, original B1 homework, or stored words/answers.
- Do not activate finance-only mastery, homework publishing or finance chat APIs for B1.
- Test both roles and mobile; verify GitHub Pages publish after a successful PR run. The selection popup and B1 video CSS are now covered by explicit Playwright assertions.
- Future product-level unification should extract common lesson shell, translator and dictionary APIs into shared components before removing the two existing exercise engines.

## Acceptance checks
- Protected B1 dashboard visually and structurally matches Michael's shared cabinet header, cards and training dialogs.
- B1 dashboard displays the original homework title and original URL.
- Lesson remains the 50-minute, eight-section Toxic Co-workers B1 lesson with original keys and no changed content.
- Video/lesson split is adjustable and keyboard accessible; sections can collapse.
- Teacher sees student answers; old homework is still accessible; word training and dictionary open; unauthorized guests cannot see protected cabinet.
