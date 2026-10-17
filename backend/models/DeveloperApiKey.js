const mongoose = require('mongoose')
const schema = new mongoose.Schema({
 name: { type: String, required: true, maxlength: 80 },
 owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
 keyHash: { type: String, required: true, unique: true, select: false },
 prefix: { type: String, required: true }, scopes: [{ type: String }],
 expiresAt: { type: Date, required: true }, revokedAt: { type: Date, default: null }, lastUsedAt: { type: Date, default: null },
}, { timestamps: true })
module.exports = mongoose.model('DeveloperApiKey', schema)
