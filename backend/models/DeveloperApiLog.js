const mongoose = require('mongoose')
const schema = new mongoose.Schema({
 keyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeveloperApiKey', required: true, index: true },
 owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
 requestId: { type: String, required: true, unique: true }, method: String, resource: String, recordId: String,
 statusCode: { type: Number, default: 0 }, durationMs: Number,
}, { timestamps: true })
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 })
module.exports = mongoose.model('DeveloperApiLog', schema)
