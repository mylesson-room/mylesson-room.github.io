-- ALREADY APPLIED TO SUPABASE project kawfqlohguwvmmplvrny on 2026-11-21.
-- Idempotent reference migration; not an invitation to re-execute at PR merge.
-- Existing pre-migration Sweden browser vocabulary is intentionally NOT imported.
-- Authorized student words survive devices and lesson changes through one cloud table.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gostudy_sweden_words (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  word_key text NOT NULL CHECK (length(word_key) BETWEEN 1 AND 150 AND word_key=lower(word_key)),
  en text NOT NULL CHECK (length(en) BETWEEN 1 AND 150),
  ru text NOT NULL CHECK (length(ru) BETWEEN 1 AND 300),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,word_key)
);
ALTER TABLE public.gostudy_sweden_words ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gostudy_sweden_words FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE(en,ru,updated_at) ON public.gostudy_sweden_words TO authenticated;
DROP POLICY IF EXISTS sweden_words_members_read ON public.gostudy_sweden_words;
CREATE POLICY sweden_words_members_read ON public.gostudy_sweden_words
 FOR SELECT TO authenticated
 USING (gostudy_private.gostudy_classroom_member(student_id,teacher_id,'sweden-a2'));
DROP POLICY IF EXISTS sweden_words_student_insert ON public.gostudy_sweden_words;
CREATE POLICY sweden_words_student_insert ON public.gostudy_sweden_words
 FOR INSERT TO authenticated
 WITH CHECK(student_id=(SELECT auth.uid())
   AND gostudy_private.gostudy_classroom_member(student_id,teacher_id,'sweden-a2'));
DROP POLICY IF EXISTS sweden_words_member_update ON public.gostudy_sweden_words;
CREATE POLICY sweden_words_member_update ON public.gostudy_sweden_words
 FOR UPDATE TO authenticated
 USING(student_id=(SELECT auth.uid())
   AND gostudy_private.gostudy_classroom_member(student_id,teacher_id,'sweden-a2'))
 WITH CHECK(student_id=(SELECT auth.uid())
   AND gostudy_private.gostudy_classroom_member(student_id,teacher_id,'sweden-a2'));
CREATE OR REPLACE FUNCTION public.gostudy_sweden_save_word(p_en text,p_ru text)
RETURNS TABLE(en text,ru text,word_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_student uuid;
  v_teacher uuid;
  v_count int;
  v_en text := btrim(p_en);
  v_ru text := btrim(p_ru);
  v_key text := lower(btrim(p_en));
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE='42501'; END IF;
  IF v_en IS NULL OR v_ru IS NULL OR length(v_en) NOT BETWEEN 1 AND 150
      OR length(v_ru) NOT BETWEEN 1 AND 300 THEN
      RAISE EXCEPTION 'Invalid word' USING ERRCODE='22023';
  END IF;
  SELECT count(*),min(s.student_id::text)::uuid,min(s.teacher_id::text)::uuid INTO v_count,v_student,v_teacher
  FROM gostudy_private.lesson_course_students s
  WHERE s.course='sweden-a2' AND (s.student_id=v_me OR s.teacher_id=v_me);
  IF v_count<>1 OR v_teacher IS NULL OR v_student IS NULL THEN
      RAISE EXCEPTION 'No access to Sweden vocabulary' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  INSERT INTO public.gostudy_sweden_words AS w(student_id,teacher_id,word_key,en,ru)
  VALUES(v_student,v_teacher,v_key,v_en,v_ru)
  ON CONFLICT ON CONSTRAINT gostudy_sweden_words_pkey
  DO UPDATE SET en=excluded.en,ru=excluded.ru,updated_at=now()
    WHERE w.teacher_id=excluded.teacher_id
  RETURNING w.en,w.ru,w.word_key;
END $$;
REVOKE ALL ON FUNCTION public.gostudy_sweden_save_word(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gostudy_sweden_save_word(text,text) TO authenticated;
COMMIT;
-- QA executed with SET LOCAL ROLE authenticated and simulated student/teacher/outsider
-- session subjects inside a transaction that was ROLLED BACK:
-- Student RPC save PASS; teacher RPC save PASS; teacher read 1; unrelated read 0; unrelated RPC denied.
-- No QA words persist in the table.
-- Real phone-to-computer validation remains outstanding until student UI release.
