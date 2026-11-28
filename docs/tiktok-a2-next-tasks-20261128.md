# TikTok A2: two appended activities — 28 November 2026

## Identity and scope

The user confirmed the existing `tiktok-a2.html` classroom after correcting the student name to Katerina. Course roster and account lookup independently matched the supplied classroom. No account, roster, assignment, progress, vocabulary, or database mutations were performed.

Base: `f74eddb0d9e110e77bab1c3cf88a27efa5faa1d1`. Separate branch: `lesson/svetlana-tiktok-next-20261128` (retains the initial request name).

The original lesson is **One More Video?, General English A2**, five pages: feed discussion; save/skip vocabulary; Mia listening; frequency adverbs; 15-second pitch. Append only pages 6 and 7. All original JSON metadata (including the 50-minute original duration), five steps, IDs, storage keys and HTML shell remain identical. The extension takes an additional 18–22 minutes. No new lesson, account rename, shared component, stylesheet, or classroom feature.

## Source and evidence

- Author: Yumna Jawad / Feel Good Foodie, **The Viral Baked Feta Pasta | Three Versions**: https://www.youtube.com/watch?v=LuroDGsJkMA
- Author's article links directly to this video and explains its TikTok context: https://feelgoodfoodie.net/recipe/baked-feta-pasta/
- On 28 November 2026 the original YouTube page loaded in the user's browser; after skipping advertising the video played at 0:00–0:04, with duration 4:57. The English caption track was exported and inspected, including the selected excerpt. Playback and caption evidence do not guarantee access from every country or network.
- Selected excerpt: **2:24–3:30**, the stove-top version and final mixing. Caption anchors: stove top 2:24; medium heat/ten minutes 2:41–2:45; basil/garlic 2:50–2:55; any kind of pasta 3:16–3:20; pasta water 3:21–3:27.
- Native speech is faster than graded A2 audio. The task is A2 **with support**: 66 seconds, two chunks, optional 0.75 speed, English captions, eight pre-taught words, Russian task instructions and extra glosses. It asks for concrete observable details, not full transcription or abstract media analysis.
- Embed uses privacy-enhanced YouTube, start/end bounds, English captions, and an external timestamp link. Opening `/embed/` directly without a referring page returned YouTube Error 153, so this is not evidence of in-lesson embed failure. The actual in-lesson player still requires a live browser check after publication; local automated tests deliberately block third-party media and cannot establish playback.
- The linked article describes the oven recipe (35 minutes), whereas the selected video segment uses the stove (10 minutes). This distinction is explicitly explained in the lesson. No transcript copied into the repository.

## Activity 6 — Watch & Learn

Eight words: pan, heat, cook, add, mix, sauce, garlic, fresh. Eight contextual vocabulary choices and four concrete video questions use the existing workbook grader. Incorrect attempts show “Try again”; correct attempts show “✓ Correct”. A collapsible key includes evidence timestamps.

Keys: vocabulary — pan; heat; cook; add; mix; sauce; garlic; fresh. Video — in a pan on the stove; 10 minutes; basil and garlic; you can use any kind.

## Activity 7 — Watch & Discuss

Four distinct decisions anchored to the video: whether a one-pan meal fits an evening; adapting ingredients for a friend's taste; choosing which steps a short clip must preserve; checking whether “ten minutes” includes the whole meal. Each asks for a reason, an observable detail or a practical information gap. A final 30-second recommendation requires two video details, one adaptation, one question and three target words. Five note fields use existing storage. Opinions have no automatic right/wrong key. Teacher and learner check four explicit speaking outcomes together.

## Explicit quality self-assessment

This is the author's self-assessment, **not an independent audit**. Scores apply to the tasks with their stated A2 supports and depend on final live checks for delivery.

| Criterion | Activity 6 | Activity 7 | Basis |
|---|---:|---:|---|
| Design | 9/10 | 9/10 | Existing Michael feed, term cards, note fields, navigation; desktop/mobile screenshots inspected; no new CSS |
| Teaching method | 9/10 | 9/10 | Preparation → focused viewing → retrieval; then evidence → personal decisions → communicative outcome |
| A2 fit | 9/10 | 9/10 | Concrete everyday topic, short supported excerpt, Russian glosses, simple choice responses, sentence stems and short spoken turns |
| Engagement | 9/10 | 9/10 | Authentic TikTok food trend connects to existing pasta/pitch tasks; learner chooses practical adaptations and recommendation |
| Video quality | 9/10 | 9/10 | Original creator, visible cooking actions, English captions, short bounded segment and official external link; native speed explicitly scaffolded |
| Question quality | 9/10 | 9/10 | Closed answers have caption evidence and distinct distractors; discussion uses different meaningful decisions and an information gap |

A 9/10 quality score is not a claim of universal media availability or real two-device classroom acceptance.

## Verification before publication

- `node scripts/check-architecture.cjs`: PASS. Updated the expected TikTok page count from 5 to 7; strengthened the guard with a SHA-256 freeze of the complete original five-step array and unique IDs. Other lesson guards unchanged.
- `node scripts/check-template-contract.cjs`: PASS.
- `node scripts/check-tiktok-next-browser.cjs`: PASS in four Chromium scenarios (synthetic student/teacher × desktop 1365×850/mobile 390×844). Checks seven pages, wrong and correct grades, all 12 closed answers, five note fields, video bounds, no horizontal overflow, dictionary, translator/chat/video shell, forward/back navigation, student reload persistence and no page JavaScript errors. No production API writes; external media blocked.
- Screenshots of both appended pages on desktop/mobile inspected. Local artifacts are excluded from the commit.
- `node scripts/validate-lesson-template.cjs`: FAIL on unrelated `art-b1-04.html`, reproduced in the pre-existing checkout; that file and validator are unchanged. This older validator is not a step in the existing publication workflow.
- The existing publication workflow is unchanged. Automatic approval review rejected a proposed command that would also have added a new CI step; that proposal was abandoned. The new browser test runs separately, while existing repository CI remains in force.

## Remaining live acceptance

At this commit: publication and real teacher/student end-to-end acceptance are not yet established. After merging, confirm deployment, load the ordinary classroom URL, navigate from page 5 to pages 6–7, and test the embedded player or the external fallback. Do not claim successful real cross-device synchronization, chat delivery or video call without separate real-session evidence. No production answer edits are needed to verify rendering.
