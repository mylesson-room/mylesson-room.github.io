alter table public.gostudy_classroom_rooms
  add column student_label text check (length(student_label) <= 100);
