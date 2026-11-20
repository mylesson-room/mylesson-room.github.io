# Olga Sweden A2 — acceptance contract: Michael is the only baseline

**Status 2026-11-21: BLOCKED / DRAFT ONLY.** New video-token function deployed, but **no production Pages merge, database SQL writes, or student lesson reassignment**. A high methodology score alone is NOT acceptance.

## Reference
- Michael lesson: `business-ai-finance-b2-02.html`
- Michael cabinet: `student-business-ai-finance.html`
- Olga cabinet: `student-sweden.html` (old cabinet copied intact to `sweden-cabinet-legacy.html`)
- New lesson: `sweden-a2-03.html`; homework: `sweden-a2-03-homework.html`
- Do not change any original `sweden-a2.html`, `sweden-a2-02.html`, or historical homework.
- Lesson 02 must remain assigned until teacher explicitly switches to Lesson 03.

## Release blockers (all mandatory)
- [ ] **Video**: identical Michael/JaaS video tile, button, controls, camera/mic/leave/expand, compact and expanded layout. The new lesson loads the same `gostudy-jaas-video.js` as Michael with a Sweden-only scope and signed JWT endpoint. `gostudy-jaas-sweden-token` was deployed in Supabase (active v1); it checks teacher/student course membership without a service-role key. **Still required:** real two-party audio/video connection and allow/deny membership testing on real authenticated devices.
- [ ] **Call persistence**: same mounted Jitsi iframe survives every intra-lesson section change on desktop and mobile; verify iOS Safari, not just DOM inspection. Do not promise cross-document navigation persistence: changing actual HTML pages may destroy the iframe; require deliberate architecture for this.
- [ ] **Translator**: highlight word/phrase -> same Michael Google translation UI, direction, + action, visible added-word confirmation, and updated word count. Verify both EN→RU and RU→EN on desktop and mobile.
- [ ] **Vocabulary**: same Michael header button, dialog, stored words, teacher/student updates, cross-device sync and persistence after refresh. Existing Olga words must remain available, including legacy browser-only data. Current old words are **not yet migrated** to the new canonical store.
- [ ] **Live answers**: student choice/input/writing, teacher view, lesson navigation, and teacher-selected page update in both directions. Confirm using two authenticated sessions and correct course-scoped permissions.
- [ ] **Chat**: teacher/student messages with correct room and identities, real-time and after reload.
- [ ] **Visual parity**: compare every screen and button position with Michael at desktop 1440 px and iPhone viewport, with responsive video left / exercise right, overlay/popup alignment, accessibility and no obsolete Telemost button.
- [ ] **Assignments**: teacher-only RLS changes selected lesson, learner cannot write; unassigned users cannot see any Sweden progress. Confirm from separate teacher, Olga, and unrelated student sessions.
- [ ] **Data protection**: verify restorable backup of old browser-local words/answers before changing the production cabinet. Confirm original lesson and homework still open. The branch's copy of the old HTML is **not** a backup of browser localStorage.
- [ ] **Methodology**: independent manual review >=9/10 (A2 level, natural language, answer keys, listening quality, 50-min pacing, homework), followed by runnable automated answer-key/content checks. Current numeric self-rating is preliminary, not an external quality guarantee.
- [ ] **QA & release**: PR checks green, production preview, authenticated teacher+student walkthrough on desktop and phone, then owner acceptance; only then merge and deploy.

## Known technical gaps in this draft
1. The Sweden-scoped JaaS endpoint is deployed and the shared video client is loaded, but no real teacher/student video call has been completed.
2. Translator and dictionary have not been tested with real Olga data.
3. Old Sweden browser-only progress has not been backed up or migrated to the canonical store.
4. Cloud selection RLS migration is staged as review-only SQL and has **not** run; current production Sweden room/lesson selection remains unchanged.
5. Teacher RPC and classroom event synchronization have not passed real two-account tests.
6. No real iOS/desktop visual acceptance yet.

**Rule:** Do not label this PR "ready" and do not publish it merely because the lesson's self-assessed method score is >=9.
