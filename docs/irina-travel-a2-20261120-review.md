# Irina A2+ · Travel lesson methodology and release check

## Source of truth
- Student course: existing protected `country-house` enrollment. **Do not migrate enrollment or modify/delete any existing progress.**
- Current new lesson: `country-house-travel-a2-05.html`
- Corresponding new homework: `country-house-travel-a2-05-homework.html`
- Existing old lesson `country-house-a2-04.html` and homework `country-house-a2-04-homework.html` remain unchanged, as do older vocabulary records.
- Design reference: Michael's existing `gostudy-v1-cabinet.js/css`, `gostudy-v1-lesson.js/css`, premium feed, chat, JaaS video and selection translation. No duplicate student-specific lesson engine.

## Course quality review (internal editorial assessment, not a learning-outcomes measurement)

| Criterion | Score | Evidence |
| --- | ---: | --- |
| CEFR A2+ appropriateness | 9.5 | 144-word readable travel message; straightforward Past Simple; contextualised unfamiliar words |
| Outcome alignment | 9.7 | Vocabulary, reading, grammar, Q&A and final personal story all support telling a pleasant travel experience |
| Warmth and learner relevance | 9.7 | Genuine preferences and nice memories, no missions, pressure, negative disruptions or forced roleplay |
| Vocabulary selection | 9.6 | Six high-frequency usable chunks, repeated in reading, output and follow-on homework |
| Scaffolding | 9.5 | Warm-up → meaning → reading → form → questions → choices → personal story → recall |
| Speaking time | 9.6 | 25+ minutes for guided/free conversation with natural follow-ups |
| Grammar and answer keys | 9.6 | Single Past Simple focus; checked unique options and correct indices |
| Activity variety and visual hierarchy | 9.3 | Cards, matching, text, controlled grammar, MCQ, discussion and saved writing |
| Realistic 50-minute timing | 9.3 | 6 + 8 + 8 + 7 + 6 + 6 + 7 + 2 = 50 |
| Homework continuation | 9.6 | 14 minutes reinforcing the same six chunks and a friendly personal message |

**Editorial overall: 9.54/10 (self-assessment)**. This does not guarantee a real teacher/learner evaluation; classroom validation remains necessary.

## Release invariants
1. Main and previous student data must not change except the new static cabinet assignment and course catalog.
2. No database DDL or data migration, and new lesson/homework use distinct cloud progress keys.
3. Student and teacher must be authorized using existing course enrollment and room. Previous classroom room path remains as the compatibility route for realtime chat and page movement.
4. A distinct signed JaaS token endpoint is scoped to existing Country House student/teacher roles, without sharing Michael's finance room.
5. Teacher review endpoint is **read-only**, returns answers only after verifying student assignment; no public user data/credentials in GitHub.
6. The new homework does not show a video call; legacy homework still works.
7. Check desktop/mobile Chrome, keyboard, no horizontal overflow, selection translator, dictionary, chat, real Jitsi iframe lifecycle, answer restore and rejection for unauthorized users.

## Remaining product limitations
The account still uses a country-house database course key for continuity. The new travel lesson content and dashboard title are A2+. The underlying finance-style live chat transport is shared rather than a fully course-neutral reusable service; generalising it across all students requires a separate, tested architecture migration.
