# INSEET CRM API

Open **Admin ? API Developer** at /admin/api-developer.

## Connect your CRM

1. Sign in with an active Admin account.
2. Set a connection name, expiry, and resource permissions. Default access is read-only for jobs, companies, candidates and applications.
3. Generate a key and copy it immediately. Only its SHA-256 hash is stored; the original key cannot be retrieved.
4. Store it as INSEET_API_KEY in your CRM server's environment/secret store. Do not embed it in public browser or mobile code.
5. Set INSEET_API_BASE to the base URL shown in the Developer screen. Local development uses http://localhost:5050/api/integrations/v1. For deployment, use the production backend origin, not the frontend origin.
6. Send X-API-Key on every request. Keys do not replace the Admin login for key management.

The CRM integration uses the same MongoDB records as the website; existing job review, account validation and file cleanup rules apply. Website pages show changes when their data is fetched/refreshed. This feature supplies the API; it does not configure your separate CRM automatically.

## Example requests

Run on your CRM server with its environment variables configured:

~~~bash
# List / export one page
curl "$INSEET_API_BASE/candidates?page=1&limit=100" \
  -H "X-API-Key: $INSEET_API_KEY"

# Add a job (jobs:create permission)
curl -X POST "$INSEET_API_BASE/jobs" \
  -H "X-API-Key: $INSEET_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Sales Executive","company":"Your Company","location":"Pune, India","type":"Full Time","status":"Active","approval":"Approved","accountDepartmentStatus":"Active"}'

# Edit a record (jobs:update permission)
curl -X PATCH "$INSEET_API_BASE/jobs/RECORD_ID" \
  -H "X-API-Key: $INSEET_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Senior Sales Executive"}'

# Delete a record (jobs:delete permission)
curl -X DELETE "$INSEET_API_BASE/jobs/RECORD_ID" \
  -H "X-API-Key: $INSEET_API_KEY"
~~~

Input: a JSON object matching the resource schema. Output:

~~~json
{"success":true,"data":[{"_id":"507f1f77bcf86cd799439011","name":"Example"}],"pagination":{"page":1,"limit":100,"total":1,"pages":1}}
~~~

Single-record reads and writes return one object in data. Create returns 201; successful reads/edits/deletes return 200. Store the returned _id in your CRM for subsequent updates/deletes. Follow pagination.pages for complete exports; the limit is at most 100.

## Resources and permissions

Permission names are resource:read, resource:create, resource:update and resource:delete. PUT and PATCH both require update. Unsupported scopes and wildcard permissions are rejected.

- jobs (including freelance/contract jobs)
- candidates
- applications (including freelance proposals)
- companies
- employers
- users
- freelancer-profiles
- resumes
- recruiter-documents
- categories
- locations
- payments
- pricing-packages
- career-jobs
- press-news
- content-pages
- faqs
- testimonials
- video-testimonials
- support-messages
- newsletter-subscribers
- site-branding (GET and PUT/PATCH only, without a record ID)

The UI displays live schema field names, types, required fields and enum values. Download OpenAPI JSON there for Postman or your CRM integration tooling. The downloaded document uses the configured backend URL.

GET /resource reads a page; POST /resource creates; GET /resource/:id reads one; PUT/PATCH /resource/:id edits; DELETE /resource/:id deletes. Record IDs must be MongoDB ObjectIds. Collection-wide update/delete and arbitrary database operations are not exposed.

Site branding is a singleton: GET /site-branding and PUT/PATCH /site-branding. Updates merge with existing settings. Provider secret configuration is not part of this resource.

List queries support documented scalar field filters, literal search text, sort (e.g. -updatedAt), page, limit and updatedSince (an ISO date). Searches are interpreted as literal text, not arbitrary regular expressions. updatedSince is inclusive and supports create/update polling; it does **not** return deletion tombstones or supply automatic webhooks. API-initiated deletes return the deleted ID. Reconcile website-side deletes with a complete ID export when needed.

## Controls and boundaries

- Only Admin login sessions can create/manage keys. A CRM key cannot manage other keys or grant itself additional scopes.
- Management is scoped to the current key owner; another Admin's connection is not listed or editable here.
- A key stops working on expiry, revocation, owner deletion, owner deactivation, or loss of Admin role. Its scopes are checked on every request.
- Admin accounts cannot be created/edited/deleted through CRM keys. Passwords, tokens, Google identities and provider secrets are removed from API responses.
- Users support local password-based account creation. Identity-provider settings remain in the Admin panel. User phone/avatar changes use the existing account controller.
- DELETE can also remove associated cloud files or recruiter account/document records according to existing resource controllers. There is no bulk delete endpoint.
- Resume/document CRUD manages records and file metadata/URLs. Binary upload/download/signing endpoints continue to use their existing authenticated website flows.
- Payment CRUD controls payment **records**. It does not execute charges, refunds or transfers, activate purchased subscriptions, or bypass gateway verification.
- Campaign sending, email/WhatsApp delivery, private provider settings, package-balance/credit operations, key management and location-history administration are not generic CRM CRUD resources.
- CRM exports of CMS records do not re-seed default records that were deleted.
- There are 120 requests/minute per key, plus the existing server-wide limit. Use retry/backoff on 429. Limits use the app's existing in-memory rate-limit approach; distributed production deployments may add a shared store.

## Request history and errors

Admin ? API Developer shows key-scoped request metadata for 90 days: method, resource, record ID, HTTP status, duration and request ID. It does not store raw API keys or input/output bodies. Metadata is recorded before dispatching a business-data operation; if the initial log write fails, that operation is not executed. Status 0 means unfinished; final metadata updates are best-effort after response completion. Authentication failures and requests blocked before the audit middleware are not recorded in this table.

The response includes X-Request-Id. Error bodies use { success: false, message, requestId? }.

- 400: invalid payload, field, ID, filter or validation
- 401: missing/invalid/expired/revoked key or disabled owner
- 403: missing permission or blocked Admin-account operation
- 404: unknown resource/record
- 405: unsupported method or missing record ID
- 409: duplicate record
- 429: rate limit
- 500: backend failure; use the request ID when investigating

Keys are shown only once. For rotation, create a replacement, update your CRM server configuration, verify it, then revoke the old key.

## Verification

- node --test scripts/developer-admin.test.cjs scripts/developer-api.test.cjs
- node scripts/developer-api-browser.mjs (local frontend and isolated Chrome debugging port 9333 required; uses synthetic intercepted API responses)
- npm.cmd --prefix frontend run build

Backend tests use model stubs and an isolated HTTP server. They do not modify real database records or send messages. Browser tests exercise generation, masking, dismissal, access editing, revocation and responsive layouts at 375/768/1440 px. Real local backend health and both authentication gates were checked after restarting the development API; no real integration key was generated automatically.
