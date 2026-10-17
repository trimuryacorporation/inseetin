let app
let connectDB
let dbPromise

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.end(JSON.stringify(payload))
}

function getFallbackPayload(req) {
  if (req.method && req.method !== 'GET') return null

  const url = new URL(req.url || '/', 'https://local.test')
  const queryPath = url.searchParams.get('path')
  const pathname = queryPath
    ? `/${queryPath.replace(/^\/+/, '')}`
    : url.pathname.replace(/^\/api(?=\/|$)/, '')

  if (pathname === '/health') return { success: true, message: 'INSEET API fallback is running' }

  return null
}

function getAuthUnavailablePayload(req) {
  const url = new URL(req.url || '/', 'https://local.test')
  const queryPath = url.searchParams.get('path')
  const pathname = queryPath
    ? `/${queryPath.replace(/^\/+/, '')}`
    : url.pathname.replace(/^\/api(?=\/|$)/, '')
  if (!pathname.startsWith('/auth/')) return null

  return {
    success: false,
    message: 'Authentication service is not fully configured. Add MONGO_URI and JWT_SECRET in Vercel environment variables.',
    env: {
      hasMongoUri: Boolean(process.env.MONGO_URI),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
    },
  }
}

function normalizeApiUrl(req) {
  const currentUrl = req.url || '/'
  const parsed = new URL(currentUrl, 'https://local.test')
  const queryPath = parsed.searchParams.get('path')

  if (queryPath) {
    parsed.searchParams.delete('path')
    const normalizedPath = `/api/${queryPath.replace(/^\/+/, '')}`
    const queryString = parsed.searchParams.toString()
    return `${normalizedPath}${queryString ? `?${queryString}` : ''}`
  }

  const segments = parsed.pathname.split('/').filter(Boolean)
  const normalizedPath = `/${segments.filter((segment, index) => segment !== 'api' || index === 0).join('/')}`
  if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) return `${normalizedPath}${parsed.search}`
  return `/api${normalizedPath === '/' ? '' : normalizedPath}${parsed.search}`
}

module.exports = async function handler(req, res) {
  try {
    if (!process.env.MONGO_URI) {
      const fallback = getFallbackPayload(req)
      if (fallback) return sendJson(res, 200, fallback)
      const authUnavailable = getAuthUnavailablePayload(req)
      if (authUnavailable) return sendJson(res, 200, authUnavailable)
    }

    if (!app || !connectDB) {
      app = require('../backend/server')
      connectDB = require('../backend/config/db')
    }

    if (!dbPromise) {
      dbPromise = connectDB().then(() => require('../backend/utils/developerApiRetention').applyPermanentDeveloperPolicy({
        Log: require('../backend/models/DeveloperApiLog'), Key: require('../backend/models/DeveloperApiKey'), Setting: require('../backend/models/Setting'),
        convertActiveKeys: process.env.NODE_ENV === 'production',
      }))
    }

    await dbPromise
    req.url = normalizeApiUrl(req)
    return app(req, res)
  } catch (error) {
    console.error(error)
    const fallback = getFallbackPayload(req)
    if (fallback) return sendJson(res, 200, fallback)
    if (!process.env.MONGO_URI) {
      const authUnavailable = getAuthUnavailablePayload(req)
      if (authUnavailable) return sendJson(res, 200, authUnavailable)
    }

    return sendJson(res, 500, {
      success: false,
      message: 'API function is deployed, but server environment is not ready.',
      error: error.message,
      env: {
        hasMongoUri: Boolean(process.env.MONGO_URI),
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        nodeEnv: process.env.NODE_ENV || '',
      },
    })
  }
}
