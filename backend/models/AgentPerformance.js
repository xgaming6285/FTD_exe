const mongoose = require('mongoose');
const agentPerformanceSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  callTimeMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  earnings: {
    type: Number,
    default: 0,
    min: 0
  },
  penalties: {
    type: Number,
    default: 0,
    min: 0
  },
  leadsContacted: {
    type: Number,
    default: 0,
    min: 0
  },
  leadsConverted: {
    type: Number,
    default: 0,
    min: 0
  },
  callsCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  breakdown: {
    ftdCalls: { type: Number, default: 0 },
    fillerCalls: { type: Number, default: 0 },
    coldCalls: { type: Number, default: 0 },
    ftdConversions: { type: Number, default: 0 },
    fillerConversions: { type: Number, default: 0 },
    coldConversions: { type: Number, default: 0 }
  },
  // Call tracking for bonus calculations
  callCounts: {
    firstCalls: { type: Number, default: 0 },
    secondCalls: { type: Number, default: 0 },
    thirdCalls: { type: Number, default: 0 },
    fourthCalls: { type: Number, default: 0 },
    fifthCalls: { type: Number, default: 0 },
    verifiedAccounts: { type: Number, default: 0 }
  },
  notes: String,
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
agentPerformanceSchema.index({ agent: 1, date: 1 }, { unique: true });
agentPerformanceSchema.index({ date: -1 });
agentPerformanceSchema.index({ agent: 1, date: -1 });
agentPerformanceSchema.virtual('netEarnings').get(function() {
  return this.earnings - this.penalties;
});
agentPerformanceSchema.virtual('conversionRate').get(function() {
  if (this.leadsContacted === 0) return 0;
  return Math.round((this.leadsConverted / this.leadsContacted) * 100);
});
agentPerformanceSchema.virtual('callsPerHour').get(function() {
  if (this.callTimeMinutes === 0) return 0;
  return Math.round((this.callsCompleted / (this.callTimeMinutes / 60)) * 100) / 100;
});
agentPerformanceSchema.statics.getAgentStats = function(agentId, startDate, endDate) {
  const match = { agent: new mongoose.Types.ObjectId(agentId) };
  if (startDate && endDate) {
    match.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCallTime: { $sum: '$callTimeMinutes' },
        totalEarnings: { $sum: '$earnings' },
        totalPenalties: { $sum: '$penalties' },
        totalLeadsContacted: { $sum: '$leadsContacted' },
        totalLeadsConverted: { $sum: '$leadsConverted' },
        totalCalls: { $sum: '$callsCompleted' },
        avgDailyCallTime: { $avg: '$callTimeMinutes' },
        avgDailyEarnings: { $avg: '$earnings' },
        avgConversionRate: { $avg: { $divide: ['$leadsConverted', '$leadsContacted'] } },
        daysWorked: { $sum: 1 }
      }
    }
  ]);
};
agentPerformanceSchema.statics.getTopPerformers = function(startDate, endDate, limit = 10) {
  const match = {};
  if (startDate && endDate) {
    match.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$agent',
        totalEarnings: { $sum: '$earnings' },
        totalPenalties: { $sum: '$penalties' },
        netEarnings: { $sum: { $subtract: ['$earnings', '$penalties'] } },
        totalCallTime: { $sum: '$callTimeMinutes' },
        totalLeadsConverted: { $sum: '$leadsConverted' },
        avgConversionRate: { $avg: { $divide: ['$leadsConverted', '$leadsContacted'] } }
      }
    },
    { $sort: { netEarnings: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agentInfo'
      }
    },
    { $unwind: '$agentInfo' }
  ]);
};
agentPerformanceSchema.statics.getDailyTeamStats = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return this.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalAgents: { $sum: 1 },
        totalCallTime: { $sum: '$callTimeMinutes' },
        totalEarnings: { $sum: '$earnings' },
        totalPenalties: { $sum: '$penalties' },
        totalLeadsContacted: { $sum: '$leadsContacted' },
        totalLeadsConverted: { $sum: '$leadsConverted' },
        totalCalls: { $sum: '$callsCompleted' }
      }
    }
  ]);
};
module.exports = mongoose.model('AgentPerformance', agentPerformanceSchema);