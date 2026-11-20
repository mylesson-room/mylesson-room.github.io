# GoStudy Design 2 — 16 live student identities / UI coverage (2026-11-20)

## Source and interpretation

**Authoritative scope:** the *actual* 16 unique Supabase student IDs assigned to the teacher, not the 18 `student-*.html` legacy paths.

Read-only Supabase enrollment cross-check joins the real course membership sources:
`gostudy_finance_room`, `gostudy_classroom_rooms`, protected `lesson_course_students`,
`finance_b1_students`, `travel_a2_students`, and the established feed/first-sales/pharma/tiktok/B2 rosters.
Result: **16 distinct student IDs**. There are more course membership *labels* than identities.
The `english_placement`, `vietnam_a2` and `vietnam_a2_homework` assignments are one user;
one user has **both** `general_english_b1` and `general_english_b2`. General English B2 has **two** enrolled users.
Do not count each HTML URL, homework route or enrollment row as another student.
No emails or UUIDs are stored in this public audit.

Teacher UI source: `assets/gostudy-sync.js` `mountTeacher()` / `teacherCatalog`:
it constructs `students` from course-scoped RPCs plus the room table and counts distinct `student.id`.
Where a course has multiple memberships, the same page may serve more than one student. Verify each authorization independently.

## UI migration queue (one row per unique enrolled person)

| Anonymous roster entry | Current assigned course(s) | Active teacher-lesson UI status |
| --- | --- | --- |
| 01 | art_b1 | **PR #52** Michael v1 lesson + linked homework in draft |
| 02 | business_ai | **PR #52** Michael v1 lesson + linked homework in draft |
| 03 | business_ai_finance | Michael master lesson already in production, reference for design only |
| 04 | country_house | Irina A2+ new lesson/homework and securely signed video published in PR #48 |
| 05 | english_placement + vietnam_a2 + vietnam_a2_homework | Alla, **PR #51** approved Michael UI lesson/homework/chat in draft; course-specific JaaS token absent |
| 06 | feed_b2 | Korean Wave page has independent ongoing **PR #16**; do not overwrite |
| 07 | finance_b1 | Finance AI page has independent ongoing **PR #11**; do not overwrite |
| 08 | first_sales | **PR #52** Michael v1 current lesson in draft |
| 09 | general_english_b1_stories | Current B1 Stories cabinet/lesson worked on in published PR #45 and #47; distinct lesson engine; real role QA still relevant |
| 10 | general_english_b1 + general_english_b2 | **Both** course UIs must be checked for this one student: B2 page in **PR #52**; B1 lesson uses another engine; cabinet pending **PR #49** |
| 11 | general_english_b2 | Second independently enrolled B2 student; same B2 lesson file in **PR #52**, separate account-level access test needed |
| 12 | ielts_reading | Protected v1 dynamic lesson, requires a separately gated UI migration and no authentication changes |
| 13 | pharma_c1 | **PR #52** current lesson in draft |
| 14 | sweden_a2 | Browser-only legacy data: wait for **PR #50** verified export/restore before changing or publishing historical routes |
| 15 | tiktok_a2 | Old lesson engine; cabinet in **PR #49**, UI work must not conflict with its auth/data changes |
| 16 | travel_a2 | Current Positive Thinking lesson/cabinet in architecture **PR #5**, alternate old UI PR #9; coordinate file ownership first |

This roster covers unique accounts, **not** all historical lesson versions and **not** complete platform migration.
The first 5 HTML lesson pages of PR #52 serve 6 unique students because General English B2 has two. One of those six also has a second B1 course that still needs its own UI pass.
The two homework pages added to #52 use exactly the same shared feed/chat without changing content.

## Branch and file locks

- Design 2 / Alla: `design2/michael-alla-feed-parity-20261120` — PR #51; files `my-trip-to-vietnam-a2*.html`, `assets/gostudy-vietnam-a2.js`, Alla-only UI fallback and tests.
- Design 2 / active v1 lesson batch: `design2/michael-multi-lesson-batch-20261120` — PR #52; five lesson HTMLs, two homework HTMLs, Design2-only presentation helpers, tests and docs.
- Centralization: PR #5 and PR #50; shared auth, data, roster, backup/recovery.
- Mixed ownership requiring split: PR #49; Design 2 must not edit `assets/gostudy-sync.js` or those three student routes until coordinated.
- Ongoing non-Design2 conflicts: PR #11 finance B1, PR #16 Korean Wave, PR #9 Positive Thinking.
- No changes to production `main`, Supabase schema, RLS, enrollments, progress, user accounts or words without explicit coordinated release signoff.

## Production release criteria

Actual logged-in teacher/student test for each assigned person, visible correct lesson and homework,
live answers and dictionary on both roles, mobile and desktop interaction, intact historical
progress and backup/rollback, no access to other students, and approved JaaS token mapping
for any embedded camera calls. Synthetic test accounts and Chrome screenshots alone do
not establish these. Do not mark all 16 complete until *every* account's assigned routes pass.
