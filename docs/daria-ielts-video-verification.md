# Daria · IELTS Reading video

The IELTS private lesson previously did not load the shared JaaS adapter or its stylesheet. It displayed the old Telemost placeholder. Added the existing Michael video component with the IELTS scope; no new interface implementation or cloned controls.

Private lesson access remains GoStudyPrivateAccess. The video adapter uses that verified session for IELTS and resolves the owner from the protected lesson. It never falls back to Michael's financial room. The token function validates the caller through /auth/v1/user and reads the existing IELTS Reading 04 room through JWT/RLS. Teacher and Daria get the same course-scoped room; other accounts and learner-to-teacher impersonation are denied. Signing secrets stay in existing server environment variables. verify_jwt=false is intentional: the function authenticates the bearer itself, as the other GoStudy JaaS functions do.

Unit tests verify RS256 signature, same room, teacher/student roles, malformed target, missing session, unrelated account, wrong teacher target, impersonation and unavailable signing key. Browser tests use synthetic network and SDK, covering private-page loading, exact Michael tile colours, desktop click/mobile touch, protected endpoint routing, mic/camera commands, preserved iframe across lesson pages, resize, leave, retry and unauthorized accounts. Existing IELTS material, progress and vocabulary storage code stays intact.

Live verification is reported separately from synthetic tests; a real call with two human participants requires Daria to join from her own account.
