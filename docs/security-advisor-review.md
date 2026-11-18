# GoStudy — production Supabase security review (READ-ONLY)

Observed on 2026-11-18. This is an audit of existing grants and Advisor findings, NOT a change in database permissions. No student identifiers, answers, words or secrets are included.

## Security Advisor summary
- **15 tables** have RLS enabled but no policy. Some are in a private schema and may intentionally be inaccessible to direct Data API; others are historic public roster/word tables. Do not assume either safe or unsafe without reviewing grants and SECURITY DEFINER access paths.
- **One function flagged as executable by anon:** `public.rls_auto_enable()` is `SECURITY DEFINER` and grants EXECUTE to both `anon` and `authenticated`. Inspected body: event-trigger function that attempts to enable RLS when a new public table is created, via `pg_event_trigger_ddl_commands()`. The Advisor finding is real, but this function's event-trigger return type and use context mean exploitability has NOT been demonstrated. Do not call it to test, and do not revoke it blindly in production.
- **Six legacy functions** are `SECURITY DEFINER` and executable by authenticated users: `gostudy_finance_b1_assign_word(uuid,text,text)`, `gostudy_finance_b1_my_words()`, `gostudy_finance_b1_teacher_view()`, `gostudy_travel_a2_assign_word(uuid,text,text)`, `gostudy_travel_a2_my_words()`, `gostudy_travel_a2_teacher_view()`. They must enforce teacher/student ownership inside the function because the definer context can bypass table RLS depending on ownership and privileges.
- Supabase Security Advisor also warns that leaked-password protection is disabled. This is an account configuration matter, not a reason to mutate auth settings without a reviewed plan.

## Function-body inspection completed (read-only)
- Both `gostudy_*_assign_word` functions select the target student from their respective private membership table with `teacher_id = auth.uid()` AND `student_id = p_student` before writing. They use explicit empty `search_path`. This is a good ownership check in the code, but actual cross-teacher denial must still be tested with different JWTs.
- Both `gostudy_*_teacher_view` functions query only membership rows with `s.teacher_id = auth.uid()`; progress and word subqueries are scoped to each selected member. No obvious unscoped all-student result was found in the inspected definition.
- Both `gostudy_*_my_words()` functions filter `student_id = auth.uid()`; no cross-account list in their inspected SQL definitions.
- These are code-review observations, **not validated RLS penetration tests**. Do not remove existing membership tables or SECURITY DEFINER functions until replacement endpoints are proven correct and historical vocabulary is preserved.

## Required staging checks before release
1. Review `pg_get_functiondef`, `proowner`, `proacl`, and `has_function_privilege` for each privileged function; trace all callers in the legacy JS. Confirm explicit equality with `auth.uid()`, proper membership lookup and safe `search_path`; do not expose another student's dictionary/answers.
2. On isolated restore with synthetic users A/B and teacher A/B, call each read and write RPC with forged student IDs. Require foreign read/write DENIAL, not merely a hidden UI.
3. Verify the event-trigger hook `rls_auto_enable` is actually needed and whether generic RPC exposure is appropriate. On staging, validate proposed privilege changes against migrations/DDL. Only then plan revocation (if warranted).
4. Review all 15 no-policy tables: grants, exposed API schemas, RLS, and function access paths. An RLS-enabled no-policy table is often fail-closed, but privileged functions may still access it.
5. Evaluate enabling leaked-password protection as a separate change with an administrator-approved auth settings plan, without resetting existing student credentials.
6. Keep all tests and evidence free of real student payloads. Store account-level results privately, not in this public repo.

## Immediate engineering rules
- New GoStudy RPCs: use `SECURITY INVOKER` unless a justified function requires definer privileges; authenticate every caller, scope by teacher/student relationship, and deny other students.
- Never deploy proposed SQL until full restorable backup, owner mapping, staging negative RLS tests and customer acceptance.
- Do NOT interpret a passing mocked Playwright test as proof of real RLS behavior.

Source: production Supabase Security Advisor plus read-only `pg_proc`/`pg_namespace` function-grant inspection on 2026-11-18.
