const asyncHandler = require('../middleware/asyncHandler')

function buildQuery(query) {
  const filter = {}

  for (const [key, value] of Object.entries(query)) {
    if (['page', 'limit', 'sort', 'search'].includes(key) || value === '') continue
    filter[key] = value
  }

  return filter
}

function normalizeSort(sort) {
  return String(sort || '-createdAt').replace(/,/g, ' ')
}

function crudController(Model, options = {}) {
  const searchFields = options.searchFields || []

  return {
    getAll: asyncHandler(async (req, res) => {
      const page = Math.max(Number(req.query.page) || 1, 1)
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
      const skip = (page - 1) * limit
      const filter = buildQuery(req.query)

      if (options.beforeGetAll) await options.beforeGetAll(filter, req)

      if (req.query.search && searchFields.length) {
        filter.$or = searchFields.map((field) => ({ [field]: { $regex: req.query.search, $options: 'i' } }))
      }

      try {
        let [items, total] = await Promise.all([
          Model.find(filter).sort(normalizeSort(req.query.sort)).skip(skip).limit(limit),
          Model.countDocuments(filter),
        ])

        if (options.afterGetAll) items = await options.afterGetAll(items, req)

        res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
      } catch (error) {
        if (!options.safeGet || req.developerKey) throw error
        res.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 }, warning: error.message })
      }
    }),

    getById: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id)
      if (!item) {
        res.status(404)
        throw new Error(`${Model.modelName} not found`)
      }
      if (options.canAccess && !options.canAccess(item, req)) {
        res.status(403)
        throw new Error('Forbidden: insufficient record access')
      }
      res.json({ success: true, data: item })
    }),

    create: asyncHandler(async (req, res) => {
      if (options.beforeCreate) {
        const handled = await options.beforeCreate(req.body, req)
        if (handled) return
      }
      const item = await Model.create(req.body)
      res.status(201).json({ success: true, data: item })
    }),

    update: asyncHandler(async (req, res) => {
      let existing = null
      if (options.canAccess || options.beforeUpdate || options.afterUpdate) {
        existing = await Model.findById(req.params.id)
        if (!existing) {
          res.status(404)
          throw new Error(`${Model.modelName} not found`)
        }
        if (options.canAccess && !options.canAccess(existing, req)) {
          res.status(403)
          throw new Error('Forbidden: insufficient record access')
        }
      }
      if (options.beforeUpdate) await options.beforeUpdate(req.body, req, existing)
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      if (!item) {
        res.status(404)
        throw new Error(`${Model.modelName} not found`)
      }
      if (options.afterUpdate) await options.afterUpdate(item, req, existing)
      res.json({ success: true, data: item })
    }),

    remove: asyncHandler(async (req, res) => {
      const existing = await Model.findById(req.params.id)
      if (!existing) {
        res.status(404)
        throw new Error(`${Model.modelName} not found`)
      }
      if (options.beforeRemove) await options.beforeRemove(existing, req)

      const item = await Model.findByIdAndDelete(req.params.id)
      if (!item) {
        res.status(404)
        throw new Error(`${Model.modelName} not found`)
      }
      if (options.afterRemove) await options.afterRemove(item)
      res.json({ success: true, data: item })
    }),
  }
}

module.exports = crudController
