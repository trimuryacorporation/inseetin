const asyncHandler = require('../middleware/asyncHandler')
const Employer = require('../models/Employer')
const RecruiterDocument = require('../models/RecruiterDocument')
const User = require('../models/User')
const {
  collectSupaCloudObjectsFromFields,
  removeSupaCloudObjects,
} = require('../utils/supaCloudStorage')

const recruiterDocumentFileFields = ['panDocument', 'gstDocument', 'offerLetter', 'aadhaarDocument']

function normalizeRole(role) {
  const roleMap = {
    'Super Admin': 'Admin',
    'HR Manager': 'staff',
    Support: 'users',
    Hiring: 'hiring',
    'Hiring Team': 'hiring',
    Account: 'account team',
    'Account Team': 'account team',
    'account-team': 'account team',
    account_team: 'account team',
    company: 'recruiter',
    Employer: 'recruiter',
  }

  return roleMap[role] || role
}

function normalizeUser(user) {
  if (!user) return user
  const data = typeof user.toObject === 'function' ? user.toObject() : user
  const role = normalizeRole(data.role)
  const recruiterVerificationStatus = data.recruiterVerificationStatus || (role === 'recruiter' ? 'documents_required' : 'approved')
  const status = role === 'recruiter' && recruiterVerificationStatus !== 'approved' && data.status === 'Active'
    ? 'Review'
    : data.status || (role === 'recruiter' ? 'Review' : 'Active')

  return {
    ...data,
    role,
    status,
    recruiterVerificationStatus,
    recruiterVerificationRemark: data.recruiterVerificationRemark || '',
  }
}

function normalizeRecruiterAccessStatus(role, status, recruiterVerificationStatus) {
  if (normalizeRole(role) !== 'recruiter') return status || 'Active'
  if (recruiterVerificationStatus === 'approved') return status || 'Active'
  if (!status || status === 'Active') return 'Review'
  return status
}

function buildUserFilter(query) {
  const filter = {}

  if (query.role) filter.role = normalizeRole(query.role)
  if (query.status) filter.status = query.status
  if (query.search) {
    filter.$or = ['name', 'email', 'role', 'status'].map((field) => ({
      [field]: { $regex: query.search, $options: 'i' },
    }))
  }

  return filter
}

function isAccountTeam(req) {
  return normalizeRole(req.user?.role) === 'account team'
}

function ensureAdmin(req, res) {
  if (!isAccountTeam(req)) return
  res.status(403)
  throw new Error('Forbidden: account team can only manage recruiter access status')
}

function ensureRecruiterUserAccess(req, res, user) {
  if (!isAccountTeam(req)) return
  if (normalizeRole(user?.role) === 'recruiter') return
  res.status(403)
  throw new Error('Forbidden: account team can only manage recruiter users')
}

const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const skip = (page - 1) * limit
  const filter = buildUserFilter(req.query)
  if (isAccountTeam(req)) filter.role = 'recruiter'

  const [items, total] = await Promise.all([
    User.find(filter).select('-password').sort(req.query.sort || '-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ])

  res.json({ success: true, data: items.map(normalizeUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }
  ensureRecruiterUserAccess(req, res, user)
  res.json({ success: true, data: normalizeUser(user) })
})

const createUser = asyncHandler(async (req, res) => {
  ensureAdmin(req, res)
  const { name, email, phone, avatar, password, role, status } = req.body
  const exists = await User.findOne({ email })

  if (exists) {
    res.status(400)
    throw new Error('User already exists')
  }

  if (!password) {
    res.status(400)
    throw new Error('Password is required')
  }

  const normalizedRole = normalizeRole(role)
  const recruiterVerificationStatus = normalizedRole === 'recruiter' ? 'documents_required' : 'approved'
  const user = await User.create({
    name,
    email,
    password,
    phone,
    avatar,
    role: normalizedRole,
    status: normalizeRecruiterAccessStatus(normalizedRole, status, recruiterVerificationStatus),
    recruiterVerificationStatus,
  })
  const safeUser = await User.findById(user._id).select('-password')
  res.status(201).json({ success: true, data: normalizeUser(safeUser) })
})

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (isAccountTeam(req)) {
    ensureRecruiterUserAccess(req, res, user)
    user.status = req.body.status ?? user.status
    user.recruiterVerificationStatus = req.body.recruiterVerificationStatus ?? user.recruiterVerificationStatus
    user.recruiterVerificationRemark = req.body.recruiterVerificationRemark ?? user.recruiterVerificationRemark
    user.status = normalizeRecruiterAccessStatus(user.role, user.status, user.recruiterVerificationStatus)
  } else {
    user.phone = req.body.phone ?? user.phone
    user.avatar = req.body.avatar ?? user.avatar
    user.name = req.body.name ?? user.name
    user.email = req.body.email ?? user.email
    user.role = normalizeRole(req.body.role ?? user.role)
    user.status = req.body.status ?? user.status
    user.recruiterVerificationStatus = req.body.recruiterVerificationStatus ?? user.recruiterVerificationStatus
    user.recruiterVerificationRemark = req.body.recruiterVerificationRemark ?? user.recruiterVerificationRemark
    user.status = normalizeRecruiterAccessStatus(user.role, user.status, user.recruiterVerificationStatus)
    if (req.body.password) user.password = req.body.password
  }

  await user.save()
  const safeUser = await User.findById(user._id).select('-password')
  res.json({ success: true, data: normalizeUser(safeUser) })
})

const deleteUser = asyncHandler(async (req, res) => {
  ensureAdmin(req, res)
  const user = await User.findByIdAndDelete(req.params.id).select('-password')
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const normalized = normalizeUser(user)

  if (normalized.role === 'recruiter') {
    const email = String(normalized.email || '').toLowerCase()
    const documents = await RecruiterDocument.find({ recruiterEmail: email })
    for (const document of documents) {
      await removeSupaCloudObjects(collectSupaCloudObjectsFromFields(document, recruiterDocumentFileFields), 'Supa Cloud recruiter document file')
    }

    await Promise.all([
      Employer.deleteMany({ businessEmail: email }),
      RecruiterDocument.deleteMany({ recruiterEmail: email }),
    ])
  }

  res.json({ success: true, data: normalized })
})

module.exports = { createUser, deleteUser, getUser, getUsers, updateUser }
