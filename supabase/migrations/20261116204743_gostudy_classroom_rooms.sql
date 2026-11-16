create table public.gostudy_classroom_rooms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  lesson_path text not null check (lesson_path ~ '^[a-z0-9-]+\.html$'),
  unique (student_id, course),
  check (student_id <> teacher_id)
);
alter table public.gostudy_classroom_rooms enable row level security;
revoke all on public.gostudy_classroom_rooms from anon, authenticated;
grant select on public.gostudy_classroom_rooms to authenticated;

create function gostudy_private.gostudy_classroom_member(p_student uuid, p_teacher uuid, p_course text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) in (p_student,p_teacher) and exists (
    select 1 from gostudy_private.lesson_course_students s
    where (s.student_id,s.teacher_id,s.course)=(p_student,p_teacher,p_course)
  )
$$;
revoke all on function gostudy_private.gostudy_classroom_member(uuid,uuid,text) from public, anon;
grant execute on function gostudy_private.gostudy_classroom_member(uuid,uuid,text) to authenticated;
create policy classroom_room_members on public.gostudy_classroom_rooms
for select to authenticated using (gostudy_private.gostudy_classroom_member(student_id,teacher_id,course));

create table public.gostudy_classroom_events (
  room_id uuid not null references public.gostudy_classroom_rooms(id) on delete cascade,
  seq bigint generated always as identity,
  id uuid not null,
  actor uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('answer','reset','page','chat','word')),
  payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=15000),
  primary key (room_id, seq),
  unique (room_id, id)
);
alter table public.gostudy_classroom_events enable row level security;
revoke all on public.gostudy_classroom_events from anon, authenticated;
grant select on public.gostudy_classroom_events to authenticated;
create policy classroom_event_members on public.gostudy_classroom_events
for select to authenticated using (room_id in (select r.id from public.gostudy_classroom_rooms r));

create function gostudy_private.gostudy_classroom_send(p_room uuid, p_id uuid, p_kind text, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.gostudy_classroom_rooms r
  where r.id=p_room and gostudy_private.gostudy_classroom_member(r.student_id,r.teacher_id,r.course)
  for update;
  if not found then return false; end if;
  insert into public.gostudy_classroom_events(room_id,id,actor,kind,payload)
  values (p_room,p_id,(select auth.uid()),p_kind,p_payload)
  on conflict (room_id,id) do nothing;
  return true;
end
$$;
revoke all on function gostudy_private.gostudy_classroom_send(uuid,uuid,text,jsonb) from public, anon;
grant execute on function gostudy_private.gostudy_classroom_send(uuid,uuid,text,jsonb) to authenticated;
create function public.gostudy_classroom_send(p_room uuid, p_id uuid, p_kind text, p_payload jsonb)
returns boolean language sql set search_path = ''
as $$ select gostudy_private.gostudy_classroom_send(p_room,p_id,p_kind,p_payload) $$;
revoke all on function public.gostudy_classroom_send(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.gostudy_classroom_send(uuid,uuid,text,jsonb) to authenticated;
