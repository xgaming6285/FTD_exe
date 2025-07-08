const mongoose = require("mongoose");
const leadSchema = new mongoose.Schema(
  {
    leadType: {
      type: String,
      enum: ["ftd", "filler", "cold", "live"],
      required: [true, "Lead type is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    prefix: {
      type: String,
      trim: true,
    },
    newEmail: {
      type: String,
      required: [true, "New email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    oldEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    newPhone: {
      type: String,
      trim: true,
      required: [true, "New phone is required"],
    },
    oldPhone: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    isAssigned: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },
    client: {
      type: String,
      trim: true,
    },
    assignedClientBrokers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClientBroker",
      },
    ],
    clientBrokerHistory: [
      {
        clientBroker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ClientBroker",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        injectionStatus: {
          type: String,
          enum: ["pending", "successful", "failed"],
          default: "pending",
        },
        intermediaryClientNetwork: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ClientNetwork",
        },
        domain: {
          type: String,
          trim: true,
        },
      },
    ],
    clientNetworkHistory: [
      {
        clientNetwork: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ClientNetwork",
          required: function () {
            return (
              !this.injectionType || !this.injectionType.startsWith("manual_")
            );
          },
        },
        clientBroker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ClientBroker",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        injectionStatus: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        injectionType: {
          type: String,
          enum: ["auto", "manual_ftd", "manual_filler"],
        },
        domain: {
          type: String,
          trim: true,
        },
        injectionNotes: {
          type: String,
          trim: true,
        },
      },
    ],
    campaignHistory: [
      {
        campaign: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Campaign",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        performance: {
          status: {
            type: String,
            enum: ["active", "contacted", "converted", "inactive"],
            default: "active",
          },
          contactedAt: {
            type: Date,
          },
          convertedAt: {
            type: Date,
          },
          notes: {
            type: String,
            trim: true,
          },
        },
      },
    ],
    ourNetworkHistory: [
      {
        ourNetwork: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OurNetwork",
          required: function () {
            return (
              !this.injectionType || !this.injectionType.startsWith("manual_")
            );
          },
        },
        clientBroker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ClientBroker",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        injectionStatus: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        injectionType: {
          type: String,
          enum: ["auto", "manual_ftd", "manual_filler"],
        },
        domain: {
          type: String,
          trim: true,
        },
        injectionNotes: {
          type: String,
          trim: true,
        },
      },
    ],
    gender: {
      type: String,
      enum: ["male", "female", "not_defined"],
      default: "not_defined",
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    socialMedia: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      instagram: { type: String, trim: true },
      telegram: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
    },
    comments: [
      {
        text: {
          type: String,
          required: true,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dob: { type: Date },
    address: {
      type: String,
    },
    documents: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    sin: {
      type: String,
      trim: true,
      sparse: true,
      validate: {
        validator: function (v) {
          if (this.leadType === "ftd") {
            return v && v.length > 0;
          }
          return true;
        },
        message: "SIN is required for FTD leads",
      },
    },
    source: String,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["active", "contacted", "converted", "inactive"],
      default: "active",
    },
    brokerAvailabilityStatus: {
      type: String,
      enum: ["available", "sleep", "not_available_brokers"],
      default: "available",
    },
    sleepDetails: {
      putToSleepAt: { type: Date },
      reason: { type: String },
      lastCheckedAt: { type: Date },
    },
    fingerprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fingerprint",
      sparse: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ["windows", "android", "ios", "mac"],
      sparse: true,
      index: true,
    },
    proxyAssignments: [
      {
        proxy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Proxy",
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["active", "completed", "failed"],
          default: "active",
        },
        completedAt: {
          type: Date,
        },
      },
    ],
    browserSession: {
      cookies: [
        {
          name: { type: String, required: true },
          value: { type: String, required: true },
          domain: { type: String },
          path: { type: String, default: "/" },
          expires: { type: Date },
          httpOnly: { type: Boolean, default: false },
          secure: { type: Boolean, default: false },
          sameSite: {
            type: String,
            enum: ["Strict", "Lax", "None"],
            default: "Lax",
          },
        },
      ],
      localStorage: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      sessionStorage: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      userAgent: {
        type: String,
        trim: true,
      },
      viewport: {
        width: { type: Number, default: 1366 },
        height: { type: Number, default: 768 },
      },
      sessionId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      lastAccessedAt: {
        type: Date,
        default: Date.now,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      metadata: {
        domain: { type: String, trim: true },
        success: { type: Boolean, default: false },
        injectionType: {
          type: String,
          enum: ["manual_ftd", "auto_ftd"],
          default: "manual_ftd",
        },
        notes: { type: String, trim: true },
      },
    },
    sessionHistory: [
      {
        sessionId: {
          type: String,
          required: true,
          index: true,
        },
        cookies: [
          {
            name: { type: String, required: true },
            value: { type: String, required: true },
            domain: { type: String },
            path: { type: String, default: "/" },
            expires: { type: Date },
            httpOnly: { type: Boolean, default: false },
            secure: { type: Boolean, default: false },
            sameSite: {
              type: String,
              enum: ["Strict", "Lax", "None"],
              default: "Lax",
            },
          },
        ],
        localStorage: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        sessionStorage: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        userAgent: {
          type: String,
          trim: true,
        },
        viewport: {
          width: { type: Number, default: 1366 },
          height: { type: Number, default: 768 },
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastAccessedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: false,
        },
        metadata: {
          domain: { type: String, trim: true },
          success: { type: Boolean, default: false },
          injectionType: {
            type: String,
            enum: ["manual_ftd", "auto_ftd"],
            default: "manual_ftd",
          },
          notes: { type: String, trim: true },
          orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
          },
          assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
      },
    ],
    currentSessionId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
leadSchema.index({ isAssigned: 1, leadType: 1, "documents.status": 1 });
leadSchema.index({ leadType: 1 });
leadSchema.index({ country: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ client: 1 }, { sparse: true });
leadSchema.index({ assignedClientBrokers: 1 });
leadSchema.index({ newEmail: 1 }, { unique: true });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedAt: -1 });
leadSchema.index({ isAssigned: 1, assignedTo: 1 });
leadSchema.index({ firstName: 1, lastName: 1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ "clientBrokerHistory.clientBroker": 1 });
leadSchema.index({ "clientBrokerHistory.orderId": 1 });
leadSchema.index({
  "clientBrokerHistory.clientBroker": 1,
  "clientBrokerHistory.orderId": 1,
});
leadSchema.index({ "clientBrokerHistory.assignedAt": -1 });
leadSchema.index({ "clientNetworkHistory.clientNetwork": 1 });
leadSchema.index({ "clientNetworkHistory.orderId": 1 });
leadSchema.index({
  "clientNetworkHistory.clientNetwork": 1,
  "clientNetworkHistory.orderId": 1,
});
leadSchema.index({ "clientNetworkHistory.assignedAt": -1 });
leadSchema.index({ "ourNetworkHistory.ourNetwork": 1 });
leadSchema.index({ "ourNetworkHistory.orderId": 1 });
leadSchema.index({
  "ourNetworkHistory.ourNetwork": 1,
  "ourNetworkHistory.orderId": 1,
});
leadSchema.index({ "ourNetworkHistory.assignedAt": -1 });
leadSchema.index({ "campaignHistory.campaign": 1 });
leadSchema.index({ "campaignHistory.orderId": 1 });
leadSchema.index({
  "campaignHistory.campaign": 1,
  "campaignHistory.orderId": 1,
});
leadSchema.index({ "campaignHistory.assignedAt": -1 });
leadSchema.index({ leadType: 1, isAssigned: 1, status: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ prefix: 1 });
leadSchema.index({ "browserSession.sessionId": 1 });
leadSchema.index({ "browserSession.isActive": 1 });
leadSchema.index({ "browserSession.createdAt": -1 });
leadSchema.index({ "browserSession.lastAccessedAt": -1 });
leadSchema.index({ currentSessionId: 1 });
leadSchema.index({ "sessionHistory.sessionId": 1 });
leadSchema.index({ "sessionHistory.isActive": 1 });
leadSchema.index({ "sessionHistory.createdAt": -1 });
leadSchema.index(
  {
    firstName: "text",
    lastName: "text",
    newEmail: "text",
    newPhone: "text",
    client: "text",
  },
  {
    weights: {
      firstName: 10,
      lastName: 10,
      newEmail: 5,
      newPhone: 5,
      client: 3,
    },
    name: "lead_search_index",
  }
);
leadSchema.virtual("fullName").get(function () {
  return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});
leadSchema.pre("save", function (next) {
  if (this.isModified("isAssigned") && this.isAssigned && !this.assignedAt) {
    this.assignedAt = new Date();
  }
  if (this.isModified("isAssigned") && !this.isAssigned) {
    this.assignedAt = undefined;
    this.assignedTo = undefined;
  }
  if (this.address && typeof this.address === "object") {
    try {
      const { street = "", city = "", postalCode = "" } = this.address;
      this.address = `${street}, ${city} ${postalCode}`.trim();
    } catch (err) {
      this.address = JSON.stringify(this.address);
    }
  }
  next();
});
leadSchema.statics.findAvailableLeads = function (
  leadType,
  count,
  documentStatus = null
) {
  const query = {
    leadType,
    isAssigned: false,
  };
  if (leadType === "ftd" && documentStatus && Array.isArray(documentStatus)) {
    query["documents.status"] = { $in: documentStatus };
  }
  return this.find(query).limit(count);
};
leadSchema.statics.getLeadStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          leadType: "$leadType",
          isAssigned: "$isAssigned",
        },
        count: { $sum: 1 },
      },
    },
  ]);
};
leadSchema.methods.isAssignedToClientBroker = function (clientBrokerId) {
  return this.assignedClientBrokers.some(
    (brokerId) => brokerId.toString() === clientBrokerId.toString()
  );
};
leadSchema.methods.assignClientBroker = function (
  clientBrokerId,
  assignedBy,
  orderId,
  intermediaryClientNetwork = null,
  domain = null
) {
  const alreadyAssigned = this.isAssignedToClientBroker(clientBrokerId);

  if (!alreadyAssigned) {
    this.assignedClientBrokers.push(clientBrokerId);
  }

  const historyEntry = {
    clientBroker: clientBrokerId,
    assignedBy: assignedBy,
    orderId: orderId,
    intermediaryClientNetwork: intermediaryClientNetwork,
    domain: domain,
    injectionStatus: "pending",
    assignedAt: new Date(),
  };

  this.clientBrokerHistory.push(historyEntry);
};
leadSchema.methods.unassignClientBroker = function (clientBrokerId) {
  const index = this.assignedClientBrokers.findIndex(
    (brokerId) => brokerId.toString() === clientBrokerId.toString()
  );
  if (index > -1) {
    this.assignedClientBrokers.splice(index, 1);
  }
};
leadSchema.methods.updateInjectionStatus = function (
  orderId,
  status,
  domain = null
) {
  const assignment = this.clientBrokerHistory.find(
    (history) =>
      history.orderId && history.orderId.toString() === orderId.toString()
  );
  if (assignment) {
    assignment.injectionStatus = status;
    if (domain) {
      assignment.domain = domain;
    }
  }
};
leadSchema.methods.getAssignedClientBrokers = function () {
  return this.assignedClientBrokers.map((id) => id.toString());
};
leadSchema.methods.getClientBrokerHistory = function () {
  return this.clientBrokerHistory;
};
leadSchema.statics.canAssignToClientBroker = function (leadId, clientBrokerId) {
  return this.findById(leadId).then((lead) => {
    if (!lead) return false;
    return !lead.isAssignedToClientBroker(clientBrokerId);
  });
};
leadSchema.methods.putToSleep = function (
  reason = "No available client brokers"
) {
  this.brokerAvailabilityStatus = "sleep";
  this.sleepDetails = {
    putToSleepAt: new Date(),
    reason: reason,
    lastCheckedAt: new Date(),
  };
};
leadSchema.methods.wakeUp = function () {
  this.brokerAvailabilityStatus = "available";
  this.sleepDetails = {};
};
leadSchema.statics.findSleepingLeads = function () {
  return this.find({
    brokerAvailabilityStatus: { $in: ["sleep", "not_available_brokers"] },
  });
};
leadSchema.methods.isAssignedToClientNetwork = function (
  clientNetworkId,
  orderId = null
) {
  const isAssigned = this.clientNetworkHistory.some((history) => {
    const networkMatch =
      history.clientNetwork.toString() === clientNetworkId.toString();
    if (orderId) {
      return (
        networkMatch &&
        history.orderId &&
        history.orderId.toString() === orderId.toString()
      );
    }
    return networkMatch;
  });

  return isAssigned;
};
leadSchema.methods.addClientNetworkAssignment = function (
  clientNetworkId,
  assignedBy,
  orderId
) {
  if (this.isAssignedToClientNetwork(clientNetworkId, orderId)) {
    throw new Error(
      "Lead is already assigned to this client network in this order"
    );
  }
  this.clientNetworkHistory.push({
    clientNetwork: clientNetworkId,
    assignedBy: assignedBy,
    orderId: orderId,
  });
};
leadSchema.methods.getClientNetworkHistory = function () {
  return this.clientNetworkHistory;
};
leadSchema.methods.getAssignedClientNetworks = function () {
  return [
    ...new Set(
      this.clientNetworkHistory.map((history) =>
        history.clientNetwork.toString()
      )
    ),
  ];
};
leadSchema.methods.isAssignedToOurNetwork = function (
  ourNetworkId,
  orderId = null
) {
  const isAssigned = this.ourNetworkHistory.some((history) => {
    const networkMatch =
      history.ourNetwork.toString() === ourNetworkId.toString();
    if (orderId) {
      return (
        networkMatch &&
        history.orderId &&
        history.orderId.toString() === orderId.toString()
      );
    }
    return networkMatch;
  });

  return isAssigned;
};
leadSchema.methods.addOurNetworkAssignment = function (
  ourNetworkId,
  assignedBy,
  orderId
) {
  if (this.isAssignedToOurNetwork(ourNetworkId, orderId)) {
    throw new Error(
      "Lead is already assigned to this our network in this order"
    );
  }
  this.ourNetworkHistory.push({
    ourNetwork: ourNetworkId,
    assignedBy: assignedBy,
    orderId: orderId,
  });
};
leadSchema.methods.getOurNetworkHistory = function () {
  return this.ourNetworkHistory;
};
leadSchema.methods.getAssignedOurNetworks = function () {
  return [
    ...new Set(
      this.ourNetworkHistory.map((history) => history.ourNetwork.toString())
    ),
  ];
};
leadSchema.methods.isAssignedToCampaign = function (
  campaignId,
  orderId = null
) {
  const isAssigned = this.campaignHistory.some((history) => {
    const campaignMatch = history.campaign.toString() === campaignId.toString();
    if (orderId) {
      return (
        campaignMatch &&
        history.orderId &&
        history.orderId.toString() === orderId.toString()
      );
    }
    return campaignMatch;
  });

  return isAssigned;
};
leadSchema.methods.addCampaignAssignment = function (
  campaignId,
  assignedBy,
  orderId
) {
  if (this.isAssignedToCampaign(campaignId, orderId)) {
    throw new Error("Lead is already assigned to this campaign in this order");
  }
  this.campaignHistory.push({
    campaign: campaignId,
    assignedBy: assignedBy,
    orderId: orderId,
  });
};
leadSchema.methods.getCampaignHistory = function () {
  return this.campaignHistory;
};
leadSchema.methods.getAssignedCampaigns = function () {
  return [
    ...new Set(
      this.campaignHistory.map((history) => history.campaign.toString())
    ),
  ];
};
leadSchema.methods.updateCampaignPerformance = function (
  campaignId,
  orderId,
  performanceData
) {
  const assignment = this.campaignHistory.find(
    (history) =>
      history.campaign.toString() === campaignId.toString() &&
      history.orderId &&
      history.orderId.toString() === orderId.toString()
  );
  if (assignment) {
    Object.assign(assignment.performance, performanceData);
  } else {
    throw new Error("Campaign assignment not found for this lead and order");
  }
};
leadSchema.methods.assignFingerprint = async function (deviceType, createdBy) {
  const Fingerprint = require("./Fingerprint");
  if (!deviceType) {
    throw new Error("deviceType is required for fingerprint assignment");
  }
  if (!createdBy) {
    throw new Error("createdBy is required for fingerprint assignment");
  }
  if (this.fingerprint) {
    throw new Error("Lead already has a fingerprint assigned");
  }
  try {
    console.log(
      `[DEBUG] Creating fingerprint for lead ${this._id} with deviceType: ${deviceType}`
    );
    const fingerprint = await Fingerprint.createForLead(
      this._id,
      deviceType,
      createdBy
    );
    this.fingerprint = fingerprint._id;
    this.deviceType = deviceType;
    console.log(
      `[DEBUG] Successfully assigned fingerprint ${fingerprint.deviceId} to lead ${this._id}`
    );
    return fingerprint;
  } catch (error) {
    console.error(`Error assigning fingerprint to lead ${this._id}:`, error);
    throw error;
  }
};
leadSchema.methods.getFingerprint = async function () {
  if (!this.fingerprint) {
    return null;
  }
  const Fingerprint = require("./Fingerprint");
  return await Fingerprint.findById(this.fingerprint);
};
leadSchema.methods.updateDeviceType = async function (
  newDeviceType,
  createdBy
) {
  const Fingerprint = require("./Fingerprint");
  if (this.deviceType === newDeviceType) {
    return await this.getFingerprint();
  }
  if (this.fingerprint) {
    await Fingerprint.findByIdAndDelete(this.fingerprint);
  }
  const fingerprint = await Fingerprint.createForLead(
    this._id,
    newDeviceType,
    createdBy
  );
  this.fingerprint = fingerprint._id;
  this.deviceType = newDeviceType;
  return fingerprint;
};
leadSchema.methods.assignProxy = function (proxyId, orderId) {
  const existingAssignment = this.proxyAssignments.find(
    (assignment) =>
      assignment.orderId.toString() === orderId.toString() &&
      assignment.status === "active"
  );
  if (existingAssignment) {
    return false;
  }
  this.proxyAssignments.push({
    proxy: proxyId,
    orderId: orderId,
    assignedAt: new Date(),
    status: "active",
  });
  return true;
};
leadSchema.methods.getActiveProxy = function (orderId) {
  const assignment = this.proxyAssignments.find(
    (assignment) =>
      assignment.orderId.toString() === orderId.toString() &&
      assignment.status === "active"
  );
  return assignment ? assignment.proxy : null;
};
leadSchema.methods.completeProxyAssignment = function (
  orderId,
  status = "completed"
) {
  const assignment = this.proxyAssignments.find(
    (assignment) =>
      assignment.orderId.toString() === orderId.toString() &&
      assignment.status === "active"
  );
  if (assignment) {
    assignment.status = status;
    assignment.completedAt = new Date();
    return true;
  }
  return false;
};
leadSchema.methods.getProxyAssignments = function () {
  return this.proxyAssignments;
};
leadSchema.methods.hasActiveProxyAssignments = function () {
  return this.proxyAssignments.some(
    (assignment) => assignment.status === "active"
  );
};
leadSchema.statics.findByDeviceType = function (deviceType, options = {}) {
  const query = { deviceType };
  if (options.leadType) {
    query.leadType = options.leadType;
  }
  if (options.isAssigned !== undefined) {
    query.isAssigned = options.isAssigned;
  }
  if (options.status) {
    query.status = options.status;
  }
  return this.find(query);
};
leadSchema.statics.getDeviceTypeStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          deviceType: "$deviceType",
          leadType: "$leadType",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.deviceType",
        totalCount: { $sum: "$count" },
        byLeadType: {
          $push: {
            leadType: "$_id.leadType",
            count: "$count",
          },
        },
      },
    },
  ]);
};
leadSchema.statics.generateSessionId = function () {
  const crypto = require("crypto");
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  return `session_${timestamp}_${randomBytes}`;
};
leadSchema.methods.storeBrowserSession = function (
  sessionData,
  orderId = null,
  assignedBy = null
) {
  const { sessionId } = sessionData;

  if (!sessionId) {
    throw new Error("A valid sessionId must be provided in the session data.");
  }

  if (!sessionData || typeof sessionData !== "object") {
    throw new Error("Session data is required and must be an object");
  }

  const session = {
    ...sessionData,
    sessionId: sessionId,
    isActive: true,
    lastAccessedAt: new Date(),
    metadata: {
      ...sessionData.metadata,
      orderId: orderId,
      assignedBy: assignedBy,
    },
  };

  if (this.browserSession && this.browserSession.sessionId) {
    this.deactivateCurrentSession();
  }

  this.browserSession = session;
  this.sessionHistory.push(session);
  this.currentSessionId = sessionId;

  return sessionId;
};
leadSchema.methods.getCurrentBrowserSession = function () {
  if (!this.browserSession || !this.browserSession.isActive) {
    return null;
  }
  return this.browserSession;
};
leadSchema.methods.getSessionById = function (sessionId) {
  if (this.browserSession && this.browserSession.sessionId === sessionId) {
    return this.browserSession;
  }
  return (
    this.sessionHistory.find((session) => session.sessionId === sessionId) ||
    null
  );
};
leadSchema.methods.updateSessionAccess = function (sessionId = null) {
  const targetSessionId = sessionId || this.currentSessionId;
  if (!targetSessionId) {
    return false;
  }
  if (
    this.browserSession &&
    this.browserSession.sessionId === targetSessionId
  ) {
    this.browserSession.lastAccessedAt = new Date();
  }
  const historySession = this.sessionHistory.find(
    (session) => session.sessionId === targetSessionId
  );
  if (historySession) {
    historySession.lastAccessedAt = new Date();
  }
  return true;
};
leadSchema.methods.deactivateCurrentSession = function () {
  if (this.browserSession && this.browserSession.isActive) {
    this.browserSession.isActive = false;
    const historySession = this.sessionHistory.find(
      (session) => session.sessionId === this.browserSession.sessionId
    );
    if (historySession) {
      historySession.isActive = false;
    }
  }
};
leadSchema.methods.activateSession = function (sessionId) {
  const session = this.getSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  this.deactivateCurrentSession();
  this.browserSession = {
    ...session,
    isActive: true,
    lastAccessedAt: new Date(),
  };
  this.currentSessionId = sessionId;
  const historySession = this.sessionHistory.find(
    (s) => s.sessionId === sessionId
  );
  if (historySession) {
    historySession.isActive = true;
    historySession.lastAccessedAt = new Date();
  }
  return session;
};
leadSchema.methods.hasActiveBrowserSession = function () {
  return (
    this.browserSession &&
    this.browserSession.isActive &&
    this.browserSession.sessionId
  );
};
leadSchema.methods.validateSessionData = function (sessionId = null) {
  const session = sessionId
    ? this.getSessionById(sessionId)
    : this.getCurrentBrowserSession();
  if (!session) {
    return { valid: false, reason: "Session not found" };
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (session.createdAt < thirtyDaysAgo) {
    return { valid: false, reason: "Session expired" };
  }
  if (!session.cookies || !Array.isArray(session.cookies)) {
    return { valid: false, reason: "Invalid cookies data" };
  }
  return { valid: true, session: session };
};
leadSchema.methods.getAllSessions = function () {
  const sessions = [...this.sessionHistory];
  if (this.browserSession && this.browserSession.sessionId) {
    const existsInHistory = sessions.some(
      (s) => s.sessionId === this.browserSession.sessionId
    );
    if (!existsInHistory) {
      sessions.push(this.browserSession);
    }
  }
  return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
leadSchema.methods.clearExpiredSessions = function (daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  this.sessionHistory = this.sessionHistory.filter(
    (session) => session.createdAt >= cutoffDate
  );
  if (this.browserSession && this.browserSession.createdAt < cutoffDate) {
    this.browserSession = {};
    this.currentSessionId = null;
  }
};
leadSchema.statics.findLeadsWithActiveSessions = function (options = {}) {
  const query = {
    "browserSession.isActive": true,
    "browserSession.sessionId": { $exists: true, $ne: null },
  };
  if (options.leadType) {
    query.leadType = options.leadType;
  }
  if (options.assignedTo) {
    query.assignedTo = options.assignedTo;
  }
  return this.find(query);
};
leadSchema.statics.findLeadsWithExpiredSessions = function (daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.find({
    $or: [
      { "browserSession.createdAt": { $lt: cutoffDate } },
      { "sessionHistory.createdAt": { $lt: cutoffDate } },
    ],
  });
};
module.exports = mongoose.model("Lead", leadSchema);
