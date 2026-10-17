const express = require('express')
const crypto = require('node:crypto')
const core = require('../utils/developerApiCore')
function createIntegrationRouter(deps = {}) {
 const Key = deps.Key || require('../models/DeveloperApiKey')
 const Log = deps.Log || require('../models/DeveloperApiLog')
 const User = deps.User || require('../models/User')
 const resources = deps.resources || require('../utils/developerApiResources').resources
 const router = express.Router()
 router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  const json = res.json.bind(res)
  res.json = value => json(core.redact(JSON.parse(JSON.stringify(value))))
  next()
 })
 router.use(async (req, res, next) => {
  try {
   const raw = req.get('X-API-Key') || ''
   if (!/^ins_live_[A-Za-z0-9_-]{43}$/.test(raw)) return res.status(401).json({ success: false, message: 'A valid X-API-Key header is required.' })
   const key = await Key.findOne({ keyHash: core.hashKey(raw) })
   const owner = key ? await User.findById(key.owner).select('-password') : null
   if (!core.isUsableKey(key, owner)) return res.status(401).json({ success: false, message: 'API key expired, revoked, or owner access disabled.' })
   req.developerKey = key
   req.user = owner
   req.user.role = 'Admin'
   next()
  } catch (err) { next(err) }
 })
 router.use(async (req, res, next) => {
  try {
   const started = Date.now(), requestId = crypto.randomUUID(), parts = req.path.split('/').filter(Boolean)
   const log = await Log.create({ keyId: req.developerKey._id, owner: req.developerKey.owner, requestId, method: req.method, resource: parts[0] || '', recordId: /^[a-f\d]{24}$/i.test(parts[1] || '') ? parts[1] : '' })
   res.set('X-Request-Id', requestId)
   res.on('finish', () => { Promise.all([Log.updateOne({ _id: log._id }, { $set: { statusCode: res.statusCode, durationMs: Date.now() - started } }), Key.updateOne({ _id: req.developerKey._id }, { $set: { lastUsedAt: new Date() } })]).catch(() => console.error('Developer API metadata update failed:', requestId)) })
   next()
  } catch (err) { next(err) }
 })
 const dispatch = async (req, res, next) => {
  try {
   const resource = req.params.resource
   if (!Object.hasOwn(resources, resource)) core.fail(404, 'Unknown integration resource.')
   const entry = resources[resource], action = core.ACTIONS[req.method]
   if (!entry.actions.includes(action) || (entry.singleton && req.params.id)) core.fail(405, 'Method not supported for this resource.')
   if (!req.developerKey.scopes.includes(resource + ':' + action)) core.fail(403, 'Permission required: ' + resource + ':' + action)
   if (req.params.id && !/^[a-f\d]{24}$/i.test(req.params.id)) core.fail(400, 'Record ID must be a MongoDB ObjectId.')
   if (!req.params.id && ['update', 'delete'].includes(action) && !entry.singleton) core.fail(405, 'A record ID is required. Bulk update/delete is not supported.')
   if (action === 'create' && req.params.id) core.fail(405, 'Create uses the collection URL.')
   if (action === 'read') Object.defineProperty(req, 'query', { value: core.validateQuery(req.query, entry), configurable: true })
   if (['create', 'update'].includes(action)) core.validateBody(req.body, entry)
   if (resource === 'users' && action !== 'read') {
    if (req.body?.role !== undefined && typeof req.body.role !== 'string') core.fail(400, 'User role must be a string.')
    if (req.body?.role && ['Admin', 'Super Admin'].includes(req.body.role)) core.fail(403, 'Admin accounts are managed through the Admin panel.')
    if (req.params.id) {
     const target = await User.findById(req.params.id).select('-password')
     if (target && ['Admin', 'Super Admin'].includes(target.role)) core.fail(403, 'Admin accounts are managed through the Admin panel.')
    }
   }
   const method = action === 'read' ? (req.params.id ? 'getById' : 'getAll') : action === 'delete' ? 'remove' : action
   const handler = entry.controller[method]
   if (!handler) core.fail(405, 'Method not supported.')
   return handler(req, res, next)
  } catch (err) { next(err) }
 }
 router.all('/:resource', dispatch)
 router.all('/:resource/:id', dispatch)
 router.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  const code = error.statusCode || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : res.statusCode >= 400 ? res.statusCode : 500)
  res.status(code).json({ success: false, message: code === 500 ? 'Integration request failed. Check the request ID with your administrator.' : error.message, requestId: res.get('X-Request-Id') })
 })
 return router
}
module.exports = { createIntegrationRouter }
