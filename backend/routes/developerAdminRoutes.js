const express = require('express')
const { protect, authorize } = require('../middleware/authMiddleware')
const asyncHandler = require('../middleware/asyncHandler')
const Key = require('../models/DeveloperApiKey')
const Log = require('../models/DeveloperApiLog')
const { catalog, resources } = require('../utils/developerApiResources')
const { fail, generateKey, validateKeyInput } = require('../utils/developerApiCore')
const router = express.Router()
router.use(protect, authorize('Admin'))
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
router.get('/catalog', (req, res) => res.json({ success: true, data: { basePath: '/api/integrations/v1', resources: catalog(), rateLimit: null, auditRetentionDays: null, historyRetention: 'permanent' } }))
router.get('/keys', asyncHandler(async (req, res) => {
 const keys = await Key.find({ owner: req.user._id }).select('-keyHash').sort('-createdAt').lean()
 res.json({ success: true, data: keys })
}))
router.post('/keys', asyncHandler(async (req, res) => {
 if (req.user.status !== 'Active') fail(403, 'An active Admin account is required.')
 const input = validateKeyInput(req.body, resources), generated = generateKey()
 const key = await Key.create({ ...input, owner: req.user._id, keyHash: generated.keyHash, prefix: generated.prefix })
 res.status(201).json({ success: true, data: { _id: key._id, name: key.name, prefix: key.prefix, scopes: key.scopes, expiresAt: key.expiresAt, key: generated.key }, message: 'Copy the key now. It will not be shown again.' })
}))
router.put('/keys/:id', asyncHandler(async (req, res) => {
 if (!/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Invalid key ID.')
 const input = validateKeyInput(req.body, resources)
 const key = await Key.findOneAndUpdate({ _id: req.params.id, owner: req.user._id, revokedAt: null }, { $set: input }, { new: true, runValidators: true }).select('-keyHash').lean()
 if (!key) fail(404, 'Active key not found.')
 res.json({ success: true, data: key })
}))
router.delete('/keys/:id', asyncHandler(async (req, res) => {
 if (!/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Invalid key ID.')
 const key = await Key.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $set: { revokedAt: new Date() } }, { new: true }).select('-keyHash').lean()
 if (!key) fail(404, 'Key not found.')
 res.json({ success: true, data: key, message: 'CRM key revoked.' })
}))
router.get('/logs', asyncHandler(async (req, res) => {
 const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1), limit = 25
 const filter = { owner: req.user._id }
 if (req.query.keyId) { if (!/^[a-f\d]{24}$/i.test(req.query.keyId)) fail(400, 'Invalid key ID.'); filter.keyId = req.query.keyId }
 const [data, total] = await Promise.all([Log.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(), Log.countDocuments(filter)])
 res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}))
function schemaFor(entry) {
 const properties = Object.fromEntries(entry.fields.map(field => [field.name, {
  ...(field.type === 'Array' ? { type: 'array', items: {} } : field.type === 'Number' ? { type: 'number' } : field.type === 'Boolean' ? { type: 'boolean' } : field.type === 'Mixed' || field.type === 'Embedded' ? {} : { type: 'string' }),
  ...(field.type === 'Date' ? { format: 'date-time' } : {}), ...(field.enum ? { enum: field.enum } : {}), ...(field.name === 'password' ? { writeOnly: true } : {}),
 }]))
 return { type: 'object', properties, additionalProperties: false }
}
function buildOpenApi() {
 const paths = {}, schemas = {}
 for (const entry of catalog()) {
  schemas[entry.id] = schemaFor(entry)
  const bases = entry.singleton ? ['/' + entry.id] : ['/' + entry.id, '/' + entry.id + '/{id}']
  for (const path of bases) {
   const detail = path.endsWith('/{id}'), operations = {}
   const methods = entry.singleton ? [['get','read'],['put','update'],['patch','update']] : detail ? [['get','read'],['put','update'],['patch','update'],['delete','delete']] : [['get','read'],['post','create']]
   for (const [method, action] of methods) {
    operations[method] = {
     summary: action + ' ' + entry.label,
     description: 'Required permission: ' + entry.id + ':' + action + '. DELETE removes a real record and may run existing related-record/file cleanup.',
     operationId: method + '_' + entry.id.replace(/-/g,'_') + (detail ? '_by_id' : ''),
     security: [{ CrmApiKey: [] }],
     parameters: detail ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }] : method === 'get' && !entry.singleton ? [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string' } }, { name: 'updatedSince', in: 'query', schema: { type: 'string', format: 'date-time' } }] : [],
     responses: { '200': { description: 'Success: { success, data, pagination? }' }, ...(method === 'post' ? { '201': { description: 'Record created' } } : {}), '400': { description: 'Invalid payload or filter' }, '401': { description: 'Invalid, expired or revoked key' }, '403': { description: 'Permission denied' }, '404': { description: 'Record/resource not found' }, '409': { description: 'Duplicate record' }, '429': { description: 'Rate limit exceeded' } },
     ...(['post','put','patch'].includes(method) ? { requestBody: { required: true, content: { 'application/json': { schema: { ...schemaFor(entry), ...(method === 'post' ? { required: entry.fields.filter(f=>f.required).map(f=>f.name) } : {}) } } } } } : {}),
    }
   }
   paths[path] = operations
  }
 }
 return { openapi: '3.0.3', info: { title: 'INSEET CRM API', version: '1.0.0', description: 'Use from your CRM server. Store X-API-Key as a server-side secret. No bulk delete or provider-secret endpoints. updatedSince returns modified records, not deleted-record tombstones. Admin accounts cannot be mutated through integration keys. Branding updates merge with saved settings. Request history is retained without automatic expiry. Keys can remain valid until revoked.' }, servers: [{ url: '/api/integrations/v1' }], components: { securitySchemes: { CrmApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' } }, schemas }, paths }
}
router.get('/openapi.json', (req, res) => res.json(buildOpenApi()))
module.exports = { router, buildOpenApi }
