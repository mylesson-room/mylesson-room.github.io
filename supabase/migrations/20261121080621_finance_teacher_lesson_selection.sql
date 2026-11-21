create table public.gostudy_finance_lesson_selection (
 student_id uuid primary key references auth.users(id) on delete cascade,
 teacher_id uuid not null references auth.users(id),
 lesson_path text not null default 'business-ai-finance-b2-02.html'
  check (lesson_path in ('business-ai-finance-b2-02.html','business-ai-finance-b2-03.html')),
 updated_at timestamptz not null default now()
);
alter table public.gostudy_finance_lesson_selection enable row level security;
grant select on public.gostudy_finance_lesson_selection to authenticated;
grant update (lesson_path,updated_at) on public.gostudy_finance_lesson_selection to authenticated;
revoke all on public.gostudy_finance_lesson_selection from anon;
create policy finance_selection_read on public.gostudy_finance_lesson_selection for select to authenticated
using (((select auth.uid())=student_id or (select auth.uid())=teacher_id)
 and exists (select 1 from public.gostudy_finance_room r where r.student_id=gostudy_finance_lesson_selection.student_id and r.teacher_id=gostudy_finance_lesson_selection.teacher_id));
create policy finance_selection_teacher_update on public.gostudy_finance_lesson_selection for update to authenticated
using ((select auth.uid())=teacher_id and exists (select 1 from public.gostudy_finance_room r where r.student_id=gostudy_finance_lesson_selection.student_id and r.teacher_id=gostudy_finance_lesson_selection.teacher_id))
with check ((select auth.uid())=teacher_id and exists (select 1 from public.gostudy_finance_room r where r.student_id=gostudy_finance_lesson_selection.student_id and r.teacher_id=gostudy_finance_lesson_selection.teacher_id));
insert into public.gostudy_finance_lesson_selection (student_id,teacher_id)
select student_id,teacher_id from public.gostudy_finance_room on conflict do nothing;