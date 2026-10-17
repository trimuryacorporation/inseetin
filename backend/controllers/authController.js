const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const asyncHandler = require('../middleware/asyncHandler')
const Employer = require('../models/Employer')
const Setting = require('../models/Setting')
const User = require('../models/User')

const forgotOtpStore = new Map()
const OTP_TTL_MS = 5 * 60 * 1000
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs'

async function getGoogleAuthConfig() {
  const setting = await Setting.findOne({ key: 'googleAuthLogin' }).lean().catch(() => null)
  const value = setting?.value || {}
  const clientId = value.clientId || process.env.GOOGLE_CLIENT_ID || ''

  return {
    enabled: value.enabled !== false && Boolean(clientId),
    clientId,
    projectId: value.projectId || '',
    authorizedDomains: Array.isArray(value.authorizedDomains) ? value.authorizedDomains : [],
  }
}

function clearDeadLocalProxyEnv() {
  const proxyKeys = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']

  proxyKeys.forEach((key) => {
    if (/^https?:\/\/127\.0\.0\.1:9\/?$/i.test(process.env[key] || '')) {
      delete process.env[key]
    }
  })
}

async function verifyGoogleCredential(idToken, clientId) {
  clearDeadLocalProxyEnv()

  const decoded = jwt.decode(idToken, { complete: true })
  const kid = decoded?.header?.kid

  if (!kid) {
    const error = new Error('Invalid Google credential header.')
    error.statusCode = 401
    throw error
  }

  const response = await fetch(GOOGLE_CERTS_URL, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const error = new Error(`Google verification certificates could not be fetched (${response.status}).`)
    error.statusCode = 502
    throw error
  }

  const certs = await response.json()
  const cert = certs[kid]

  if (!cert) {
    const error = new Error('Google verification certificate was not found for this credential.')
    error.statusCode = 401
    throw error
  }

  try {
    return jwt.verify(idToken, cert, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: ['accounts.google.com', 'https://accounts.google.com'],
    })
  } catch (err) {
    const error = new Error('Google credential could not be verified. Check OAuth Client ID and authorized origin.')
    error.statusCode = 401
    error.cause = err
    throw error
  }
}

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
    Freelancer: 'freelancer',
  }

  return roleMap[role] || role
}

function getSessionDuration(role) {
  const normalizedRole = normalizeRole(role)
  if (['users', 'Candidate', 'freelancer'].includes(normalizedRole)) return '365d'
  if (['Admin', 'staff', 'hiring', 'account team', 'recruiter'].includes(normalizedRole)) return '1d'
  return '1d'
}

function signToken(user) {
  const expiresIn = getSessionDuration(user.role)
  const token = jwt.sign({ id: user._id, role: normalizeRole(user.role) }, process.env.JWT_SECRET, { expiresIn })
  const decoded = jwt.decode(token)
  return {
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : '',
    expiresIn,
    token,
  }
}

function signResetToken(user) {
  return jwt.sign({ id: user._id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '15m' })
}

function authPayload(user) {
  const role = normalizeRole(user.role)
  const recruiterVerificationStatus = user.recruiterVerificationStatus || (role === 'recruiter' ? 'documents_required' : 'approved')
  const status = role === 'recruiter' && recruiterVerificationStatus !== 'approved' && user.status === 'Active'
    ? 'Review'
    : user.status

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role,
    status,
    avatar: user.avatar,
    authProvider: user.authProvider,
    recruiterVerificationStatus,
    recruiterVerificationRemark: user.recruiterVerificationRemark,
  }
}

function authResponse(user) {
  const session = signToken(user)
  return { success: true, ...session, data: authPayload(user) }
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '')
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const register = asyncHandler(async (req, res) => {
  const { name, password, role } = req.body
  const email = normalizeEmail(req.body.email)
  const phone = normalizePhone(req.body.phone)
  const normalizedRole = normalizeRole(role || 'Candidate')
  if (!['Candidate', 'users', 'recruiter', 'freelancer'].includes(normalizedRole)) {
    res.status(403)
    throw new Error('This account role cannot be created through public registration.')
  }
  if (typeof name !== 'string' || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400)
    throw new Error('A name and valid email address are required.')
  }
  const duplicateChecks = [{ email }]

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400)
    throw new Error('Password must be at least 6 characters.')
  }

  if (phone) duplicateChecks.push({ phone })

  const exists = await User.findOne({ $or: duplicateChecks })

  if (exists) {
    res.status(400)
    throw new Error(exists.email === email ? 'Email already registered.' : 'Mobile number already registered.')
  }

  if (normalizedRole === 'recruiter') {
    const employerDuplicateFilters = [{ businessEmail: email }]
    if (phone) employerDuplicateFilters.push({ phone })

    const employerExists = await Employer.findOne({ $or: employerDuplicateFilters })
    if (employerExists) {
      res.status(400)
      throw new Error(employerExists.businessEmail === email ? 'Recruiter email already registered.' : 'Mobile number already registered with another recruiter.')
    }
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: normalizedRole,
    status: normalizedRole === 'recruiter' ? 'Review' : 'Active',
    recruiterVerificationStatus: normalizedRole === 'recruiter' ? 'documents_required' : 'approved',
  })
  res.status(201).json(authResponse(user))
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    res.status(400)
    throw new Error('Email and password are required.')
  }
  const user = await User.findOne({ email: normalizeEmail(email) })

  if (!user || !(await user.matchPassword(password))) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  res.json(authResponse(user))
})

const requestWhatsappOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone)

  if (!phone) {
    res.status(400)
    throw new Error('WhatsApp mobile number is required.')
  }

  const user = await User.findOne({ phone })
  if (!user) {
    res.status(404)
    throw new Error('No account found with this WhatsApp mobile number.')
  }

  const otp = generateOtp()
  await sendWhatsappOtpMessage({ otp, phone })

  forgotOtpStore.set(phone, {
    otp,
    userId: String(user._id),
    expiresAt: Date.now() + OTP_TTL_MS,
  })

  res.json({
    success: true,
    message: 'OTP sent on WhatsApp.',
    data: {
      phone,
      expiresInSeconds: OTP_TTL_MS / 1000,
    },
  })
})

async function getWhatsAppApiConfig({ requireOtpTemplate = true } = {}) {
  const setting = await Setting.findOne({ key: 'whatsappLoginApi' }).lean().catch(() => null)
  const value = setting?.value || {}

  if (!setting || value.enabled === false) {
    throw new Error(value.enabled === false ? 'WhatsApp API is disabled in settings.' : 'WhatsApp API settings are required before sending WhatsApp messages.')
  }

  if (!value.phoneNumberId || !value.accessToken) {
    throw new Error('WhatsApp Phone Number ID and Access Token are required in settings.')
  }

  if (requireOtpTemplate && !value.otpTemplateName) {
    throw new Error('WhatsApp OTP Template Name is required in settings.')
  }

  return value
}

function formatWhatsAppPhone(phone, countryCode = '+91') {
  const digits = normalizePhone(phone)
  const countryDigits = normalizePhone(countryCode || '+91')

  if (digits.length > 10 || !countryDigits) return digits
  return `${countryDigits}${digits}`
}

async function sendWhatsappOtpMessage({ otp, phone }) {
  const config = await getWhatsAppApiConfig()
  const to = formatWhatsAppPhone(phone, config.defaultCountryCode)
  const apiVersion = config.apiVersion || 'v20.0'
  const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`
  const languageCode = config.languageCode || 'en_US'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: config.otpTemplateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload.error?.message || payload.message || 'WhatsApp OTP could not be sent.'
    throw new Error(message)
  }
}

const sendWhatsappAppLink = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone)

  if (!phone || phone.length < 10) {
    res.status(400)
    throw new Error('Valid WhatsApp mobile number is required.')
  }

  const config = await getWhatsAppApiConfig({ requireOtpTemplate: false })
  const appLink = String(config.appLink || process.env.APP_DOWNLOAD_LINK || process.env.CLIENT_URL || 'https://www.inseet.in').trim()

  if (!appLink) {
    res.status(400)
    throw new Error('Application link is not configured in admin WhatsApp settings.')
  }

  await sendWhatsappTextMessage({
    body: buildAppLinkMessage(config.appLinkMessage, appLink),
    config,
    phone,
  })

  res.json({
    success: true,
    message: 'Application link sent on WhatsApp.',
  })
})

function buildAppLinkMessage(template, appLink) {
  const defaultMessage = 'INSEET application link: {link}'
  const message = String(template || defaultMessage).trim() || defaultMessage

  return message.includes('{link}') ? message.replaceAll('{link}', appLink) : `${message}\n${appLink}`
}

async function sendWhatsappTextMessage({ body, config, phone }) {
  const to = formatWhatsAppPhone(phone, config.defaultCountryCode)
  const apiVersion = config.apiVersion || 'v20.0'
  const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: true,
        body,
      },
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload.error?.message || payload.message || 'Application link could not be sent on WhatsApp.'
    throw new Error(message)
  }
}

const verifyWhatsappOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone)
  const otp = String(req.body.otp || '').trim()
  const savedOtp = forgotOtpStore.get(phone)

  if (!savedOtp || savedOtp.expiresAt < Date.now()) {
    forgotOtpStore.delete(phone)
    res.status(400)
    throw new Error('OTP expired. Please request a new OTP.')
  }

  if (savedOtp.otp !== otp) {
    res.status(401)
    throw new Error('Invalid OTP.')
  }

  const user = await User.findById(savedOtp.userId)
  if (!user) {
    forgotOtpStore.delete(phone)
    res.status(404)
    throw new Error('User account not found.')
  }

  forgotOtpStore.delete(phone)
  res.json(authResponse(user))
})

const requestEmailReset = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email)

  if (!email) {
    res.status(400)
    throw new Error('Gmail address is required.')
  }

  const user = await User.findOne({ email })
  if (!user) {
    res.status(404)
    throw new Error('No account found with this Gmail address.')
  }

  const setting = await Setting.findOne({ key: 'emailPasswordResetApi' }).lean().catch(() => null)
  const value = setting?.value || {}
  const provider = value.provider || 'Email API'

  if (!setting || value.enabled === false) {
    res.status(400)
    throw new Error(value.enabled === false ? 'Email API is disabled in settings.' : 'Email API settings are required before sending reset emails.')
  }

  const resetToken = signResetToken(user)
  const resetBaseUrl = value.resetUrl || `${process.env.CLIENT_URL || 'https://www.inseet.in'}/auth`
  const resetLink = `${resetBaseUrl}${resetBaseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`

  await sendPasswordResetEmail({ config: value, provider, resetLink, user })

  res.json({
    success: true,
    message: `Password reset email sent to ${email}.`,
  })
})

const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '').trim()
  const password = String(req.body.password || '')

  if (!token || !password) {
    res.status(400)
    throw new Error('Reset token and new password are required.')
  }

  if (password.length < 6) {
    res.status(400)
    throw new Error('Password must be at least 6 characters.')
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.status(400)
    throw new Error('Reset link expired or invalid.')
  }

  if (decoded.purpose !== 'password-reset') {
    res.status(400)
    throw new Error('Invalid reset token.')
  }

  const user = await User.findById(decoded.id)
  if (!user) {
    res.status(404)
    throw new Error('User account not found.')
  }

  user.password = password
  user.authProvider = user.authProvider || 'local'
  await user.save()

  res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' })
})

async function sendPasswordResetEmail({ config, provider, resetLink, user }) {
  const isResend = String(provider).toLowerCase() === 'resend'
  const subject = 'Reset your INSEET password'
  const text = `Hi ${user.name || 'User'},\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 15 minutes.`
  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border-radius:14px;background:#ffffff;box-shadow:0 18px 45px rgba(37,99,235,0.14)">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:28px 32px;color:#ffffff">
                  <div style="display:inline-block;border-radius:10px;background:rgba(255,255,255,0.16);padding:8px 10px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Secure Account Access</div>
                  <h1 style="margin:18px 0 0;font-size:28px;line-height:1.2;font-weight:900">Reset your password</h1>
                  <p style="margin:10px 0 0;color:#dbeafe;font-size:15px;line-height:1.6">We received a request to reset your INSEET account password.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px">
                  <p style="margin:0 0 14px;font-size:16px;line-height:1.7">Hi <strong>${user.name || 'User'}</strong>,</p>
                  <p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Click the button below to create a new password. This secure link expires in <strong>15 minutes</strong>.</p>
                  <div style="padding:28px 0 24px;text-align:center">
                    <a href="${resetLink}" style="display:inline-block;border-radius:9px;background:#2563eb;color:#ffffff;padding:14px 24px;text-decoration:none;font-size:15px;font-weight:800;box-shadow:0 10px 24px rgba(37,99,235,0.28)">Reset Password</a>
                  </div>
                  <div style="border-radius:10px;background:#f8fafc;padding:16px;border:1px solid #e2e8f0">
                    <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:700">Button not working? Open this link:</p>
                    <a href="${resetLink}" style="word-break:break-all;color:#2563eb;font-size:13px;line-height:1.6">${resetLink}</a>
                  </div>
                  <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.6">If you did not request this password reset, you can safely ignore this email. Your account password will not change.</p>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:18px 32px;text-align:center">
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">INSEET · Secure hiring and career platform</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `

  if (isResend) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName || 'INSEET'} <${config.fromEmail}>`,
        to: [user.email],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.message || 'Password reset email could not be sent through Resend.')
    }
    return
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost || (String(provider).toLowerCase().includes('gmail') ? 'smtp.gmail.com' : ''),
    port: Number(config.smtpPort || 587),
    secure: Number(config.smtpPort || 587) === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  })

  await transporter.sendMail({
    from: `"${config.fromName || 'INSEET'}" <${config.fromEmail || config.smtpUser}>`,
    to: user.email,
    subject,
    text,
    html,
  })
}

const googleAuth = asyncHandler(async (req, res) => {
  const { credential, mode = 'login' } = req.body
  const requestedRole = normalizeRole(req.body.role || 'Candidate')
  if (mode !== 'login' && !['Candidate', 'users', 'recruiter', 'freelancer'].includes(requestedRole)) {
    res.status(403)
    throw new Error('This account role cannot be created through public registration.')
  }
  const googleConfig = await getGoogleAuthConfig()

  if (!googleConfig.enabled || !googleConfig.clientId) {
    res.status(500)
    throw new Error('Google auth is not configured. Add Google client ID from admin package settings.')
  }

  if (!credential) {
    res.status(400)
    throw new Error('Google credential is required.')
  }

  const googleProfile = await verifyGoogleCredential(credential, googleConfig.clientId)
  const email = normalizeEmail(googleProfile.email)

  if (!email || !googleProfile.email_verified) {
    res.status(401)
    throw new Error('Google account email is not verified.')
  }

  let user = await User.findOne({ email })

  if (user) {
    const normalizedExistingRole = normalizeRole(user.role)
    if (requestedRole === 'recruiter' && normalizedExistingRole !== 'recruiter') {
      res.status(409)
      throw new Error('This Google email is already registered as a user. Use another email for recruiter account.')
    }

    if (requestedRole !== 'recruiter' && normalizedExistingRole === 'recruiter') {
      res.status(409)
      throw new Error('This Google email is registered as recruiter. Please login from recruiter page.')
    }

    user.authProvider = user.authProvider || 'google'
    user.googleId = user.googleId || googleProfile.sub
    user.avatar = user.avatar || googleProfile.picture || ''
    if (!user.name) user.name = googleProfile.name || email.split('@')[0]
    await user.save()
  } else {
    if (mode === 'login') {
      res.status(404)
      throw new Error('Google account not registered. Please register first.')
    }

    user = await User.create({
      name: googleProfile.name || email.split('@')[0],
      email,
      role: requestedRole,
      authProvider: 'google',
      googleId: googleProfile.sub,
      avatar: googleProfile.picture || '',
      status: requestedRole === 'recruiter' ? 'Review' : 'Active',
      recruiterVerificationStatus: requestedRole === 'recruiter' ? 'documents_required' : 'approved',
    })
  }

  res.json(authResponse(user))
})

const googleConfig = asyncHandler(async (req, res) => {
  const config = await getGoogleAuthConfig()

  res.json({
    success: true,
    data: {
      enabled: config.enabled,
      clientId: config.clientId,
      projectId: config.projectId,
      authorizedDomains: config.authorizedDomains,
    },
  })
})

const updateRecruiterStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user || normalizeRole(user.role) !== 'recruiter') {
    res.status(403)
    throw new Error('Only recruiter accounts can update recruiter verification status')
  }

  user.recruiterVerificationStatus = req.body.status || user.recruiterVerificationStatus
  await user.save()

  res.json({ success: true, data: authPayload(user) })
})

const currentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({ success: true, data: authPayload(user) })
})

module.exports = { currentUser, googleAuth, googleConfig, login, register, requestEmailReset, requestWhatsappOtp, resetPassword, sendWhatsappAppLink, updateRecruiterStatus, verifyWhatsappOtp }
