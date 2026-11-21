create table public.gostudy_art_lesson_selection (
 student_id uuid primary key references auth.users(id) on delete cascade,
 teacher_id uuid not null references auth.users(id),
 lesson_path text not null default 'art-b1-03.html'
  check (lesson_path in ('art-b1-03.html','art-b1-04.html')),
 updated_at timestamptz not null default now()
);
alter table public.gostudy_art_lesson_selection enable row level security;
grant select on public.gostudy_art_lesson_selection to authenticated;
grant update (lesson_path,updated_at) on public.gostudy_art_lesson_selection to authenticated;
revoke all on public.gostudy_art_lesson_selection from anon;
create policy art_selection_read on public.gostudy_art_lesson_selection for select to authenticated
using (((select auth.uid())=student_id or (select auth.uid())=teacher_id)
 and exists (select 1 from public.gostudy_classroom_rooms r where r.student_id=gostudy_art_lesson_selection.student_id and r.teacher_id=gostudy_art_lesson_selection.teacher_id and r.course='art-b1' and r.lesson_path='art-b1-03.html'));
create policy art_selection_teacher_update on public.gostudy_art_lesson_selection for update to authenticated
using ((select auth.uid())=teacher_id and exists (select 1 from public.gostudy_classroom_rooms r where r.student_id=gostudy_art_lesson_selection.student_id and r.teacher_id=gostudy_art_lesson_selection.teacher_id and r.course='art-b1' and r.lesson_path='art-b1-03.html'))
with check ((select auth.uid())=teacher_id and exists (select 1 from public.gostudy_classroom_rooms r where r.student_id=gostudy_art_lesson_selection.student_id and r.teacher_id=gostudy_art_lesson_selection.teacher_id and r.course='art-b1' and r.lesson_path='art-b1-03.html'));
insert into public.gostudy_art_lesson_selection (student_id,teacher_id)
select student_id,teacher_id from public.gostudy_classroom_rooms where course='art-b1' and lesson_path='art-b1-03.html'
on conflict do nothing;