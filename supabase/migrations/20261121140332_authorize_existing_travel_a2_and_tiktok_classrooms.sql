-- Authorize only existing course-bound teacher/student pairs for TikTok A2 and Travel A2.
-- All other membership cases and RLS rules remain intact.
CREATE OR REPLACE FUNCTION gostudy_private.gostudy_classroom_member(p_student uuid, p_teacher uuid, p_course text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT (SELECT auth.uid()) IN (p_student,p_teacher) AND (
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
$function$
;
