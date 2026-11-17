create function gostudy_private.gostudy_students_without_course()
returns table(id uuid, email text)
language sql stable security definer set search_path = ''
as $$
  select student.id, student.email::text
  from auth.users student
  where student.deleted_at is null
    and student.id <> (select auth.uid())
    and student.raw_app_meta_data ->> 'gostudy_created_by' = (select auth.uid())::text
    and student.raw_app_meta_data -> 'gostudy_without_course' = 'true'::jsonb
    and exists (select 1 from public.gostudy_my_destinations() where course = 'teacher')
  order by student.email;
$$;

revoke all on function gostudy_private.gostudy_students_without_course() from public, anon;
grant execute on function gostudy_private.gostudy_students_without_course() to authenticated;

create function public.gostudy_students_without_course()
returns table(id uuid, email text)
language sql stable set search_path = ''
as $$ select * from gostudy_private.gostudy_students_without_course(); $$;

revoke all on function public.gostudy_students_without_course() from public, anon;
grant execute on function public.gostudy_students_without_course() to authenticated;
