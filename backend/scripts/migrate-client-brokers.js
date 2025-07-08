const mongoose = require("mongoose");
require("dotenv").config();
const ClientNetwork = require("../models/ClientNetwork");
const ClientBroker = require("../models/ClientBroker");
const Lead = require("../models/Lead");
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://dani034406:Daniel6285@cluster0.g0vqepz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        family: 4,
      }
    );
    console.log("Connected to MongoDB for migration");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
const migrateClientBrokers = async () => {
  try {
    console.log("Starting client broker migration...");
    const clientNetworks = await ClientNetwork.find({
      clientBrokers: { $exists: true, $ne: [] }
    });
    console.log(`Found ${clientNetworks.length} client networks with embedded brokers`);
    let totalBrokersCreated = 0;
    let totalLeadsUpdated = 0;
    const brokerMapping = new Map();
    for (const network of clientNetworks) {
      console.log(`Processing network: ${network.name}`);
      if (!network.clientBrokers || network.clientBrokers.length === 0) {
        continue;
      }
      for (const embeddedBroker of network.clientBrokers) {
        try {
          let existingBroker = await ClientBroker.findOne({
            $or: [
              { name: embeddedBroker.name },
              { domain: embeddedBroker.domain }
            ]
          });
          if (existingBroker) {
            console.log(`Broker ${embeddedBroker.name} already exists, skipping creation`);
            brokerMapping.set(embeddedBroker.name, existingBroker._id);
            if (embeddedBroker.domain) {
              brokerMapping.set(embeddedBroker.domain, existingBroker._id);
            }
            continue;
          }
          const newBroker = new ClientBroker({
            name: embeddedBroker.name,
            domain: embeddedBroker.domain,
            isActive: embeddedBroker.isActive !== undefined ? embeddedBroker.isActive : true,
            createdBy: network.createdBy,
            createdAt: embeddedBroker.addedAt || network.createdAt,
          });
          await newBroker.save();
          totalBrokersCreated++;
          brokerMapping.set(embeddedBroker.name, newBroker._id);
          if (embeddedBroker.domain) {
            brokerMapping.set(embeddedBroker.domain, newBroker._id);
          }
          console.log(`Created broker: ${newBroker.name} (${newBroker._id})`);
        } catch (error) {
          console.error(`Error creating broker ${embeddedBroker.name}:`, error.message);
        }
      }
    }
    console.log("Updating lead client broker relationships...");
    const leadsWithHistory = await Lead.find({
      clientNetworkHistory: { $exists: true, $ne: [] }
    });
    console.log(`Found ${leadsWithHistory.length} leads with client network history`);
    for (const lead of leadsWithHistory) {
      let leadUpdated = false;
      const newAssignedBrokers = [];
      const newBrokerHistory = [];
      for (const historyEntry of lead.clientNetworkHistory) {
        if (historyEntry.clientBroker) {
          const brokerId = brokerMapping.get(historyEntry.clientBroker);
          if (brokerId) {
            const newHistoryEntry = {
              clientBroker: brokerId,
              assignedAt: historyEntry.assignedAt,
              assignedBy: historyEntry.assignedBy,
              orderId: historyEntry.orderId,
              injectionStatus: historyEntry.injectionStatus || "pending",
              intermediaryClientNetwork: historyEntry.clientNetwork,
              domain: historyEntry.domain,
            };
            newBrokerHistory.push(newHistoryEntry);
            if (!newAssignedBrokers.some(id => id.toString() === brokerId.toString())) {
              newAssignedBrokers.push(brokerId);
            }
            leadUpdated = true;
          } else {
            console.warn(`Could not find broker mapping for: ${historyEntry.clientBroker} in lead ${lead._id}`);
          }
        }
      }
      if (leadUpdated) {
        lead.assignedClientBrokers = newAssignedBrokers;
        lead.clientBrokerHistory = newBrokerHistory;
        lead.clientNetworkHistory = undefined;
        lead.clientBroker = undefined;
        lead.clientNetwork = undefined;
        await lead.save();
        totalLeadsUpdated++;
        for (const brokerId of newAssignedBrokers) {
          await ClientBroker.findByIdAndUpdate(
            brokerId,
            {
              $addToSet: { assignedLeads: lead._id },
              $inc: { totalLeadsAssigned: 1 },
              lastAssignedAt: new Date(),
            }
          );
        }
      }
    }
    console.log("Cleaning up client network documents...");
    await ClientNetwork.updateMany(
      { clientBrokers: { $exists: true } },
      { $unset: { clientBrokers: "" } }
    );
    console.log("Migration completed successfully!");
    console.log(`- Created ${totalBrokersCreated} new ClientBroker documents`);
    console.log(`- Updated ${totalLeadsUpdated} leads with new broker relationships`);
    console.log(`- Cleaned up ${clientNetworks.length} client network documents`);
  } catch (error) {
    console.error("Migration error:", error);
  }
};
const runMigration = async () => {
  await connectDB();
  await migrateClientBrokers();
  await mongoose.connection.close();
  console.log("Migration completed and database connection closed");
  process.exit(0);
};
if (require.main === module) {
  runMigration();
}
module.exports = { migrateClientBrokers };