const mongoose = require("mongoose");

const ourNetworkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Our network name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedAffiliateManagers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Indexes
ourNetworkSchema.index({ name: 1 });
ourNetworkSchema.index({ assignedAffiliateManagers: 1 });
ourNetworkSchema.index({ createdBy: 1 });
ourNetworkSchema.index({ isActive: 1 });

// Virtual fields
ourNetworkSchema.virtual("assignedManagersCount").get(function () {
  return this.assignedAffiliateManagers ? this.assignedAffiliateManagers.length : 0;
});

ourNetworkSchema.virtual("activeBrokersCount").get(function () {
  return 0;
});

module.exports = mongoose.model("OurNetwork", ourNetworkSchema); 