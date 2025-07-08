const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["fulfilled", "partial", "pending", "cancelled"],
      default: "pending",
    },
    requests: {
      ftd: { type: Number, default: 0 },
      filler: { type: Number, default: 0 },
      cold: { type: Number, default: 0 },
      live: { type: Number, default: 0 },
    },
    leads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],
    notes: String,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    countryFilter: {
      type: String,
      trim: true,
    },
    genderFilter: {
      type: String,
      enum: ["male", "female", "not_defined", null],
      default: null,
    },
    selectedClientNetwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientNetwork",
      default: null,
    },
    selectedOurNetwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OurNetwork",
      default: null,
    },
    selectedCampaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: [true, "Campaign selection is mandatory for all orders"],
    },
    fulfilled: {
      ftd: { type: Number, default: 0 },
      filler: { type: Number, default: 0 },
      cold: { type: Number, default: 0 },
      live: { type: Number, default: 0 },
    },
    injectionSettings: {
      enabled: { type: Boolean, default: false },
      mode: {
        type: String,
        enum: ["bulk", "scheduled"],
        default: "bulk",
      },
      scheduledTime: {
        startTime: { type: String },
        endTime: { type: String },
        minInterval: { type: Number, default: 30000 },
        maxInterval: { type: Number, default: 300000 },
      },
      status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "failed", "paused"],
        default: "pending",
      },
      includeTypes: {
        filler: { type: Boolean, default: false },
        cold: { type: Boolean, default: true },
        live: { type: Boolean, default: true },
      },
      deviceConfig: {
        selectionMode: {
          type: String,
          enum: ["individual", "bulk", "ratio", "random"],
          default: "random",
        },
        bulkDeviceType: {
          type: String,
          enum: ["windows", "android", "ios", "mac", null],
          default: null,
        },
        deviceRatio: {
          windows: { type: Number, default: 0, min: 0, max: 10 },
          android: { type: Number, default: 0, min: 0, max: 10 },
          ios: { type: Number, default: 0, min: 0, max: 10 },
          mac: { type: Number, default: 0, min: 0, max: 10 },
        },
        individualAssignments: [
          {
            leadId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Lead",
            },
            deviceType: {
              type: String,
              enum: ["windows", "android", "ios", "mac"],
              required: true,
            },
          },
        ],
        availableDeviceTypes: [
          {
            type: String,
            enum: ["windows", "android", "ios", "mac"],
          },
        ],
      },
      proxyConfig: {
        healthCheckInterval: {
          type: Number,
          default: 300000,
          min: 60000,
          max: 1800000,
        },
      },
    },
    ftdHandling: {
      status: {
        type: String,
        enum: ["pending", "skipped", "manual_fill_required", "completed"],
        default: "pending",
      },
      skippedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String },
    },
    injectionProgress: {
      totalToInject: { type: Number, default: 0 },
      totalInjected: { type: Number, default: 0 },
      successfulInjections: { type: Number, default: 0 },
      failedInjections: { type: Number, default: 0 },
      ftdsPendingManualFill: { type: Number, default: 0 },
      lastInjectionAt: { type: Date },
      completedAt: { type: Date },
      brokersAssigned: { type: Number, default: 0 },
      brokerAssignmentPending: { type: Boolean, default: false },
    },
    clientBrokerAssignment: {
      status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "skipped"],
        default: "pending",
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      assignedAt: { type: Date },
      notes: { type: String },
    },
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
orderSchema.index({ requester: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ priority: 1 });
orderSchema.virtual("totalRequested").get(function () {
  return (
    this.requests.ftd +
    this.requests.filler +
    this.requests.cold +
    this.requests.live
  );
});
orderSchema.virtual("totalFulfilled").get(function () {
  return (
    this.fulfilled.ftd +
    this.fulfilled.filler +
    this.fulfilled.cold +
    this.fulfilled.live
  );
});
orderSchema.virtual("completionPercentage").get(function () {
  const total = this.totalRequested;
  if (total === 0) return 0;
  return Math.round((this.totalFulfilled / total) * 100);
});
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "fulfilled" && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === "cancelled" && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
  next();
});
orderSchema.statics.getOrderStats = function (userId = null) {
  const matchStage = userId
    ? { requester: new mongoose.Types.ObjectId(userId) }
    : {};
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalRequested: {
          $sum: {
            $add: [
              "$requests.ftd",
              "$requests.filler",
              "$requests.cold",
              "$requests.live",
            ],
          },
        },
        totalFulfilled: {
          $sum: {
            $add: [
              "$fulfilled.ftd",
              "$fulfilled.filler",
              "$fulfilled.cold",
              "$fulfilled.live",
            ],
          },
        },
      },
    },
  ]);
};
orderSchema.statics.getRecentOrders = function (userId = null, limit = 10) {
  const matchStage = userId
    ? { requester: new mongoose.Types.ObjectId(userId) }
    : {};
  return this.find(matchStage)
    .populate("requester", "fullName email role")
    .populate("leads", "leadType firstName lastName country")
    .sort({ createdAt: -1 })
    .limit(limit);
};
module.exports = mongoose.model("Order", orderSchema);
