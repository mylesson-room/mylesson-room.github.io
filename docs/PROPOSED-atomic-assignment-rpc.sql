-- PROPOSAL ONLY — REVIEW AND BACK UP BEFORE PRODUCTION.
-- Depends on docs/PROPOSED-unified-supabase-schema.sql, not yet deployed.
-- Suggested API for assets/gostudy-teacher-assignments.js.
-- Requires RLS policies from base schema and preseeded verified teacher_student rows.
-- Read actual current Supabase docs before applying.

-- SQL procedure is transactional. The old active lesson becomes archived before the
-- new record becomes active. The advisory lock prevents concurrent lesson switches
-- for the *same* student even when multiple browser tabs submit simultaneously.
-- EXECUTION is restricted to the authenticated current teacher.
CREATE OR REPLACE FUNCTION public.gostudy_activate_student_lesson(
  p_student_id uuid,
  p_lesson_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_teacher uuid := (SELECT auth.uid());
BEGIN
  IF v_teacher IS NULL OR p_student_id IS NULL OR p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized or invalid input'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gostudy_teacher_students relation
    WHERE relation.teacher_id = v_teacher
      AND relation.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Teacher is not assigned to this student'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gostudy_lesson_catalog l
    WHERE l.lesson_id = p_lesson_id
  ) THEN
    RAISE EXCEPTION 'Lesson is not available'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gostudy:lesson-assignment:' || p_student_id::text, 0)
  );

  -- Only this teacher's records can be modified; RLS also checks this.
  -- Another teacher's active assignment must not be silently archived.
  IF EXISTS (
    SELECT 1
    FROM public.gostudy_lesson_assignments a
    WHERE a.student_id=p_student_id
      AND a.status='active'
      AND a.teacher_id<>v_teacher
  ) THEN
    RAISE EXCEPTION 'Another teacher already has an active assignment'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.gostudy_lesson_assignments a
  SET status='archived'
  WHERE a.student_id=p_student_id
    AND a.teacher_id=v_teacher
    AND a.status='active';

  -- Avoid duplicating an earlier archived assignment for the same lesson.
  -- The chosen row is reactivated; exactly one active per student (partial unique index).
  UPDATE public.gostudy_lesson_assignments a
  SET status='active',
      published_at=pg_catalog.now(),
      assigned_at=pg_catalog.now()
  WHERE a.student_id=p_student_id
    AND a.teacher_id=v_teacher
    AND a.lesson_id=p_lesson_id;

  IF NOT FOUND THEN
    INSERT INTO public.gostudy_lesson_assignments
      (student_id, teacher_id, lesson_id, status, published_at)
    VALUES (p_student_id, v_teacher, p_lesson_id, 'active', pg_catalog.now());
  END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.gostudy_activate_student_lesson(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gostudy_activate_student_lesson(uuid,text)
  TO authenticated;

-- BEFORE rollout, add uniqueness on (teacher_id,student_id,lesson_id) for
-- idempotency; check and reconcile any duplicates first:
-- ALTER TABLE public.gostudy_lesson_assignments
--   ADD CONSTRAINT gostudy_assignment_unique_lesson
--   UNIQUE (teacher_id,student_id,lesson_id);
--
-- If that uniqueness constraint isn't present the UPDATE can reactivate
-- more than one legacy row for same lesson; reject deploy until confirmed.
-- 
-- SECURITY: PG must test SELECT/UPDATE RLS for 2 teachers and 2 students.
-- Check function owner EXECUTE grants and role permissions. Do not use
-- SECURITY DEFINER to bypass missing RLS/GRANT.
-- Compare old/new assignment counts, and keep old room/history data.
