-- Persist IELTS classroom words through the existing membership-checked event RPC.
-- No direct teacher write policies and no public privileged function are added.
create or replace function gostudy_private.persist_ielts_classroom_word()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare target uuid; english text; russian text;
begin
  if new.kind <> 'word' or new.actor is distinct from (select auth.uid()) then return new; end if;
  select r.student_id into target
  from public.gostudy_classroom_rooms r
  where r.id=new.room_id and r.course='ielts-reading'
    and new.actor in (r.student_id,r.teacher_id)
    and gostudy_private.gostudy_classroom_member(r.student_id,r.teacher_id,r.course)
    and exists (select 1 from public.gostudy_private_lessons p where p.student_id=r.student_id and p.teacher_id=r.teacher_id and p.published);
  if target is null then return new; end if;
  if jsonb_typeof(new.payload->'en') <> 'string' or jsonb_typeof(new.payload->'ru') <> 'string' then return new; end if;
  english := btrim(new.payload->>'en'); russian := btrim(new.payload->>'ru');
  if coalesce(english,'')='' or coalesce(russian,'')='' or length(english)>150 or length(russian)>500 then return new; end if;
  insert into public.gostudy_vocabulary_items(user_id,word_key,english,russian)
  values(target,lower(english),english,russian)
  on conflict(user_id,word_key) do update
    set english=excluded.english,russian=excluded.russian,updated_at=now();
  return new;
end;
$$;
revoke all on function gostudy_private.persist_ielts_classroom_word() from public,anon,authenticated;
create trigger persist_ielts_classroom_word
after insert on public.gostudy_classroom_events
for each row when (new.kind='word')
execute function gostudy_private.persist_ielts_classroom_word();
