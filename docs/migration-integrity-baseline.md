# GoStudy — production migration integrity baseline and rollback gate

Captured by READ-ONLY Supabase queries on 2026-11-18. These are aggregate **lower-bound historical references**, not a backup and not a completed import.

## Identified accounts and routes
- Auth: 17 accounts; 1 unique teacher + 16 unique linked pupils in all currently known public/private membership sources; 25 raw membership rows; 17 student-course pairs; 1 student has 2 linked courses.
- 18 `student-*.html` legacy URLs; some names denote courses/old variants and are not guaranteed to identify distinct users.
- Each of the 18 URLs has a candidate current lesson in `docs/legacy-cabinet-inventory.json` but **none is yet a teacher-confirmed assignment**.
- For some old static routes direct database mappings may be absent; never auto-match by guessed email or name.

## Content-bearing tables: baseline rows
| Source | Rows | Preserve |
|---|---:|---|
| `public.gostudy_progress` | 46 | JSON state, revisions, ownership |
| `public.gostudy_classroom_rooms` | 6 | student/teacher/course/path associations |
| `public.gostudy_classroom_events` | 558 | append-only real-time event history |
| `public.gostudy_finance_room` | 1 | Michael classroom membership |
| `public.gostudy_finance_events` | 183 | append-only finance event history |
| `public.gostudy_private_lessons` | 2 | private lesson payloads and publication state |
| `gostudy_private.course_workbook_words` | 7 | personal dictionary entries |
| `gostudy_private.finance_b1_words` | 5 | personal dictionary entries |
| `gostudy_private.travel_a2_words` | 3 | personal dictionary entries |
| `gostudy_private.travel_b2_workbook_words` | 3 | personal dictionary entries |
| `public.gostudy_tiktok_a2_assigned` | 4 | assigned words |
| `public.gostudy_b2_word_assignments` | 1 | assigned words |
| `public.gostudy_feed_b2_assigned` | 1 | assigned words |
| `public.gostudy_vocabulary_items` | 0 | table empty does not imply no vocabulary |
| `public.gostudy_homework_assignments` | 0 | table empty does not imply no old homework |
| `public.gostudy_homework_published` | 0 | no current publications visible in this table |

### Append-only event categories
| Source | Page | Answer | Reset | Word | Chat |
|---|---:|---:|---:|---:|---:|
| classroom events | 319 | 185 | 25 | 25 | 4 |
| finance events | 147 | 27 | 2 | 5 | 2 |

Classroom event JSON shapes: page {action,page}, answer {key,page,value}, reset {namespace,page}, word {en,ru}, chat {text}. Finance events use page {action,page}, answer {key,value}, reset {page}, word {en,ru}, chat {text}. Important: finance events lack a `room_id`; migrate through a verified room mapping rather than assuming common IDs. Never replay reset without its original order.

## Stop conditions before changing production
1. Generate a complete **restorable** PostgreSQL/Supabase backup including auth, public and gostudy_private schema, RLS policies, functions, row contents and historical events. Store encrypted outside this public repo. Verify restore into an isolated database and check all baseline counts and referential integrity. If backup/restore cannot be verified: do not write any production DDL/DML.
2. Produce a secure mapping for **every** known unique student ID to actual latest lesson/course and teacher, including the one user assigned to two courses. Teacher confirmation for ambiguous current assignments. Do not upload student IDs/emails to GitHub.
3. Record per-student old state revisions and counts, last event sequences and relevant lesson keys. Preserve unrecognized legacy keys for later import.
4. Prepare idempotent forward migrations AND tested reverse compatibility. Don't count data in another pupil's browser localStorage as backed up; give every pupil opt-in on-device import and deduplicating merge.
5. Complete teacher/student negative RLS testing with at least two real isolated test users (or an isolated clone), unauthorized direct links and API.
6. Release with feature flag and limited rollout only after tests and user acceptance. Do not delete old HTML/lesson content until old URLs have safe replacement and all assigned users passed data integrity checks.

## Post-migration reconciliation
- Rows and actor counts in old historical tables must not decrease; imported event counts + unique source IDs must reconcile, counting duplicate replays only once.
- Distinct teacher-student relationships must match independently verified membership source. One active and published assignment per student maximum.
- Where profile name is not evidence-backed, it stays `Ученик`, editable by teacher and readable by authenticated pupil.
- Visible homework is disabled unless an explicit record authorizes publication for that student and selected lesson; old file existence is not publication.
- For each student, verify old and new vocab counts, word keys/translations, answer progress, chat and user role. Document conflicts and resolve without overwriting original data.
- Keep lesson text/audio/assets and prior content in repo or authenticated archive until every active student can load only the current lesson.

## Platform security notices from Supabase advisor
- RLS on 15 tables has no policies (may be intentional private/admin-only objects; investigate rather than enabling public access blindly).
- One public anon-callable `SECURITY DEFINER` function and seven authenticated-callable `SECURITY DEFINER` functions need privilege review: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.
- Leaked-password protection disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
