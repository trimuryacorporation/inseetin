const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: '' },
    password: { type: String, minlength: 6 },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: '', index: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['Admin', 'Super Admin', 'staff', 'recruiter', 'users', 'hiring', 'account team', 'Candidate', 'freelancer'], default: 'Candidate' },
    status: { type: String, enum: ['Active', 'Inactive', 'Review', 'Suspend'], default: 'Active' },
    recruiterVerificationStatus: {
      type: String,
      enum: ['account_review', 'documents_required', 'documents_review', 'approved', 'rejected', 'hold', 'suspended'],
      default: 'approved',
    },
    recruiterVerificationRemark: { type: String, default: '' },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.matchPassword = function matchPassword(password) {
  if (!this.password) return false
  return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
