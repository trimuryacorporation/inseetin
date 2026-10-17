const crypto = require('node:crypto')
const ACTIONS = Object.freeze({ GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' })
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }) }
function hashKey(key) { return crypto.createHash('sha256').update(key).digest('hex') }
function generateKey() {
 const key = 'ins_live_' + crypto.randomBytes(32).toString('base64url')
 return { key, keyHash: hashKey(key), prefix: key.slice(0, 17) }
}
function validateScopes(value, registry) {
 if (!Array.isArray(value) || !value.length || value.length > 200) fail(400, 'Select at least one valid permission.')
 const scopes = [...new Set(value)]
 for (const scope of scopes) {
  if (typeof scope !== 'string') fail(400, 'Invalid permission.')
  const [resource, action, extra] = scope.split(':')
  if (extra || !Object.hasOwn(registry, resource) || !registry[resource].actions.includes(action)) fail(400, 'Invalid permission: ' + scope)
 }
 return scopes
}
function validateKeyInput(body, registry, now = Date.now()) {
 if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Expected a JSON object.')
 const name = String(body.name || '').trim(), expiresAt = body.expiresAt == null || body.expiresAt === '' ? null : new Date(body.expiresAt)
 if (!name || name.length > 80) fail(400, 'Name must contain 1 to 80 characters.')
 if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now || expiresAt.getTime() > now + 365 * 86400000)) fail(400, 'Choose an expiry within the next 365 days.')
 return { name, scopes: validateScopes(body.scopes, registry), expiresAt }
}
function isUsableKey(key, owner, now = Date.now()) {
 return Boolean(key && !key.revokedAt && (key.expiresAt == null || new Date(key.expiresAt).getTime() > now) && owner && ['Admin', 'Super Admin'].includes(owner.role) && owner.status === 'Active')
}
function rejectOperators(value) {
 if (!value || typeof value !== 'object') return
 for (const [key, child] of Object.entries(value)) {
  if (key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) fail(400, 'MongoDB operators and unsafe property names are not supported.')
  rejectOperators(child)
 }
}
function validateBody(body, entry) {
 if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) fail(400, 'Send a non-empty JSON object.')
 rejectOperators(body)
 const fields = new Set(entry.fields.map(field => field.name))
 for (const name of Object.keys(body)) if (!fields.has(name)) fail(400, 'Unknown or read-only field: ' + name)
 return body
}
function validateQuery(query, entry) {
 const normalized = {}, fields = new Set(entry.fields.filter(field => !/password|secret|token|googleid/i.test(field.name)).map(field => field.name).concat(['_id', 'createdAt', 'updatedAt']))
 for (const [key, value] of Object.entries(query)) {
  if (typeof value !== 'string' || value.length > 1000) fail(400, 'Query values must be plain strings with at most 1000 characters.')
  if (['page', 'limit'].includes(key)) {
   const number = Number(value)
   if (!Number.isSafeInteger(number) || number < 1 || (key === 'limit' && number > 100)) fail(400, 'Use a positive page and a limit from 1 to 100.')
   normalized[key] = value
  } else if (key === 'search') normalized.search = value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')
  else if (key === 'sort') {
   if (!value.split(/[ ,]+/).every(field => fields.has(field.replace(/^-/, '')))) fail(400, 'Sort must use documented fields.')
   normalized.sort = value
  } else if (key === 'updatedSince') {
   const since = new Date(value)
   if (!Number.isFinite(since.getTime())) fail(400, 'updatedSince must be an ISO date.')
   normalized.updatedAt = { $gte: since }
  } else if (fields.has(key)) normalized[key] = value
  else fail(400, 'Unsupported filter: ' + key)
 }
 return normalized
}
function redact(value) {
 if (Array.isArray(value)) return value.map(redact)
 if (!value || typeof value !== 'object') return value
 return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|keyhash|googleid|authorization|signature/i.test(key)).map(([key, child]) => [key, redact(child)]))
}
module.exports = { ACTIONS, fail, generateKey, hashKey, isUsableKey, redact, validateBody, validateKeyInput, validateQuery, validateScopes }
