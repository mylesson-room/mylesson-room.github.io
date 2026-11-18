create or replace function gostudy_private.gostudy_classroom_member(p_student uuid, p_teacher uuid, p_course text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) in (p_student,p_teacher) and (
    (p_course = 'finance-b1' and exists (
      select 1 from gostudy_private.finance_b1_students
      where (student_id,teacher_id)=(p_student,p_teacher)
    )) or exists (
      select 1 from gostudy_private.lesson_course_students
      where (student_id,teacher_id,course)=(p_student,p_teacher,p_course)
    )
  )
$$;

create policy finance_b1_word_student_insert
on public.gostudy_finance_word_progress for insert to authenticated
with check (
  student_id=(select auth.uid()) and exists (
    select 1 from public.gostudy_classroom_rooms r
    where r.course='finance-b1' and r.student_id=(select auth.uid())
  )
);

alter table public.gostudy_classroom_events
  drop constraint gostudy_classroom_events_kind_check,
  add constraint gostudy_classroom_events_kind_check
  check (kind in ('answer','reset','page','chat','word','word_mastered'));

insert into public.gostudy_classroom_rooms(student_id,teacher_id,course,lesson_path,student_label)
select student_id,teacher_id,'finance-b1','finance-b1-ai-20261118.html',student_label
from gostudy_private.finance_b1_students
on conflict (student_id,course) do nothing;

with candidates as (
  select r.id,r.student_id as actor, w.en,w.ru, 1 as priority
  from public.gostudy_classroom_rooms r
  join gostudy_private.finance_b1_words w on (w.student_id,w.teacher_id)=(r.student_id,r.teacher_id)
  where r.course='finance-b1' and r.lesson_path='finance-b1-ai-20261118.html'
  union all
  select r.id,r.student_id as actor,item.word->>'en',item.word->>'ru',2
  from public.gostudy_classroom_rooms r
  join public.gostudy_progress p on p.user_id=r.student_id and p.lesson_key in (
    'gostudy-finance-b1-v1','gostudy-finance-b1-homework-v1','gostudy-finance-b1-02-v1',
    'gostudy-finance-b1-02-homework-v1','gostudy-vocabulary-finance-b1-v1'
  )
  cross join lateral jsonb_array_elements(case when jsonb_typeof(p.state->'words')='array'
    then p.state->'words' else '[]'::jsonb end) item(word)
  where r.course='finance-b1' and r.lesson_path='finance-b1-ai-20261118.html'
), words as (
  select distinct on (id,lower(btrim(en))) id,actor,btrim(en) en,btrim(ru) ru
  from candidates
  where length(btrim(en)) between 1 and 150 and length(btrim(ru)) between 1 and 500
  order by id,lower(btrim(en)),priority,en,ru
)
insert into public.gostudy_classroom_events(room_id,id,actor,kind,payload)
select id,gen_random_uuid(),actor,'word',jsonb_build_object('en',en,'ru',ru) from words;

CREATE OR REPLACE FUNCTION public.gostudy_finance_b1_teacher_view()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.student_id,
    'label', s.student_label,
    'progress', (select coalesce(jsonb_agg(jsonb_build_object('key',p.lesson_key,'page',p.state->'page','answers',p.state->'answers') order by p.lesson_key),'[]'::jsonb)
      from public.gostudy_progress p where p.user_id=s.student_id and p.lesson_key in (
        'gostudy-finance-b1-v1','gostudy-finance-b1-homework-v1','gostudy-finance-b1-02-v1','gostudy-finance-b1-02-homework-v1','gostudy-finance-b1-ai-20261118-v1')),
    'words', (select coalesce(jsonb_agg(distinct item.word),'[]'::jsonb)
      from public.gostudy_progress p
      cross join lateral jsonb_array_elements(case when jsonb_typeof(p.state->'words')='array' then p.state->'words' else '[]'::jsonb end) item(word)
      where p.user_id=s.student_id and p.lesson_key in ('gostudy-finance-b1-v1','gostudy-finance-b1-homework-v1')),
    'assigned', (select coalesce(jsonb_agg(jsonb_build_object('en',w.en,'ru',w.ru) order by w.en),'[]'::jsonb)
      from gostudy_private.finance_b1_words w where w.student_id=s.student_id and w.teacher_id=s.teacher_id)
  ) order by s.student_label),'[]'::jsonb)
  from gostudy_private.finance_b1_students s where s.teacher_id=(select auth.uid());
$function$;
