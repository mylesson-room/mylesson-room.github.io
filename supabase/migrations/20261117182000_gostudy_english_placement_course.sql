alter table gostudy_private.lesson_course_students
  drop constraint lesson_course_students_course_check,
  add constraint lesson_course_students_course_check check (
    course in (
      'business-ai', 'travel-b2', 'country-house', 'general-english-b1',
      'general-english-b1-stories', 'art-b1', 'ielts-reading', 'sweden-a2',
      'general-english-b2', 'english-placement'
    )
  );
