-- DESIGN REVIEW ONLY. NOT APPLIED OR EXECUTED.
-- Supabase production must not be modified before a verifiable backup + rollback.
-- Adapt/verify against current live schema, tenant links and current Supabase docs.
-- Proposal for GoStudy v1: no personal data, no passwords, no secret keys.

BEGIN;

CREATE TABLE public.gostudy_teacher_students (
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, student_id),
  CHECK (teacher_id <> student_id)
);

CREATE TABLE public.gostudy_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text NOT NULL DEFAULT 'Ученик',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gostudy_profile_name_valid CHECK (
    char_length(trim(display_name)) BETWEEN 1 AND 60
    AND display_name = trim(display_name)
  )
);

CREATE TABLE public.gostudy_lesson_catalog (
  lesson_id text PRIMARY KEY,
  course_id text NOT NULL,
  title text NOT NULL,
  lesson_path text NOT NULL UNIQUE,
  homework_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gostudy_lesson_path_safe CHECK (lesson_path ~ '^[a-z][a-z0-9-]*\.html$'),
  CONSTRAINT gostudy_homework_path_safe CHECK (homework_path IS NULL OR homework_path ~ '^[a-z][a-z0-9-]*\.html$')
);

CREATE TABLE public.gostudy_lesson_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  lesson_id text NOT NULL REFERENCES public.gostudy_lesson_catalog(lesson_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  FOREIGN KEY (teacher_id,student_id) REFERENCES public.gostudy_teacher_students(teacher_id,student_id) ON DELETE RESTRICT,
  CONSTRAINT gostudy_assignment_published_active CHECK (published_at IS NULL OR status IN ('active','archived'))
);

CREATE UNIQUE INDEX gostudy_one_active_lesson_per_student
  ON public.gostudy_lesson_assignments(student_id)
  WHERE status = 'active';

CREATE INDEX gostudy_assignment_teacher_idx
  ON public.gostudy_lesson_assignments(teacher_id,student_id);

ALTER TABLE public.gostudy_teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gostudy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gostudy_lesson_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gostudy_lesson_assignments ENABLE ROW LEVEL SECURITY;

-- Read-only teacher-student memberships. Clients cannot invent relationships.
GRANT SELECT ON public.gostudy_teacher_students TO authenticated;
CREATE POLICY gostudy_teacher_students_read ON public.gostudy_teacher_students
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (teacher_id,student_id));

-- Profiles: students can only see their own; teachers may view/update their assigned students.
GRANT SELECT ON public.gostudy_profiles TO authenticated;
GRANT UPDATE (display_name) ON public.gostudy_profiles TO authenticated;
CREATE POLICY gostudy_profiles_read ON public.gostudy_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_profiles.user_id
    )
  );
CREATE POLICY gostudy_profiles_teacher_update ON public.gostudy_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_profiles.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_profiles.user_id
    )
  );

-- Lesson assignments are teacher-managed. The student sees published active assignments only.
GRANT SELECT,INSERT,UPDATE ON public.gostudy_lesson_assignments TO authenticated;
CREATE POLICY gostudy_assignments_read ON public.gostudy_lesson_assignments
  FOR SELECT TO authenticated
  USING (
    (student_id = (SELECT auth.uid()) AND status = 'active' AND published_at IS NOT NULL)
    OR (
      teacher_id = (SELECT auth.uid()) AND EXISTS (
        SELECT 1 FROM public.gostudy_teacher_students relationship
        WHERE relationship.teacher_id = (SELECT auth.uid())
          AND relationship.student_id = gostudy_lesson_assignments.student_id
      )
    )
  );
CREATE POLICY gostudy_assignments_teacher_insert ON public.gostudy_lesson_assignments
  FOR INSERT TO authenticated WITH CHECK (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_lesson_assignments.student_id
    )
  );
CREATE POLICY gostudy_assignments_teacher_update ON public.gostudy_lesson_assignments
  FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_lesson_assignments.student_id
    )
  )
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid())
        AND relationship.student_id = gostudy_lesson_assignments.student_id
    )
  );

-- Lesson catalog metadata is visible only to teacher with students or assigned student.
-- Actual PRIVATE lesson content still needs a protected API; GitHub Pages HTML is public.
GRANT SELECT ON public.gostudy_lesson_catalog TO authenticated;
CREATE POLICY gostudy_catalog_read ON public.gostudy_lesson_catalog
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gostudy_teacher_students relationship
      WHERE relationship.teacher_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.gostudy_lesson_assignments assigned
      WHERE assigned.lesson_id = gostudy_lesson_catalog.lesson_id
        AND assigned.student_id = (SELECT auth.uid())
        AND assigned.status = 'active'
        AND assigned.published_at IS NOT NULL
    )
  );

-- Intentionally NO client INSERT/DELETE on profiles, teacher_students or lesson_catalog.
-- Seed memberships with independently verified relationships through admin-controlled migration.
-- NEVER auto-map legacy HTML to an auth user based on a coincidental label or email.
-- Seed profile rows with verified student IDs; unknown names stay 'Ученик'.
-- Keep all old events/vocabulary/progress for historical import; do not DELETE.

COMMIT;
