-- Approved by the user on 2026-11-27. Add an available lesson; never assign it.
alter table public.gostudy_finance_lesson_selection
 drop constraint gostudy_finance_lesson_selection_lesson_path_check,
 add constraint gostudy_finance_lesson_selection_lesson_path_check
 check (lesson_path in (
  'business-ai-finance-b2-02.html',
  'business-ai-finance-b2-03.html',
  'business-ai-finance-b2-02-new.html'
 ));
