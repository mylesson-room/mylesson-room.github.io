insert into public.gostudy_classroom_rooms (student_id, teacher_id, course, lesson_path, student_label)
select lesson.student_id, lesson.teacher_id, membership.course, 'ielts-reading-04.html', 'Дарья'
from public.gostudy_private_lessons lesson
join gostudy_private.lesson_course_students membership
  on membership.student_id = lesson.student_id
  and membership.teacher_id = lesson.teacher_id
  and membership.course = 'ielts-reading'
where lesson.slug = 'ielts-reading-04'
  and lesson.published
on conflict (student_id, course) do nothing;
