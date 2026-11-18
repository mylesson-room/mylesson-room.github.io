# GoStudy — evidence-based release acceptance ledger (NOT an approval)

Status: **BLOCKED / NOT RELEASE-READY**. This document is a checklist and evidence protocol, not a claim that production data have been verified. Use alongside `docs/gostudy-master-migration-prompt.md`, `docs/backup-and-reconciliation-gate.md` and `docs/legacy-cabinet-inventory.json`.

## Evidence rules

- Record a date, reviewer, immutable commit SHA, GitHub Actions run URL, test environment, and result for every completed gate. An unfilled gate is **NOT TESTED**, not PASS.
- Never place student names, emails, Auth UUIDs, passwords, tokens, answers, chat messages, word lists, or screenshots with private data in GitHub. Store sensitive mapping and evidence in access-controlled storage; refer to opaque evidence IDs only.
- A static test or synthetic browser fixture does **not** establish real RLS enforcement, account ownership, data durability, or successful restore.
- A GitHub Pages public HTML page cannot enforce lesson confidentiality on its own. Verify protected content delivery and cross-account denial at the server/data boundary.
- A candidate lesson in the public inventory is not an active assignment. Never auto-select it without teacher confirmation.

## Release gates (all required)

| Gate | Minimum acceptance evidence | Current status |
| --- | --- | --- |
| G1: full backup | Dated full Supabase backup manifest covering public/private schemas, Auth-related identities as permitted, storage objects and migration-critical history; hashes and secure location | BLOCKED: no verified backup evidence |
| G2: restore rehearsal | Isolated restore with table/row-count reconciliation, referential checks, recovery time, rollback instructions and reviewer sign-off | BLOCKED: no restore proof |
| G3: student reconciliation | Authorized teacher verifies account ↔ legacy rooms ↔ exactly one current lesson, with ambiguous cases held for manual review; private mapping stored outside repo | BLOCKED: not signed off |
| G4: data preservation | Before/after counts and sampled integrity checks for vocabulary, mastery, attempts, chat, homework, media and browser-only import conflicts; zero unexplained losses | NOT TESTED |
| G5: RLS negative tests | Two different students, two different teachers, direct REST/RPC and URL attempts; foreign read/write denied; expired sessions denied | NOT TESTED |
| G6: role workflows | Teacher-only display-name edit, assignment change, draft/publish/unpublish homework; student sees only authorized active lesson and published homework | NOT TESTED with real accounts |
| G7: 18 legacy routes | Each inventory entry tested for authorized access, historical compatibility, archived content, and no leakage to a different account | NOT TESTED end-to-end |
| G8: regression | Michael and Placement: desktop/mobile, fresh login, second device, words, chat, answers, video, contextual translation pilot and graceful failure | NOT TESTED end-to-end |
| G9: CI + acceptance | Green checks on exact release SHA, data integrity report, rollback plan and explicit customer approval | BLOCKED |

## Per-cabinet test protocol

For **each** of the 18 entries in `docs/legacy-cabinet-inventory.json`:

1. Confirm a private, teacher-reviewed mapping to the correct Auth identity. If ambiguous, mark **HOLD**; do not infer from a filename, room order or timestamp.
2. Record an opaque evidence ID, never a student identifier. Verify the single active assignment against the protected database, not a public JSON candidate.
3. As the rightful student, check login, assigned lesson, disabled homework when unpublished, and protected homework page only after publication.
4. As a different student, check direct legacy link, canonical link, API calls, homework link and lesson data requests: unauthorized content must not be returned.
5. As the owning teacher, verify profile editing and assignment; as another teacher, verify both read and write denial.
6. Check vocabulary/attempts/chat and old deep links before and after migration against the immutable baseline. For browser-only data, require consented merge and conflict report, never overwrite.
7. Repeat on desktop and mobile, fresh session and expired session. Attach private redacted evidence and the exact test SHA.

The test matrix is complete only when **18/18 entries have individual evidence** and the account-level mapping is separately reconciled. The count of 18 routes must never be equated to 18 unique students.

## Safe execution order

1. Continue non-production shared-component and synthetic tests in the isolated branch.
2. Obtain G1/G2 evidence **before** any real database schema/data writes, migration, redirect or archival change.
3. Resolve G3 and record the verified mapping privately.
4. Run staged migrations and G4–G8 in a non-production environment, with explicit rollback rehearsal.
5. Verify G9 and seek explicit acceptance. Until then, keep PR #5 draft and do not merge or change production main.

## Evidence entry template (safe metadata only)

```text
Gate: G__
Result: NOT TESTED | PASS | FAIL | HOLD
UTC date:
Reviewer role:
Commit SHA:
CI run URL:
Environment: synthetic | isolated-staging | production-readonly
Opaque evidence ID:
Finding / blocker (no personal data):
```
