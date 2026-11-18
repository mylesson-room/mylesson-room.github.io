# GoStudy / JaaS video pilot — NOT LIVE

## Scope and safety

- The **only** HTML page opting in is `business-ai-finance-b2-02.html` (Michael's canonical lesson). The existing sidebar layout, exercises, vocabulary, lesson chat and homework remain unchanged.
- The reusable browser adapter is `assets/gostudy-jaas-video.js` and its separate CSS file. Video never automatically opens: the participant clicks **Включить видео** after existing GoStudy classroom authentication succeeds.
- A Supabase Edge Function `supabase/functions/gostudy-jaas-token/index.ts` supplies short-lived, room-limited, RS256-signed participant JWTs. A valid GoStudy session **and** an authorized row in `gostudy_finance_room` are required.
- The teacher must pass the actual classroom student's ID through the existing `classStudent` URL parameter. Students cannot change rooms. Teacher has moderator permissions; student does not. No recording, livestreaming or transcription permission.
- There are **no database migrations, no edits to any student's data, and no production release** in this PR. No private API key, JaaS private key, JWT, answers, names, or email appears in the public code.

## One-time JaaS setup (deployment owner only)

1. JaaS account and API key are already generated; pilot **public** identifiers were inserted into the Edge Function:
   - AppID `vpaas-magic-cookie-d7a5780b9ae54dacb95d85d7d4f4191f`;
   - Key ID `vpaas-magic-cookie-d7a5780b9ae54dacb95d85d7d4f4191f/a34acd`.
   These public values can be overridden later using `JAAS_APP_ID` / `JAAS_KEY_ID` environment variables.
2. The JaaS console-generated **RSA Private Key** has been downloaded by the owner on their own device. Never upload that private key to GitHub or this chat.
3. In Supabase Dashboard → **Edge Functions → Secrets**, store only:
   - `JAAS_PRIVATE_KEY` — full locally downloaded private RSA PEM (secret), either multiline or encoded with literal `\\n` newlines.
4. Supabase-provided `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be present in the function runtime. Deploy function `gostudy-jaas-token` with `verify_jwt=false`; it **manually validates** the bearer against `/auth/v1/user` and then checks the finance-room RLS with that same user bearer. The function does **not** use service_role.
5. Deploy the video pilot only after reviewing the draft PR, passing CI, protecting main, and customer approval. To test without affecting public GitHub Pages, use an authenticated isolated preview host matching the function's allowed `Origin` (currently fixed to production origin) or a reviewed staging environment/configuration. Do not merge to main just to obtain a test URL.

## Acceptance tests

- Existing lesson chat, exercise answers, dictionary and homework remain functional.
- Teacher and matching student are in the same JaaS room; student is not moderator.
- Different student's UUID or unauthenticated caller receives 403/401 and cannot obtain a JWT.
- Both participants connect with video/audio and leave, on desktop and mobile; a 50-minute call is tested in both Russia and Vietnam.
- Page refresh does not automatically use microphone/camera. No credentials are saved in browser storage.
- External Telemost link remains available as a fallback.
- Monthly active endpoint usage is checked in the JaaS console (free developer plan is 25 MAU).

Run synthetic tests: `node scripts/check-jaas-video.cjs`. These verify access checks and JWT signatures but **do not prove real JaaS camera/video, paid usage, or production authorization**.

## Rollback

Disable the HTML opt-in `data-jaas-video-pilot` attribute and remove the two JaaS asset references, or revert this PR. This does not modify GoStudy data. Remove the Edge Function separately when no callers depend on it.

## Known blockers

- The AppID and Key ID have now been read from the owner's console and configured as public pilot defaults. The **private key has not been configured as a Supabase secret**; no production Edge Function was deployed.
- Chat mode has no authorized browser access to the user's JaaS console. Do not invent credentials or claim the call works.
- The pilot intentionally covers finance Lesson 2 only; the current generic classroom/Alla migration needs separate per-course authorization work after the first two-party call succeeds.
