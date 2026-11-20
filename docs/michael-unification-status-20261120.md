# GoStudy — Michael unification: live inventory and migration safety gate

As of 2026-11-20. **Draft-only engineering report, not a production acceptance.**
Source of design: current Michael dashboard `student-business-ai-finance.html` and
`business-ai-finance-b2-02.html`. The course *material* is NOT to be modified.

## Verified current estate (read-only)
- 18 distinct `student-*.html` legacy dashboard routes, not 18 confirmed unique learners.
- Supabase Auth: **17 user accounts**; course membership rows: **9**;
  classroom room rows: **12**; progress rows: **57**.
- 120 public root HTML pages, including 18 dashboard routes. The content
  fingerprint manifest currently pins **117** unchanged HTML pages byte-for-byte.
- Connected project is ACTIVE_HEALTHY.
- **No verifiable restorable database backup was obtained**, and the exposed
  Supabase connector has no backup/restore-test action. A count of tables with
  backup-like names is **not** evidence of a database backup.
- No live SQL DDL/INSERT/UPDATE/DELETE is permitted by this phase.

## Dashboard route-by-route source audit

| Route | Current rendering | Target / work needed |
|---|---|---|
| student-business-ai-finance.html | Michael shared cabinet | Canonical reference, regressions only |
| student-art-b1.html | Michael shared cabinet | Retain, verify assignments and source data |
| student-business-ai.html | Michael shared cabinet | Retain, verify assignments and source data |
| student-country-house.html | Michael shared cabinet | Retain, verify assignments and source data |
| student-english-placement.html | Michael shared cabinet + private access | Retain, test independent auth/negative cases |
| student-feed-b2.html | Michael shared cabinet | Retain, verify assignments |
| student-finance-b1.html | Michael shared cabinet | Retain, verify assignments |
| student-first-sales.html | Michael shared cabinet | Retain, verify assignments |
| student-general-english-b1-stories.html | Michael renderer, gated by course RPC | Retain, continue cross-device vocabulary audit |
| student-general-english-b1.html | **Old** `#student-home` | **Draft PR #49:** exact Michael cabinet renderer after course auth |
| student-general-english-b2.html | Michael shared cabinet | Retain, verify assignments |
| student-ielts-reading.html | Michael shared cabinet + private access | Retain, verify private progress |
| student-pharma.html | Michael shared cabinet | Retain, verify assignments |
| student-sweden.html | Large, independent inline HTML/CSS/JS | **Blocked:** preserve old page until verified student identity, cloud mappings, backup and rollback |
| student-tiktok-a2.html | **Old** dashboard + standalone dictionary | **Draft PR #49:** exact Michael cabinet and four-mode vocab after auth |
| student-travel-a2.html | Michael shared cabinet | Retain, verify assignments |
| student-travel-b2.html | **Old** `#student-home` | **Draft PR #49:** exact Michael cabinet after auth |
| student-turkey.html | Large, independent inline HTML/CSS/JS | **Blocked:** preserve old page until account/assignment and localStorage safely mapped |

**Dashboard baseline:** 12 routes already use Michael's shared template directly,
one (`general-english-b1-stories`) uses it after protected authorization,
three use the same component in draft #49, two inline legacy routes remain.

## Lesson-engine audit and safety rules
- A shared **cabinet** is not equal to a shared **lesson**.
- Current lesson engines still include the Michael v1 lesson renderer, the
  B1 stories/Vimbox workbook, legacy room/workbook templates, IELTS private
  pages and independent older inline exercises. Shared CSS alone must never be
  claimed as full behavioural parity.
- Do not rename lesson ID, exercise ID, homework path, keys, chat storage,
  assigned course or existing progress namespace.
- Never alter lesson text, grammar/vocabulary targets, task instructions,
  answer options, correct answers, images, audio, or homework content. This
  phase specifically excludes ALL methodology/material improvements.
- Existing URLs must keep working; a route redirect is allowed only after
  server-backed authorization and verified teacher assignment.
- Reuse the exact Michael UI components for video, near-selection translation,
  dictionary, chat and homework when **their authorization contracts** are
  compatible. Do not connect old courses to Michael's finance-only endpoints.
- Some personal vocabulary/chat/attempts exist only in device localStorage,
  which server-side inventory and backup cannot access. Migration requires a
  non-destructive on-device import and conflict-aware merging.

## Release gates (not yet satisfied)
1. Verifiably restorable database backup and tested rollback, including the
   appropriate Auth/RLS and custom schema data.
2. Teacher-reviewed mapping of **each actual student** to active lesson and
   homework, beyond bare HTML route names.
3. Runtime adapter or shared lesson engine supporting every legacy exercise
   type without changing material, answer IDs or storage namespace.
4. End-to-end authorization, cross-account denial, both user roles, mobile,
   homework publication, realtime messages and video lifecycle.
5. A per-account acceptance table and explicit approval before redirecting
   active students or migrating production data.

## What PR #49 changes right now
- Only three legacy **dashboard pages**, one reusable protected loader in
  `assets/gostudy-sync.js`, shared shell CSS and regression tests.
- The historical lesson/homework pages and all 15 other student dashboards are
  locked by Git blob SHA-1 and unchanged, proven by
  `scripts/check-lesson-content-preserved.cjs`.
- No database changes or routing redirects. The PR remains **DRAFT** until the
  required backup and complete parity tests exist.

Related: Issue #4, draft PR #5 master migration contract, draft PR #49.
