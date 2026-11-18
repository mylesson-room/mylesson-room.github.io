# GoStudy — master migration execution contract

Status: ACTIVE ENGINEERING SPEC, NOT PRODUCTION DEPLOYMENT
Reference: GitHub Issue #4, Draft PR #5. 2026-11-18.

## Target
All existing students and their actual latest assigned lessons, not only two test accounts, must work from ONE data-driven cabinet, ONE design, ONE teacher control panel, ONE set of components and ONE Supabase-backed authorization/data contract. No course-specific cabinet code or manual HTML cloning for new pupils. The scope includes vocabulary, word mastery, homework publishing, teacher/student live events, chat, translation and preservation of progress.

## Decisions
- Michael's student-business-ai-finance.html is the **sole approved visual reference**.
- English Placement is the second independent regression scenario, NOT a second source of styling.
- Exactly one **teacher-confirmed active lesson** visible to a student. Archive older material rather than deleting the students' words, attempts, chat or progress. Where multiple candidate lessons are found and no explicit assignment exists, do not silently pick one.
- Homework card is always present. A missing/unpublished homework must be visibly disabled with no clickable destination. Published homework opens a separate protected page without video. Teacher drafts exercises and explicitly publishes.
- Student display_name belongs to a protected Supabase profile. If genuinely unknown, show «Ученик»; never invent it from email. Teacher can edit it in teacher dashboard. Do not trust student-controlled user metadata for role authorization.
- Existing compatible deep links remain accessible or use safe authorization-preserving redirect until migration is accepted.
- All historical data remains intact until verified backup and rollback exist.

## Existing system realities
- 18 legacy student-*.html files; some still use divergent inline CSS, JavaScript and course-local localStorage.
- 17 Supabase Auth accounts, but HTML cabinet count is NOT unique student count.
- Mixed room/roster tables, specialized finance events and classroom events, multiple vocabulary stores (including private schemas).
- Google Translate web-pilot changes have been committed on main in 2026-11-17; it uses an undocumented web endpoint that can change/break, thus cannot be declared production-grade. Preserve it behind the already-existing pilot flag for Michael and check contextual selected-span behavior, RU↔EN, mobile and graceful error handling.
- The candidate mapping in docs/legacy-cabinet-inventory.json lists every legacy cabinet; these are NOT confirmed student assignments.
- A user's private localStorage on another browser/device cannot be collected from the server. Provide consented on-device import that merges rather than overwrites and logs conflicts.

## Invariants
- A student can read only their own profile/active lesson, homework publication, vocabulary, answers and chat.
- A teacher can read/update only their own assigned students and never write another teacher's records.
- No service_role key, private payload, raw email/password, learner answer or PII in GitHub Pages or test fixtures.
- No client-only auth check as a substitute for RLS and protected lesson material.
- Never regress Michael's accepted vocabulary/training/chat/homework/live/video translation behavior.
- Only approved reusable features appear for all students; the Google web translator remains a pilot until validated.

## Sequence
1. Audit Git commit history, all 18 existing cabinets, the teacher dashboard, classroom catalog, RLS functions, user/room/roster relationships and historical stores. Do not guess the latest lesson from Git commit timestamps.
2. Secure a verifiable full database backup and tested restoration/rollback path BEFORE production DDL, migration, destructive edits or redirects.
3. Create shared profiles, teacher-student memberships, reusable lesson catalog and student assignment contract; use idempotent migrations and RLS with negative tests.
4. Seed profiles and relationships from verified links, never from an email guess or an arbitrary static cabinet name.
5. Teacher dashboard edits display_name and selects the latest active lesson; student dashboard renders only that lesson and the permanent homework card.
6. Unify content/lesson rendering; preserve existing lesson text/audio/images and mark older lesson records archived.
7. Migrate vocab/chat/attempts/homework and provide user-side import for remaining localStorage snapshots.
8. Test at least Michael and Placement end-to-end; test all discovered active student mappings, desktop/mobile, new login/re-login, false/expired session, direct URLs, cross-account denial, teacher edits, publish/unpublish, contextual translation and rollback.
9. Release on production only after CI + real authenticated E2E + data integrity audit + explicit customer acceptance. Keep existing links and archive sources until after acceptance.

## Mandatory self-review before each commit
- Is this in ONE shared component, not a bespoke patch?
- Are teacher/student authorization boundaries enforced by RLS, not only UI?
- Does data survive a new browser session and another device?
- Could the patch erase local vocabulary or classroom chat?
- Could a test-user account access another student's lesson?
- Does a student with NO homework see a disabled homework card?
- Does a student with MULTIPLE legacy rooms avoid an unverified choice?
- Can the teacher edit the name? Is it read back from protected storage?
- Does Michael's Google web pilot remain isolated and its limitations known?
- Are all 18 legacy page candidates accounted for? Does the design match Michael?
- Is there a real rollback and backup? Are CI and authenticated tests green?
Report actual evidence (commits, tests, live checks), not merely code existence.

## Definition of done
Only when all existing users' current lessons and progress are migrated, teacher name edit and assignments work, the universal cabin is used everywhere, all stated functional scenarios and RLS have been tested and the customer approves. A draft PR or successful structural test alone is not completion.

## Execution boundary
Cannot truthfully run forever or set a self-resume timer from a chat session. Continue available safe work within the current active execution; if blocked, leave an auditable PR with exact uncompleted steps. Never claim future autonomous execution without an actual scheduled mechanism.
