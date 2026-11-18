-- READ-ONLY verification query: aggregate counts ONLY. Safe to run on production.
-- No names, emails, student IDs, private payloads or answers are returned.
-- Refer to docs/backup-and-reconciliation-gate.md for last independently observed baseline.
-- Run before AND after any staged migration, and against an isolated restored snapshot.
WITH membership_links AS (
  SELECT teacher_id, student_id FROM public.gostudy_classroom_rooms
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_finance_room
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_b2_teacher_students
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_feed_b2_roster
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_first_sales_roster
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_pharma_c1_roster
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_tiktok_a2_roster
  UNION ALL SELECT teacher_id, student_id FROM public.gostudy_private_lessons
  UNION ALL SELECT teacher_id, student_id FROM gostudy_private.lesson_course_students
  UNION ALL SELECT teacher_id, student_id FROM gostudy_private.travel_a2_students
  UNION ALL SELECT teacher_id, student_id FROM gostudy_private.finance_b1_students
), distinct_links AS (
  SELECT DISTINCT teacher_id, student_id FROM membership_links
), identity_counts AS (
  SELECT
    (SELECT count(*) FROM auth.users) AS auth_users,
    (SELECT count(DISTINCT teacher_id) FROM distinct_links) AS teachers,
    (SELECT count(DISTINCT student_id) FROM distinct_links) AS students,
    (SELECT count(*) FROM distinct_links) AS teacher_student_pairs,
    (SELECT count(*) FROM auth.users u
       WHERE NOT EXISTS (
         SELECT 1 FROM distinct_links l
         WHERE l.teacher_id = u.id OR l.student_id = u.id
       )) AS unlinked_auth_users,
    (SELECT count(*) FROM (
       SELECT student_id FROM distinct_links
       GROUP BY student_id HAVING count(DISTINCT teacher_id) > 1
     ) t) AS multi_teacher_students
), legacy_counts AS (
  SELECT
    (SELECT count(*) FROM public.gostudy_classroom_rooms) AS classroom_rooms,
    (SELECT count(*) FROM public.gostudy_finance_room) AS finance_rooms,
    (SELECT count(*) FROM public.gostudy_classroom_events) AS classroom_events,
    (SELECT count(*) FROM public.gostudy_finance_events) AS finance_events,
    (SELECT count(*) FROM public.gostudy_progress) AS progress_records,
    (SELECT count(*) FROM public.gostudy_private_lessons) AS private_lessons,
    (SELECT count(*) FROM public.gostudy_vocabulary_items) AS public_vocabulary_records,
    (SELECT count(*) FROM gostudy_private.travel_a2_words) AS travel_a2_words,
    (SELECT count(*) FROM gostudy_private.finance_b1_words) AS finance_b1_words,
    (SELECT count(*) FROM gostudy_private.travel_b2_workbook_words) AS travel_b2_words,
    (SELECT count(*) FROM gostudy_private.course_workbook_words) AS private_course_workbook_words,
    (SELECT count(*) FROM public.gostudy_homework_assignments) AS homework_drafts,
    (SELECT count(*) FROM public.gostudy_homework_published) AS published_homework
)
SELECT * FROM identity_counts CROSS JOIN legacy_counts;
