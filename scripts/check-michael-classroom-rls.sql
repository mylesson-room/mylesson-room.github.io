-- Production RLS verification with transaction-local claims and mandatory rollback.
-- No passwords/tokens, no policy changes, no persisted assignments or answers.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"acf2f6a1-f38b-45ef-836d-6cc9a9a5a832","role":"authenticated"}';
do $$
begin
 if (select count(*) from public.gostudy_private_lessons where slug='michael-ai-finance-lesson-2-new')<>1 then raise exception 'Teacher cannot read NEW'; end if;
 if (select lesson_path from public.gostudy_finance_lesson_selection where student_id='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6') <> 'business-ai-finance-b2-02.html' then raise exception 'Unexpected current assignment'; end if;
 update public.gostudy_finance_lesson_selection set lesson_path='business-ai-finance-b2-02-new.html' where student_id='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6';
 if not found then raise exception 'Teacher cannot select NEW'; end if;
 update public.gostudy_finance_lesson_selection set lesson_path='business-ai-finance-b2-02.html' where student_id='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6';
 if not found then raise exception 'Teacher cannot select OLD'; end if;
 insert into public.gostudy_homework_assignments(student_id,teacher_id,lesson_path,exercise_ids) values('e4f31916-6d4c-49c8-9b80-0e2a233fc6c6','acf2f6a1-f38b-45ef-836d-6cc9a9a5a832','business-ai-finance-b2-02-new.html','["michael-finance2-new-v1:finance2-gap-01"]');
 insert into public.gostudy_homework_published(student_id,teacher_id,lesson_path,exercise_ids,published_at) values('e4f31916-6d4c-49c8-9b80-0e2a233fc6c6','acf2f6a1-f38b-45ef-836d-6cc9a9a5a832','business-ai-finance-b2-02-new.html','["michael-finance2-new-v1:finance2-gap-01"]',now());
end $$;
set local request.jwt.claims = '{"sub":"e4f31916-6d4c-49c8-9b80-0e2a233fc6c6","role":"authenticated"}';
do $$
declare changed integer;
begin
 if (select count(*) from public.gostudy_private_lessons where slug='michael-ai-finance-lesson-2-new')<>1 then raise exception 'Student cannot read NEW'; end if;
 update public.gostudy_finance_lesson_selection set lesson_path='business-ai-finance-b2-02-new.html' where student_id='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6';
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'Student changed assignment'; end if;
 if (select count(*) from public.gostudy_homework_assignments where lesson_path='business-ai-finance-b2-02-new.html')<>0 then raise exception 'Student sees teacher draft'; end if;
 if (select count(*) from public.gostudy_homework_published where lesson_path='business-ai-finance-b2-02-new.html')<>1 then raise exception 'Student cannot see published homework'; end if;
 insert into public.gostudy_homework_answers(student_id,teacher_id,lesson_path,exercise_id,answer) values('e4f31916-6d4c-49c8-9b80-0e2a233fc6c6','acf2f6a1-f38b-45ef-836d-6cc9a9a5a832','business-ai-finance-b2-02-new.html','michael-finance2-new-v1:finance2-gap-01','{"value":"stress test"}');
 if (select count(*) from public.gostudy_homework_answers where lesson_path='business-ai-finance-b2-02-new.html')<>1 then raise exception 'Student answer not visible'; end if;
end $$;
set local request.jwt.claims = '{"sub":"acf2f6a1-f38b-45ef-836d-6cc9a9a5a832","role":"authenticated"}';
do $$
begin
 if (select count(*) from public.gostudy_homework_answers where lesson_path='business-ai-finance-b2-02-new.html')<>1 then raise exception 'Teacher cannot see student homework answer'; end if;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
 if (select count(*) from public.gostudy_private_lessons where slug='michael-ai-finance-lesson-2-new')<>0 then raise exception 'Outsider sees NEW'; end if;
 if (select count(*) from public.gostudy_finance_lesson_selection)<>0 then raise exception 'Outsider sees assignment'; end if;
 if (select count(*) from public.gostudy_homework_published where lesson_path='business-ai-finance-b2-02-new.html')<>0 then raise exception 'Outsider sees homework'; end if;
 if (select count(*) from public.gostudy_homework_answers where lesson_path='business-ai-finance-b2-02-new.html')<>0 then raise exception 'Outsider sees answers'; end if;
end $$;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
 begin
  if (select count(*) from public.gostudy_private_lessons where slug='michael-ai-finance-lesson-2-new')<>0 then raise exception 'Anonymous sees NEW'; end if;
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select jsonb_build_object('rls_assertions','PASS','current_assignment',(select lesson_path from public.gostudy_finance_lesson_selection where student_id='e4f31916-6d4c-49c8-9b80-0e2a233fc6c6'),'new_homework_drafts',(select count(*) from public.gostudy_homework_assignments where lesson_path='business-ai-finance-b2-02-new.html'),'new_homework_published',(select count(*) from public.gostudy_homework_published where lesson_path='business-ai-finance-b2-02-new.html'),'new_answers',(select count(*) from public.gostudy_homework_answers where lesson_path='business-ai-finance-b2-02-new.html')) result;
