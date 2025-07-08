const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'affiliate_manager', 'agent', 'pending_approval', 'lead_manager'],
    default: 'pending_approval',
    required: true
  },
  leadManagerStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_applicable'],
    default: 'not_applicable'
  },
  leadManagerApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  leadManagerApprovedAt: {
    type: Date,
    default: null
  },
  fourDigitCode: {
    type: String,
    validate: {
      validator: function (v) {
        if (this.role === 'agent') {
          return v && v.length === 4 && /^\d{4}$/.test(v);
        }
        return true;
      },
      message: 'Agents must have a 4-digit code'
    },
  },
  permissions: {
    canCreateOrders: { type: Boolean, default: true },
    canManageLeads: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  eulaAccepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ fourDigitCode: 1 });
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};
module.exports = mongoose.model('User', userSchema);