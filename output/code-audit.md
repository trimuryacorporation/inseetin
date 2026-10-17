# INSEET code and responsive audit

Date: 2026-10-17

## Applied changes

- Homepage categories, trending skills/roles, openings, testimonials, career workspace and footer numbers now use live API/profile data instead of sample names and inflated statistics. Loading/error/empty states are separate.
- Industries, freelancer statistics and candidate profile metrics now derive from records. Removed sample candidate phone, city, experience, salary, skills and preferred-role defaults.
- Fixed homepage category dependencies and company request error handling. Fixed freelancer dashboard API array handling.
- Candidate application totals use paginated, candidate-scoped requests. Job detail/recommendation queries use public approved job listings.
- Recruiter job search and quick actions work. Application shortlist/reject/select buttons call the backend and refresh the lists. Payment records and company fields come from saved data; simulated chat/settings controls point to existing account/support flows. Freelancer saves are explicitly local to the device.
- Added the missing Internship Course route. Course title, price, hours, access duration and preview video can be changed under Admin > SEO Branding; backend normalization preserves and validates these fields. Purchase still follows the existing authentication flow; a complete course checkout/entitlement system was not added.
- Fixed undefined dropdown/error handlers and conditional hooks in admin management/detail screens.
- Mobile/tablet menus are available at the same breakpoint as desktop navigation. Mobile menus include freelance navigation and closed drawers are inert.
- Mobile search exposes city and job type. Tablet search/filter grids wrap instead of using oversized fixed columns. Auth/application/admin modals have viewport-bounded scrolling. Admin pagination is bounded rather than rendering every page button.
- Route components load on demand, and the router stays stable during modal state updates. Initial entry JavaScript is approximately 460 KB versus the previous 10.1 MB monolithic bundle; heavy location data remains a separate approximately 8.7 MB chunk on relevant pages.

## Validation

- Production frontend build: PASS (output/build-check.txt). Existing large-city-chunk warning remains.
- Public browser matrix: 19 routes at 320, 375, 768, 1024, 1280 and 1440 px; 114 checks. See output/responsive/audit.json and screenshots. Checks wait for rendered content and ignore intentional local scroll containers rather than relying only on globally clipped document width.
- Authenticated layout matrix: admin/candidate/recruiter routes tested with intercepted, synthetic API fixtures at 375, 768 and 1280 px; see output/responsive/fixtures.json. No real account mutations, messages or payment actions were performed.
- Browser scenarios cover live fixture job titles, API failure states, mobile city/type inputs, tablet menu opening and popup auto-close.
- Course-settings regression tests: 4 PASS (node --test scripts/branding-settings.test.cjs).
- Backend/serverless syntax: 77 JavaScript files PASS (output/backend-syntax.json). This is syntax validation, not a production database integration test.
- Frontend lint before: {"files":89,"errors":101,"warnings":17}. After: {"files":89,"errors":64,"warnings":15}. Runtime undefined-variable and hook-order findings are resolved. Full lint still fails: {"react-hooks/set-state-in-effect":30,"react-hooks/exhaustive-deps":15,"react-hooks/purity":2,"no-unused-vars":32}. No lint rules were disabled to hide these findings.

## Remaining limits

- This audit is not a claim that every feature is complete or fully dynamic. Remaining lint findings, unused prototype code and React effect/purity cleanup need further work.
- Actual authenticated CRUD, file uploads, course checkout, payment gateways, email/WhatsApp delivery and production deployment were not exercised with real accounts. The fixture browser tests prove rendering, responsiveness and specific frontend states, not end-to-end production integrations.
- Static explanatory copy and course module descriptions remain code-managed; configurable course business fields are available in the existing CMS. App store metrics remain admin-configured values rather than verified store analytics.
- The existing large city dataset still makes location-heavy pages expensive to download.

## Re-run

- npm.cmd --prefix frontend run build
- npm.cmd --prefix frontend run lint
- node --test scripts/branding-settings.test.cjs
- node scripts/audit-responsive.mjs
- node scripts/audit-fixtures.mjs

Browser scripts require the local frontend on port 5173 and a separate isolated Chrome debugging session on port 9333. Run them sequentially because they use test-only storage in that browser profile.
