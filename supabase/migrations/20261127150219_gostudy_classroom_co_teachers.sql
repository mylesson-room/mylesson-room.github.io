create table gostudy_private.classroom_co_teachers (
  room_id uuid not null references public.gostudy_classroom_rooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  primary key (room_id, teacher_id)
);
create index classroom_co_teachers_by_teacher
  on gostudy_private.classroom_co_teachers (teacher_id);
alter table gostudy_private.classroom_co_teachers enable row level security;
revoke all on gostudy_private.classroom_co_teachers from public, anon, authenticated;

-- Only checks the current authenticated user, and always scopes the grant to one room.
create function gostudy_private.gostudy_assigned_teacher(
  p_student uuid, p_primary_teacher uuid, p_course text, p_lesson_path text default null
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) <> p_student and exists (
    select 1
    from gostudy_private.classroom_co_teachers a
    join public.gostudy_classroom_rooms r on r.id = a.room_id
    where a.teacher_id = (select auth.uid())
      and r.student_id = p_student and r.teacher_id = p_primary_teacher
      and (p_course is null or r.course = p_course)
      and (p_lesson_path is null or r.lesson_path = p_lesson_path)
  )
$$;
revoke all on function gostudy_private.gostudy_assigned_teacher(uuid,uuid,text,text) from public, anon;
grant execute on function gostudy_private.gostudy_assigned_teacher(uuid,uuid,text,text) to authenticated;

CREATE OR REPLACE FUNCTION gostudy_private.gostudy_classroom_member(p_student uuid, p_teacher uuid, p_course text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT ((SELECT auth.uid()) IN (p_student,p_teacher)
   OR gostudy_private.gostudy_assigned_teacher(p_student,p_teacher,p_course)) AND (
  (p_course='finance-b1' AND EXISTS(
   SELECT 1 FROM gostudy_private.finance_b1_students WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR (p_course='travel-a2' AND EXISTS(
   SELECT 1 FROM gostudy_private.travel_a2_students
   WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR (p_course='tiktok-a2' AND EXISTS(
   SELECT 1 FROM public.gostudy_tiktok_a2_roster
   WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR EXISTS(
   SELECT 1 FROM gostudy_private.lesson_course_students WHERE (student_id,teacher_id,course)=(p_student,p_teacher,p_course))
  OR (p_course='feed-b2' AND EXISTS(
   SELECT 1 FROM public.gostudy_feed_b2_roster WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR (p_course='pharma-c1' AND EXISTS(
   SELECT 1 FROM public.gostudy_pharma_c1_roster WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR (p_course='first-sales' AND EXISTS(
   SELECT 1 FROM public.gostudy_first_sales_roster WHERE (student_id,teacher_id)=(p_student,p_teacher)))
  OR (p_course IN ('vietnam-a2','vietnam-a2-homework')
      AND p_student='b0a90cf8-3144-421f-8cc8-5ed893c28350'
      AND EXISTS(
       SELECT 1 FROM gostudy_private.lesson_course_students
       WHERE student_id=p_student AND teacher_id=p_teacher AND course='english-placement'))
 )
$function$;

CREATE OR REPLACE FUNCTION gostudy_private.gostudy_my_destinations()
 RETURNS TABLE(course text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select auth.uid() as id)
  select 'travel-a2' from me where exists (
    select 1 from gostudy_private.travel_a2_students s where s.student_id=me.id
  )
  union all
  select 'finance-b1' from me where exists (
    select 1 from gostudy_private.finance_b1_students s where s.student_id=me.id
  )
  union all
  select 'feed-b2' from me where exists (
    select 1 from public.gostudy_feed_b2_roster s where s.student_id=me.id
  )
  union all
  select 'first-sales' from me where exists (
    select 1 from public.gostudy_first_sales_roster s where s.student_id=me.id
  )
  union all
  select 'pharma-c1' from me where exists (
    select 1 from public.gostudy_pharma_c1_roster s where s.student_id=me.id
  )
  union all
  select 'tiktok-a2' from me where exists (
    select 1 from public.gostudy_tiktok_a2_roster s where s.student_id=me.id
  )
  union all
  select a.course from me join gostudy_private.lesson_course_students a on a.student_id=me.id
  union all
  select 'teacher' from me where
       exists (select 1 from gostudy_private.travel_a2_students s where s.teacher_id=me.id)
    or exists (select 1 from gostudy_private.finance_b1_students s where s.teacher_id=me.id)
    or exists (select 1 from public.gostudy_feed_b2_roster s where s.teacher_id=me.id)
    or exists (select 1 from public.gostudy_first_sales_roster s where s.teacher_id=me.id)
    or exists (select 1 from public.gostudy_pharma_c1_roster s where s.teacher_id=me.id)
    or exists (select 1 from public.gostudy_tiktok_a2_roster s where s.teacher_id=me.id)
  union all
  select 'teacher-assigned' from me where exists (
    select 1 from gostudy_private.classroom_co_teachers a where a.teacher_id=me.id
  );
$function$;

create policy lesson_assigned_teacher_read_published
on public.gostudy_private_lessons for select to authenticated
using (published and gostudy_private.gostudy_assigned_teacher(student_id,teacher_id,null,slug || '.html'));
