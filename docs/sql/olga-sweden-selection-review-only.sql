-- REVIEW ONLY: never run until Sweden browser-local backup has been exported,
-- restored in a test browser, and accepted by the owner and Centralization.
-- This is one student / course; all unrelated course rows remain untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gostudy_sweden_lesson_selection (
  student_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lesson_path text NOT NULL DEFAULT 'sweden-a2-02.html'
    CHECK (lesson_path IN ('sweden-a2-02.html', 'sweden-a2-03.html')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gostudy_sweden_lesson_selection ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gostudy_sweden_lesson_selection FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gostudy_sweden_lesson_selection TO authenticated;
DROP POLICY IF EXISTS sweden_selection_member_read ON public.gostudy_sweden_lesson_selection;
CREATE POLICY sweden_selection_member_read
ON public.gostudy_sweden_lesson_selection
FOR SELECT TO authenticated
USING (
  (student_id = (SELECT auth.uid()) OR teacher_id = (SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM gostudy_private.lesson_course_students
    WHERE student_id = gostudy_sweden_lesson_selection.student_id
      AND teacher_id = gostudy_sweden_lesson_selection.teacher_id
      AND course = 'sweden-a2'
  )
);
-- Only the server-owned RPC can mutate a selection AND its active course room.
CREATE OR REPLACE FUNCTION public.gostudy_sweden_set_lesson(p_lesson_path text)
RETURNS TABLE(student_id uuid, lesson_path text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_student uuid;
  v_count integer;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE='42501'; END IF;
  IF p_lesson_path NOT IN ('sweden-a2-02.html','sweden-a2-03.html') OR p_lesson_path IS NULL
    THEN RAISE EXCEPTION 'Invalid Sweden lesson' USING ERRCODE='22023';
  END IF;
  SELECT COUNT(*), MIN(s.student_id) INTO v_count,v_student
  FROM gostudy_private.lesson_course_students s
  WHERE s.course='sweden-a2' AND s.teacher_id=v_me;
  IF v_count <> 1 OR v_student IS NULL
    THEN RAISE EXCEPTION 'Not authorized to assign Sweden lesson' USING ERRCODE='42501';
  END IF;
  -- Single transaction ensures that the student dashboard and the joined
  -- course room always point to the same active lesson.
  INSERT INTO public.gostudy_sweden_lesson_selection AS a
    (student_id,teacher_id,lesson_path,updated_at)
  VALUES (v_student,v_me,p_lesson_path,now())
  ON CONFLICT (student_id) DO UPDATE SET
    lesson_path=EXCLUDED.lesson_path,updated_at=now()
  WHERE a.teacher_id=v_me;
  IF NOT FOUND THEN RAISE EXCEPTION 'Existing assignment owned by someone else' USING ERRCODE='42501'; END IF;
  INSERT INTO public.gostudy_classroom_rooms AS r
    (student_id,teacher_id,course,lesson_path,student_label)
  VALUES (v_student,v_me,'sweden-a2',p_lesson_path,'Ольга')
  ON CONFLICT (student_id,course) DO UPDATE SET
    lesson_path=EXCLUDED.lesson_path
  WHERE r.teacher_id=v_me;
  IF NOT FOUND THEN RAISE EXCEPTION 'Existing Sweden classroom owned by someone else' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT v_student,p_lesson_path;
END $$;
REVOKE ALL ON FUNCTION public.gostudy_sweden_set_lesson(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gostudy_sweden_set_lesson(text) TO authenticated;
-- Seed from existing private enrollment ONLY. Do NOT modify other rooms or
-- choose lesson 3 without an actual teacher action.
INSERT INTO public.gostudy_sweden_lesson_selection(student_id,teacher_id,lesson_path)
SELECT student_id,teacher_id,'sweden-a2-02.html'
FROM gostudy_private.lesson_course_students
WHERE course='sweden-a2'
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO public.gostudy_classroom_rooms(student_id,teacher_id,course,lesson_path,student_label)
SELECT student_id,teacher_id,'sweden-a2','sweden-a2-02.html','Ольга'
FROM gostudy_private.lesson_course_students
WHERE course='sweden-a2'
ON CONFLICT (student_id,course) DO NOTHING;
COMMIT;
-- REQUIRED rollout tests:
-- 1 student sees only self + cannot call teacher RPC; unrelated user sees no row
-- 2 authorized teacher sees only Olga; RPC switches 02 <-> 03 atomically
-- 3 room lesson_path exactly matches selection after each switch
-- 4 old browser-local answer keys stay untouched and export/restore passes
-- 5 new lesson 03 real student+teacher answer/page/chat/word tests; video
-- 6 JaaS signed token endpoint separately tests denial/allowlist, then real two-party call
