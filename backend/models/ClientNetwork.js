const mongoose = require("mongoose");
const clientNetworkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client network name is required"],
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
clientNetworkSchema.index({ name: 1 });
clientNetworkSchema.index({ assignedAffiliateManagers: 1 });
clientNetworkSchema.index({ createdBy: 1 });
clientNetworkSchema.index({ isActive: 1 });
clientNetworkSchema.virtual("assignedManagersCount").get(function () {
  return this.assignedAffiliateManagers ? this.assignedAffiliateManagers.length : 0;
});
clientNetworkSchema.virtual("activeBrokersCount").get(function () {
  return 0;
});
module.exports = mongoose.model("ClientNetwork", clientNetworkSchema);