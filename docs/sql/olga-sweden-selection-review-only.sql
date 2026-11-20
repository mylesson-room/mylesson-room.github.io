-- REVIEW-ONLY. Do not execute until legacy Sweden browser backup is verified.
-- One active lesson per enrolled student; teacher can switch, learner can only read.
-- Existing historical lesson pages and browser storage are not modified.
begin;
create table if not exists public.gostudy_sweden_lesson_selection (
  student_id uuid primary key references auth.users(id) on delete restrict,
  teacher_id uuid not null references auth.users(id) on delete restrict,
  lesson_path text not null default 'sweden-a2-02.html'
    check (lesson_path in ('sweden-a2-02.html','sweden-a2-03.html')),
  updated_at timestamptz not null default now()
);
alter table public.gostudy_sweden_lesson_selection enable row level security;
revoke all on public.gostudy_sweden_lesson_selection from PUBLIC, anon, authenticated;
grant select on public.gostudy_sweden_lesson_selection to authenticated;
grant update (lesson_path) on public.gostudy_sweden_lesson_selection to authenticated;
drop policy if exists sweden_selection_member_read on public.gostudy_sweden_lesson_selection;
create policy sweden_selection_member_read
on public.gostudy_sweden_lesson_selection
for select to authenticated
using (student_id = (select auth.uid()) or teacher_id = (select auth.uid()));
drop policy if exists sweden_selection_teacher_update on public.gostudy_sweden_lesson_selection;
create policy sweden_selection_teacher_update
on public.gostudy_sweden_lesson_selection
for update to authenticated
using (teacher_id = (select auth.uid()))
with check (teacher_id = (select auth.uid()));
-- No client INSERT or DELETE rights. Membership is sourced exclusively from
-- the already-authorized, protected course roster by this administrative migration.
insert into public.gostudy_sweden_lesson_selection (student_id,teacher_id,lesson_path)
select student_id,teacher_id,'sweden-a2-02.html'
from gostudy_private.lesson_course_students
where course = 'sweden-a2'
on conflict (student_id) do nothing;
commit;
-- Acceptance checks before rollout:
-- 1) learner SELECT: one row for self, UPDATE denied;
-- 2) teacher SELECT + PATCH selected lesson only;
-- 3) unrelated authenticated user sees no rows;
-- 4) default selection remains old Lesson 02;
-- 5) each student's answer namespace unaffected by switching.
