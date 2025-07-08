const Proxy = require("../models/Proxy");
const Lead = require("../models/Lead");
class ProxyManagementService {
  static async assignProxiesToLeads(leads, proxyConfig, createdBy) {
    try {
      console.log(`Assigning proxies to ${leads.length} leads...`);
      const results = {
        successful: [],
        failed: [],
      };
      const leadsByCountry = this.groupLeadsByCountry(leads);
      for (const [country, countryLeads] of Object.entries(leadsByCountry)) {
        console.log(
          `Processing ${countryLeads.length} leads for ${country}...`
        );
        const countryCode =
          countryLeads[0].countryCode || country.toLowerCase();
        try {
          const assignments = await this.assignIndividualProxies(
            countryLeads,
            country,
            createdBy
          );
          results.successful.push(...assignments);
        } catch (error) {
          console.error(`Error assigning proxies for ${country}:`, error);
          countryLeads.forEach((lead) => {
            results.failed.push({
              leadId: lead._id,
              country: country,
              error: error.message,
            });
          });
        }
      }
      console.log(
        `Proxy assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`
      );
      return results;
    } catch (error) {
      console.error("Error in proxy assignment:", error);
      throw error;
    }
  }
  static groupLeadsByCountry(leads) {
    const grouped = {};
    leads.forEach((lead) => {
      const country = lead.country;
      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push(lead);
    });
    return grouped;
  }
  static async assignIndividualProxies(leads, country, createdBy) {
    const assignments = [];
    for (const lead of leads) {
      try {
        console.log(`Creating proxy for lead ${lead._id} in ${country}...`);
        const { getCountryISOCode } = require("../utils/proxyManager");
        const countryCode = lead.countryCode || getCountryISOCode(country);
        const proxy = await Proxy.findOrCreateProxy(
          country,
          countryCode,
          createdBy
        );
        if (proxy) {
          const assigned = proxy.assignLead(lead._id, lead.orderId);
          if (assigned) {
            await proxy.save();
            assignments.push({
              leadId: lead._id,
              proxyId: proxy._id,
              country: country,
              proxyConfig: proxy.config,
            });
            console.log(
              `Successfully assigned proxy ${proxy.proxyId} to lead ${lead._id}`
            );
          } else {
            throw new Error(`Failed to assign proxy to lead ${lead._id}`);
          }
        } else {
          throw new Error(`No proxy available for ${country}`);
        }
      } catch (error) {
        console.error(`Error assigning proxy to lead ${lead._id}:`, error);
        throw error;
      }
    }
    return assignments;
  }
  static async monitorProxyHealth() {
    try {
      console.log("Starting proxy health monitoring...");
      const activeProxies = await Proxy.find({
        status: "active",
        "health.isHealthy": true,
        "health.lastHealthCheck": {
          $lt: new Date(Date.now() - 5 * 60 * 1000),
        },
      });
      console.log(`Found ${activeProxies.length} proxies to health check`);
      const results = {
        healthy: 0,
        unhealthy: 0,
        errors: [],
      };
      for (const proxy of activeProxies) {
        try {
          const isHealthy = await proxy.testConnection();
          if (isHealthy) {
            results.healthy++;
          } else {
            results.unhealthy++;
            await this.handleUnhealthyProxy(proxy);
          }
          await proxy.save();
        } catch (error) {
          console.error(`Error checking proxy ${proxy.proxyId}:`, error);
          results.errors.push({
            proxyId: proxy.proxyId,
            error: error.message,
          });
        }
      }
      const cleanedUp = await Proxy.cleanupFailedProxies();
      results.cleaned = cleanedUp;
      console.log("Proxy health monitoring completed:", results);
      return results;
    } catch (error) {
      console.error("Error in proxy health monitoring:", error);
      throw error;
    }
  }
  static async handleUnhealthyProxy(proxy) {
    try {
      console.log(`Handling unhealthy proxy: ${proxy.proxyId}`);
      const affectedLeads = await Lead.find({
        "proxyAssignments.proxy": proxy._id,
        "proxyAssignments.status": "active",
      });
      if (affectedLeads.length > 0) {
        console.log(
          `Found ${affectedLeads.length} leads affected by unhealthy proxy`
        );
        for (const lead of affectedLeads) {
          const assignment = lead.proxyAssignments.find(
            (assignment) =>
              assignment.proxy.toString() === proxy._id.toString() &&
              assignment.status === "active"
          );
          if (assignment) {
            assignment.status = "failed";
            assignment.completedAt = new Date();
          }
          await lead.save();
        }
        if (
          proxy.assignedLead.leadId &&
          proxy.assignedLead.status === "active"
        ) {
          proxy.assignedLead.status = "failed";
          proxy.assignedLead.completedAt = new Date();
          proxy.usage.activeConnections = 0;
          await proxy.save();
        }
      }
    } catch (error) {
      console.error(`Error handling unhealthy proxy ${proxy.proxyId}:`, error);
    }
  }
  static async getProxyStats() {
    try {
      const stats = await Proxy.aggregate([
        {
          $group: {
            _id: {
              status: "$status",
              country: "$country",
            },
            count: { $sum: 1 },
            totalConnections: { $sum: "$usage.totalConnections" },
            activeConnections: { $sum: "$usage.activeConnections" },
          },
        },
        {
          $group: {
            _id: "$_id.status",
            totalProxies: { $sum: "$count" },
            countries: { $addToSet: "$_id.country" },
            totalConnections: { $sum: "$totalConnections" },
            activeConnections: { $sum: "$activeConnections" },
          },
        },
      ]);
      return stats;
    } catch (error) {
      console.error("Error getting proxy stats:", error);
      throw error;
    }
  }
  static async getLeadProxy(leadId, orderId) {
    try {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error("Lead not found");
      }
      const proxyId = lead.getActiveProxy(orderId);
      if (!proxyId) {
        return null;
      }
      return await Proxy.findById(proxyId);
    } catch (error) {
      console.error(`Error getting proxy for lead ${leadId}:`, error);
      throw error;
    }
  }
}
module.exports = ProxyManagementService;