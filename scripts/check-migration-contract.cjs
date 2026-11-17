/* Static migration guard: blocks accidental relaxing of the proposed auth model.
 * No connections, secrets, or real student data are read. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const schema=read('docs/PROPOSED-unified-supabase-schema.sql');
const rpc=read('docs/PROPOSED-atomic-lesson-assignment.sql');
const student=read('assets/gostudy-unified-cabinet.js');
const teacher=read('assets/gostudy-teacher-assignments.js');
const migration=read('docs/backup-and-reconciliation-gate.md');
for(const table of ['gostudy_teacher_students','gostudy_profiles','gostudy_lesson_catalog','gostudy_lesson_assignments']){
  assert.match(schema,new RegExp('CREATE TABLE public\\.'+table+'\\b'),'Missing canonical table '+table);
  assert.match(schema,new RegExp('ALTER TABLE public\\.'+table+' ENABLE ROW LEVEL SECURITY'),'Missing mandatory RLS for '+table);
}
assert.match(schema,/CREATE UNIQUE INDEX gostudy_one_active_lesson_per_student/);
assert.match(schema,/WHERE status = 'active'/);
assert.match(schema,/gostudy_profiles_teacher_update/);
assert.match(schema,/WITH CHECK/);
assert.match(schema,/gostudy_assignments_teacher_insert/);
assert.match(schema,/owner_teacher_id uuid REFERENCES auth\.users/);
assert.match(schema,/owner_teacher_id = \(SELECT auth\.uid\(\)\) OR owner_teacher_id IS NULL/);
assert.match(rpc,/lesson\.owner_teacher_id IS NULL OR lesson\.owner_teacher_id=v_teacher/);
assert.match(rpc,/SECURITY INVOKER/);
assert.doesNotMatch(rpc,/SECURITY DEFINER/i);
assert.match(rpc,/pg_advisory_xact_lock/);
assert.match(rpc,/IF v_assignment IS NOT NULL THEN RETURN v_assignment/);
assert.match(rpc,/gostudy_teacher_students/);
assert.match(rpc,/GRANT EXECUTE ON FUNCTION.+TO authenticated/);
assert.match(teacher,/rpc\/gostudy_activate_student_lesson/);
assert.doesNotMatch(teacher,/\/rest\/v1\/gostudy_lesson_assignments\?.*method:\s*'PATCH'/);
assert.match(student,/response\.data\?\.code === 'PGRST205'/);
assert.match(student,/data\.length === 1/);
assert.match(migration,/restor/i);
assert.match(migration,/localStorage/);
for(const [filename,sql] of [['schema',schema],['rpc',rpc]]){
  const executable=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
  assert.doesNotMatch(executable,/^\s*(?:DROP|TRUNCATE|DELETE\s+FROM)\b/gim,filename+' proposal contains destructive statements');
}
console.log('GoStudy migration contract: proposed RLS, teacher scope, atomic idempotent assignment, fail-closed legacy bridge, rollback gate PASS');
