const mongoose = require("mongoose");

const agentFineSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    // Admin who imposed the fine
    imposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Status of the fine
    status: {
      type: String,
      enum: ["active", "paid", "waived", "disputed"],
      default: "active",
    },
    // Date when the fine was imposed
    imposedDate: {
      type: Date,
      default: Date.now,
    },
    // Date when the fine was resolved (paid/waived)
    resolvedDate: {
      type: Date,
    },
    // Admin who resolved the fine
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Additional notes
    notes: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
agentFineSchema.index({ agent: 1 });
agentFineSchema.index({ status: 1 });
agentFineSchema.index({ imposedDate: -1 });
agentFineSchema.index({ agent: 1, status: 1 });

// Virtual for fine age in days
agentFineSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.imposedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to get all fines for an agent
agentFineSchema.statics.getAgentFines = function (
  agentId,
  includeResolved = false
) {
  const query = { agent: agentId, isActive: true };
  if (!includeResolved) {
    query.status = "active";
  }

  return this.find(query)
    .populate("agent", "fullName email")
    .populate("imposedBy", "fullName email")
    .populate("resolvedBy", "fullName email")
    .sort({ imposedDate: -1 });
};

// Static method to get all active fines
agentFineSchema.statics.getAllActiveFines = function () {
  return this.find({ isActive: true })
    .populate("agent", "fullName email")
    .populate("imposedBy", "fullName email")
    .populate("resolvedBy", "fullName email")
    .sort({ imposedDate: -1 });
};

// Static method to get total active fines for an agent
agentFineSchema.statics.getTotalActiveFines = function (agentId) {
  return this.aggregate([
    {
      $match: {
        agent: new mongoose.Types.ObjectId(agentId),
        status: "active",
        isActive: true,
      },
    },
    { $group: { _id: null, totalFines: { $sum: "$amount" } } },
  ]);
};

// Static method to get fines summary for all agents
agentFineSchema.statics.getFinesSummary = function () {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$agent",
        totalFines: { $sum: "$amount" },
        activeFines: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, "$amount", 0] },
        },
        fineCount: { $sum: 1 },
        activeFineCount: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "agent",
      },
    },
    { $unwind: "$agent" },
    { $sort: { "agent.fullName": 1 } },
  ]);
};

// Instance method to resolve a fine
agentFineSchema.methods.resolve = function (status, resolvedBy, notes) {
  this.status = status;
  this.resolvedDate = new Date();
  this.resolvedBy = resolvedBy;
  if (notes) {
    this.notes = notes;
  }
  return this.save();
};

module.exports = mongoose.model("AgentFine", agentFineSchema);
