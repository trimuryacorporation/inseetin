const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true })
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Log = require('../models/DeveloperApiLog')
const Key = require('../models/DeveloperApiKey')
const { removeHistoryExpiry } = require('../utils/developerApiRetention')
;(async () => {
 try {
  await connectDB()
  const removedIndexes = await removeHistoryExpiry(Log)
  // Only currently unexpired, non-revoked keys are converted. Never revive expired/revoked keys.
  const filter = { revokedAt: null, expiresAt: { $gt: new Date() } }
  const pendingKeys = await Key.countDocuments(filter)
  // Conversion must run after deploying the backend that supports null expiry.
  const result = process.argv.includes('--convert-active-keys') ? await Key.updateMany(filter, { $set: { expiresAt: null } }) : { modifiedCount: 0 }
  console.log(JSON.stringify({ removedHistoryExpiryIndexes: removedIndexes, keysMadePermanent: result.modifiedCount, activeDatedKeys: pendingKeys, conversionRequested: process.argv.includes('--convert-active-keys') }))
 } catch (error) { console.error('Permanent access migration failed: ' + error.name); process.exitCode = 1 }
 finally { await mongoose.disconnect() }
})()
