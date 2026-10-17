const crypto = require('node:crypto')
const path = require('node:path')
const User = require('../models/User')

const accounts = [
  { name: 'INSEET Admin', email: 'admin@inseet.in', role: 'Admin' },
  { name: 'INSEET Super Admin', email: 'superadmin@inseet.in', role: 'Super Admin' },
]

async function createAdminAccounts({ Model = User, passwordFactory = () => crypto.randomBytes(18).toString('base64url') + '!aA7' } = {}) {
  const created = []
  try {
    for (const account of accounts) {
      let email = account.email
      // Never reset or overwrite an existing user's password or privileges.
      while (await Model.findOne({ email })) {
        const [local, domain] = account.email.split('@')
        email = local + '.access-' + crypto.randomBytes(4).toString('hex') + '@' + domain
      }
      const password = passwordFactory()
      const user = await Model.create({ ...account, email, password, status: 'Active', authProvider: 'local', recruiterVerificationStatus: 'approved' })
      const stored = await Model.findById(user._id)
      if (!stored || stored.password === password || !(await stored.matchPassword(password))) {
        throw new Error('Stored account password verification failed.')
      }
      created.push({ id: String(user._id), name: account.name, email, role: account.role, password })
    }
    return created
  } catch (error) {
    error.createdAccounts = created
    throw error
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true })
  const mongoose = require('mongoose')
  const connectDB = require('../config/db')
  ;(async () => {
    try {
      await connectDB()
      const created = await createAdminAccounts()
      // Secrets are printed once for the requesting owner; never written to source or a credential file.
      console.log('INSEET_SEED_RESULT=' + JSON.stringify(created))
    } catch (error) {
      if (error.createdAccounts?.length) console.log('INSEET_SEED_RESULT=' + JSON.stringify(error.createdAccounts))
      console.error('Account seed failed: ' + error.name)
      process.exitCode = 1
    } finally { await mongoose.disconnect() }
  })()
}

module.exports = { createAdminAccounts }
