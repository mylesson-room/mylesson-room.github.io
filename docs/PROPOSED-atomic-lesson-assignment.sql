-- DESIGN ONLY — do not execute against production until verified backup, RLS review and customer acceptance.
-- Requires docs/PROPOSED-unified-supabase-schema.sql and verified teacher-student memberships.
-- SECURITY INVOKER: caller's RLS and GRANT policies remain active.
-- Single transaction protects against the gap between archiving old lesson and assigning new.

CREATE OR REPLACE FUNCTION public.gostudy_activate_student_lesson(
  p_student_id uuid,
  p_lesson_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_teacher uuid := (select auth.uid());
  v_assignment uuid;
BEGIN
  IF v_teacher IS NULL OR p_student_id IS NULL OR p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or invalid assignment'
      USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gostudy_teacher_students rel
    WHERE rel.teacher_id=v_teacher AND rel.student_id=p_student_id
  ) THEN
    RAISE EXCEPTION 'Teacher is not assigned to this student'
      USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gostudy_lesson_catalog lesson
    WHERE lesson.lesson_id=p_lesson_id
  ) THEN
    RAISE EXCEPTION 'Lesson is unavailable' USING ERRCODE='22023';
  END IF;

  -- Transaction-scoped advisory lock serializes assignment changes per student.
  -- SELECT FOR UPDATE on memberships is intentionally avoided: authenticated
  -- role has SELECT, not UPDATE, on gostudy_teacher_students.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_student_id::text, 0)
  );

  -- Preserve answers, words and old assignments; never DELETE history.
  UPDATE public.gostudy_lesson_assignments
    SET status='archived'
    WHERE student_id=p_student_id
      AND teacher_id=v_teacher
      AND status='active';

  INSERT INTO public.gostudy_lesson_assignments(
    student_id,teacher_id,lesson_id,status,published_at
  ) VALUES (p_student_id,v_teacher,p_lesson_id,'active',now())
  RETURNING assignment_id INTO v_assignment;
  RETURN v_assignment;
END;
$function$;

REVOKE ALL ON FUNCTION public.gostudy_activate_student_lesson(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gostudy_activate_student_lesson(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.gostudy_activate_student_lesson(uuid,text) TO authenticated;

-- Mandatory before deployment (run on a STAGING database, not production):
-- (1) teacher A can assign their student; a new row is active and the old one archived;
-- (2) student cannot invoke function for themselves, even with guessed IDs;
-- (3) teacher B cannot assign teacher A's student;
-- (4) no cross-account assignment for anonymous or expired JWT;
-- (5) two concurrent teacher invocations do not violate the one-active partial index;
-- (6) missing catalog lesson rolls back without archiving current lesson;
-- (7) reload the student's cabinet and ensure exactly one published active assignment.
-- If student is linked to different teachers, design explicit ownership transfer before using.
