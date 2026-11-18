# GoStudy migration — verified backup and reconciliation gate

Status: BLOCKED. No production schema or data writes are authorized until this gate is satisfied.
Project: Supabase kawfqlohguwvmmplvrny. Do not store backup files, credentials, student IDs, emails, or lesson responses in this public repository.

## Read-only baseline, 2026-11-18
The query was executed read-only against the existing Supabase database.

| Aggregate | Count |
|---|---:|
| Auth users | 17 |
| Teachers / linked students | 1 / 16 |
| Unique teacher-student relationships | 16 |
| Auth users without a discovered relationship | 0 |
| Students with more than one teacher | 0 |
| Classroom rooms / finance rooms | 6 / 1 |
| Classroom events / finance events | 558 / 183 |
| Progress rows / private lesson rows | 46 / 2 |
| Public vocabulary rows | 0 |
| Travel A2 words / Finance B1 words | 3 / 5 |
| Travel B2 workbook words / private course workbook words | 3 / 7 |
| Homework drafts / published | 0 / 0 |

These are table-row counts, NOT unique vocabulary words or complete historical data. There may be more records inside JSON or localStorage on student devices. Empty new tables do not prove absence of homework or vocabulary.

18 legacy student HTML paths are inventoried in docs/legacy-cabinet-inventory.json, but 18 paths do not correspond to 18 distinct users. The current student ID/lesson mapping must be privately verified. At least one student had two course memberships.

## Backup acceptance procedure, before ANY production DDL or import
1. Secure access to a full PostgreSQL export of all relevant schemas and data (auth, public, gostudy_private and other dependencies) using a trusted server-side connection. Never expose credentials in GitHub, chat, public CI logs, browser JS or issue comments.
2. Export to an encrypted, access-controlled location **outside this repository**, using a compatible pg_dump custom-format archive. Example command with secrets supplied through a private environment: `pg_dump --format=custom --no-owner --no-acl --file=/secure/path/gostudy-before-migration.dump`.
3. Record an archive SHA-256, byte size, UTC timestamp, PostgreSQL version, pg_dump version and schema scope in a restricted audit record.
4. Restore the archive into an ISOLATED, NON-PRODUCTION database. A readable archive is not enough: the restore must actually complete, including dependent extensions, schemas, RLS policies, FKs, events and indexes.
5. Recompute all baseline counts on the restored copy. Compare exact rows counts and anonymized data digests for historical event/answer/vocabulary tables; do not publish the actual records.
6. Test rollback in staging. Explain how new lesson answers after the snapshot would be preserved during rollback; restoring a stale snapshot without handling new writes is data loss.
7. Verify each student/current lesson mapping with the teacher in a private roster, then only create canonical assignments. Do not infer current lesson from the Git file date, a student HTML name or a nonunique email label.

**Release gate:** verified backup, successful isolated restore and reconciliation, explicit assignment mapping, negative RLS tests for student/student and teacher/teacher, desktop/mobile E2E, rollback plan and customer acceptance. Until then, no production writes.

## Local browser-only data
Legacy localStorage on a different device is not accessible from Supabase. Provide a user-consented import when that student reopens their old browser: merge by user/course/normalized word key, preview conflicts, write and verify the server copy, and retain local data until confirmation.

## Static HTML privacy
A GitHub Pages URL is public. Client-only redirect or login checks do NOT protect any course solutions or private lesson content embedded in a static .html file. Protected content must be served from an authenticated backend/RLS API before promising student-specific secrecy.

## Safe interim scope
Continue code reviews, synthetic tests, common CSS/JS, proposed migrations and read-only database audits on branch architecture/unified-platform-v1. Keep PR #5 draft; retain all 18 legacy routes and their data until accepted.
