const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true
  },
  breakdown: {
    basePay: {
      type: Number,
      required: true,
      default: 0
    },
    bonuses: {
      type: Number,
      required: true,
      default: 0
    },
    fines: {
      type: Number,
      required: true,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  paymentLink: {
    type: String,
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
withdrawalSchema.index({ agent: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted amount
withdrawalSchema.virtual('formattedAmount').get(function() {
  return `$${this.amount.toFixed(2)}`;
});

// Static method to get agent withdrawals
withdrawalSchema.statics.getAgentWithdrawals = function(agentId, options = {}) {
  const { status, limit = 10, page = 1 } = options;
  
  let query = { agent: agentId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('agent', 'fullName email')
    .populate('processedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get all withdrawals for admin
withdrawalSchema.statics.getAllWithdrawals = function(options = {}) {
  const { status, limit = 50, page = 1 } = options;
  
  let query = {};
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('agent', 'fullName email fourDigitCode')
    .populate('processedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get withdrawal statistics
withdrawalSchema.statics.getWithdrawalStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Instance method to process withdrawal
withdrawalSchema.methods.processWithdrawal = function(status, processedBy, adminNotes = '', paymentLink = '') {
  this.status = status;
  this.processedBy = processedBy;
  this.processedAt = new Date();
  this.adminNotes = adminNotes;
  if (paymentLink) {
    this.paymentLink = paymentLink;
  }
  return this.save();
};

module.exports = mongoose.model('Withdrawal', withdrawalSchema); 