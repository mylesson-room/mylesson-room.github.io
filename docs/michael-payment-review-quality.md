# Michael · When AI Flags a Payment

Reviewed 2026-11-21. Internal methodological assessment: **9.3/10**, not an external accreditation.

Continues the existing “Can AI predict a financial crisis before it happens?” lesson: moves from forecasting risks to evaluating payment alerts and defending a proportionate action. B2, 50 minutes (5+8+9+7+9+9+3), eight active chunks. Reading is original fiction; all amounts and businesses are training examples. Recycles liquidity, risk exposure, early warning signs and outliers. No claims about real fraud rates or AI performance.

Three teaching visuals: a three-payment queue and two separate paired evidence displays. Responsive SVG, textual equivalent, accessible title; colours are backed by words. No remote image dependency. Lesson and homework payloads live in Supabase, not this public repository.

Review changes: balanced vocabulary answer positions; clarified the difference between suspicion, verification and attribution; added authorised reviewers and a verification channel; replaced categorical accusations with cautious deduction; homework includes a model after the independent writing task. All objective tasks have keys; open tasks have evaluation notes and allow alternative evidence-based decisions. Speaking assessment uses five 0–2 criteria. No listening component: focus is reading and speaking.

Only a verified teacher can update the selected lesson. A newly created selection defaults to the existing lesson. Choosing an option or opening a preview does not save it. The student home polls the persisted selection every five seconds and updates lesson and homework together. Existing words, progress keys and event history remain. New answers use finance3:/finance3hw: namespaces; page events are scoped while vocabulary and chat remain shared.

Verification: live database RLS checks under student, teacher and outsider identities run inside a rolled-back transaction; teacher update succeeds, student update affects zero rows, outsider reads zero rows. Selection remains the previous lesson. Browser CI uses isolated contexts and synthetic network responses: it does not claim a live camera/microphone call or real two-user production authentication.
