# API verification report

Live checks recorded at 2026-10-17T10:24:24.856Z.

## Results

| Check | Result |
| --- | --- |
| Automated API suite | 310 passed, 0 failed |
| CRM resources | All 22 resource dispatch/scope and generic CRUD lifecycles passed using isolated in-memory records |
| Browser checks | 10 passed: key creation, permissions, secret handling, revocation, responsive layouts |
| Local CORS | 12 GET, POST/login and OPTIONS checks passed, including production-mode origin checks |
| Restarted local server | 4 health/auth validation checks passed, no database writes |
| https://www.inseet.in | 0/45 passed; 45 failed |
| https://inseet.in | 0/45 passed; 45 failed |
| https://inseet.onrender.com | 45/45 passed; 0 failed |
| Route inventory | 184 registered method/path entries inventoried |

## Additional frontend verification

- Complete frontend production build passed.
- All 81 backend JavaScript files passed syntax checks.
- 84 authenticated admin/candidate/recruiter layout checks passed at 375, 768 and 1280px, with zero issues.
- 9 sidebar checks passed, including relevant icons, opening Campaigns without a crash, active links and mobile closing.
- 4 browser error/recovery checks passed using the exact non-JSON hosting 404 scenario.
- Shared API utilities lint with zero errors or warnings.

## Fixes made from test failures

- Optional authentication now returns 401 for invalid or expired JWTs instead of 500.
- Login validates email/password presence and types before database/password operations, returning 400 for invalid input.
- Public signup validates names/emails and rejects privileged roles. Candidate, users, freelancer and recruiter signup remain supported.
- Google signup rejects privileged roles before contacting external services.
- All Campaigns now has an icon; its missing component could crash the sidebar when expanded. Menu icons now match their destinations.
- Shared API handling rejects HTML/invalid JSON as errors, preserves backend validation messages, and distinguishes connection, permission, routing, server and rate-limit failures. Failed writes are never automatically retried.
- Both deployment-root configurations route /api/* to the current https://inseet.onrender.com backend. The effective Vercel root is frontend.

## Live blocker

The backend passed all 45 unauthenticated read-only checks (public endpoints return 200; protected endpoints return the expected 401). Both public INSEET domains returned Vercel 404 for all 45 paths. The effective frontend/vercel.json rewrite fix exists locally but has not been deployed in this session. Authentication fixes also require a backend deployment. No Vercel/Render deployment credentials or authenticated Vercel CLI were available in this session. The live site must not be described as fully passing.

## Coverage boundaries

The 184-entry inventory is not a claim that every business operation was executed. Real login/password checking and JWT middleware are tested with a fixture user, and actual protected routers are tested without credentials. CRM HTTP tests execute real dispatch, field allowlists, scope checks, audit hooks and generic CRUD using isolated model records. They do not run every resource-specific file/provider hook against production.
No live data was added, edited or deleted. Real Google OAuth accounts, email/WhatsApp delivery, file storage providers and real financial transactions were not exercised. Their end-to-end behavior remains unverified.

## Saved evidence

- output/all-api-tests.txt
- output/api-audit/live-results.json
- output/api-audit/route-inventory.json
- output/api-audit/browser-results.txt

Repeatable commands: npm run test:api and npm run audit:api. The live audit writes its report and exits nonzero when an endpoint fails.

## Permanent API policy update

The old Header/rate/history notice is removed. New keys default to no expiry. Per-key throttling is removed and CRM integrations bypass the general application limiter. History has no TTL. The existing MongoDB createdAt TTL index was removed successfully. One existing active dated key was left compatible with the old live backend; the updated production startup converts old active keys once, without reviving expired/revoked keys or converting future intentionally dated keys. 310 automated tests and 14 API Developer browser checks pass, including 130 requests with one permanent key. Frontend production build passes. Live behavior changes still require deployment.
