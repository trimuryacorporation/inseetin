const jwt = require('jsonwebtoken')
const asyncHandler = require('./asyncHandler')
const User = require('../models/User')

function normalizeRole(role) {
  const roleMap = {
    'Super Admin': 'Admin',
    User: 'users',
    Candidate: 'users',
    'HR Manager': 'staff',
    Support: 'users',
    Hiring: 'hiring',
    'Hiring Team': 'hiring',
    Account: 'account team',
    'Account Team': 'account team',
    'account-team': 'account team',
    account_team: 'account team',
    Freelancer: 'freelancer',
    Employer: 'recruiter',
    company: 'recruiter',
  }

  return roleMap[role] || role
}

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401)
    throw new Error('Not authorized, token missing')
  }

  const token = header.split(' ')[1]
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.status(401)
    throw new Error('Session expired. Please login again.')
  }

  req.user = await User.findById(decoded.id).select('-password')

  if (!req.user) {
    res.status(401)
    throw new Error('Not authorized, user not found')
  }

  req.user.role = normalizeRole(req.user.role)
  next()
})

const optionalProtect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = header.split(' ')[1]
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.status(401)
    throw new Error('Session expired. Please login again.')
  }
  req.user = await User.findById(decoded.id).select('-password')

  if (req.user) {
    req.user.role = normalizeRole(req.user.role)
  }

  next()
})

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403)
      throw new Error('Forbidden: insufficient role')
    }
    next()
  }
}

module.exports = { authorize, optionalProtect, protect }
