const mongoose = require('mongoose')

const companySchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', lowercase: true, trim: true },
    gstNumber: { type: String, default: '', uppercase: true, trim: true },
    industry: { type: String, default: '' },
    jobs: { type: Number, default: 0 },
    badge: { type: String, default: '' },
    location: { type: String, default: '' },
    locationScope: { type: String, enum: ['India', 'International'], default: 'India' },
    country: { type: String, default: 'India' },
    countryCode: { type: String, default: 'IN' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    rating: { type: String, default: '4.5' },
    accent: { type: String, default: 'from-blue-600 to-sky-400' },
    website: { type: String, default: '' },
    documents: { type: String, enum: ['Missing', 'Review', 'Verified'], default: 'Review', set: (value) => typeof value === 'string' ? value.trim() || 'Review' : value == null ? 'Review' : value },
    status: { type: String, enum: ['Pending', 'Active', 'Blocked'], default: 'Pending' },
    plan: { type: String, default: 'Starter' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Company', companySchema)
