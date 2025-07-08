const express = require("express");
const mongoose = require("mongoose");
const { body, query } = require("express-validator");
const {
  protect,
  isManager,
  hasPermission,
  authorize,
} = require("../middleware/auth");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  getOrderStats,
  exportOrderLeads,
  assignClientInfoToOrderLeads,
  startOrderInjection,
  pauseOrderInjection,
  stopOrderInjection,
  skipOrderFTDs,
  assignClientBrokers,
  getLeadsPendingBrokerAssignment,
  skipBrokerAssignment,
  getFTDLeadsForOrder,
  manualFTDInjection,
  startManualFTDInjection,
  completeManualFTDInjection,
  startManualFTDInjectionForLead,
  completeManualFTDInjectionForLead,
  startManualInjectionForLead,
  completeManualInjectionForLead,
} = require("../controllers/orders");
const router = express.Router();
router.post(
  "/",
  [
    protect,
    isManager,
    hasPermission("canCreateOrders"),
    body("requests.ftd")
      .optional()
      .isInt({ min: 0 })
      .withMessage("FTD request must be a non-negative integer"),
    body("requests.filler")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Filler request must be a non-negative integer"),
    body("requests.cold")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Cold request must be a non-negative integer"),
    body("requests.live")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Live request must be a non-negative integer"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be less than 500 characters"),
    body("country")
      .notEmpty()
      .withMessage("Country filter is required")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Country must be at least 2 characters"),
    body("gender")
      .optional({ nullable: true })
      .isIn(["male", "female", "not_defined", null, ""])
      .withMessage("Gender must be male, female, not_defined, or empty"),
    body("selectedClientNetwork").custom((value, { req }) => {
      if (req.user && req.user.role === "affiliate_manager") {
        if (!value || value === "") {
          throw new Error(
            "Client network selection is required for affiliate managers"
          );
        }
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(
            "selectedClientNetwork must be a valid MongoDB ObjectId"
          );
        }
      } else {
        if (value && value !== "" && !mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(
            "selectedClientNetwork must be a valid MongoDB ObjectId"
          );
        }
      }
      return true;
    }),
    body("selectedOurNetwork")
      .optional()
      .custom((value, { req }) => {
        if (value && value !== "" && !mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(
            "selectedOurNetwork must be a valid MongoDB ObjectId"
          );
        }
        return true;
      }),
    body("selectedCampaign")
      .notEmpty()
      .withMessage("Campaign selection is mandatory for all orders")
      .isMongoId()
      .withMessage("Selected campaign must be a valid MongoDB ObjectId"),
    body("injectionSettings")
      .optional()
      .isObject()
      .withMessage("injectionSettings must be an object"),
    body("injectionSettings.enabled")
      .optional()
      .isBoolean()
      .withMessage("injectionSettings.enabled must be a boolean"),
    body("injectionSettings.mode")
      .optional()
      .isIn(["bulk", "scheduled"])
      .withMessage("injectionSettings.mode must be 'bulk' or 'scheduled'"),
    body("injectionSettings.includeTypes")
      .optional()
      .isObject()
      .withMessage("injectionSettings.includeTypes must be an object"),
    body("injectionSettings.includeTypes.filler")
      .optional()
      .isBoolean()
      .withMessage("injectionSettings.includeTypes.filler must be a boolean"),
    body("injectionSettings.includeTypes.cold")
      .optional()
      .isBoolean()
      .withMessage("injectionSettings.includeTypes.cold must be a boolean"),
    body("injectionSettings.includeTypes.live")
      .optional()
      .isBoolean()
      .withMessage("injectionSettings.includeTypes.live must be a boolean"),
    body("injectionSettings.scheduledTime")
      .optional()
      .isObject()
      .withMessage("injectionSettings.scheduledTime must be an object"),
    body("injectionSettings.scheduledTime.startTime")
      .optional()
      .custom((value) => {
        if (!value || value === "") {
          return true;
        }
        if (typeof value === "string" && value.match(/^\d{2}:\d{2}$/)) {
          return true;
        }
        if (typeof value === "string" && !isNaN(Date.parse(value))) {
          return true;
        }
        throw new Error(
          "injectionSettings.scheduledTime.startTime must be either HH:MM format or ISO8601 date"
        );
      }),
    body("injectionSettings.scheduledTime.endTime")
      .optional()
      .custom((value) => {
        if (!value || value === "") {
          return true;
        }
        if (typeof value === "string" && value.match(/^\d{2}:\d{2}$/)) {
          return true;
        }
        if (typeof value === "string" && !isNaN(Date.parse(value))) {
          return true;
        }
        throw new Error(
          "injectionSettings.scheduledTime.endTime must be either HH:MM format or ISO8601 date"
        );
      }),
  ],
  createOrder
);
router.get(
  "/",
  [
    protect,
    isManager,
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  getOrders
);
router.get("/stats", [protect, isManager], getOrderStats);
router.get("/:id", [protect, isManager], getOrderById);
router.put("/:id", [protect, isManager], updateOrder);
router.delete("/:id", [protect, isManager], cancelOrder);
router.get("/:id/export", [protect, isManager], exportOrderLeads);
router.put(
  "/:id/assign-client-info",
  [
    protect,
    isManager,
    body("client").optional().trim(),
    body("clientBroker").optional().trim(),
    body("clientNetwork").optional().trim(),
  ],
  assignClientInfoToOrderLeads
);
router.post("/:id/start-injection", [protect, isManager], startOrderInjection);
router.post("/:id/pause-injection", [protect, isManager], pauseOrderInjection);
router.post("/:id/stop-injection", [protect, isManager], stopOrderInjection);
router.post("/:id/skip-ftds", [protect, isManager], skipOrderFTDs);
router.post("/:id/assign-brokers", [protect, isManager], assignClientBrokers);
router.get(
  "/:id/pending-broker-assignment",
  [protect, isManager],
  getLeadsPendingBrokerAssignment
);
router.post(
  "/:id/skip-broker-assignment",
  [protect, isManager],
  skipBrokerAssignment
);
router.get("/:id/ftd-leads", [protect, isManager], getFTDLeadsForOrder);
router.post(
  "/:id/manual-ftd-injection-start",
  [protect, isManager],
  startManualFTDInjection
);
router.post(
  "/:id/manual-ftd-injection-complete",
  [protect, isManager],
  completeManualFTDInjection
);
router.post(
  "/:id/manual-ftd-injection",
  [protect, isManager],
  manualFTDInjection
);
router.post(
  "/:id/leads/:leadId/manual-ftd-injection-start",
  [protect, isManager],
  startManualFTDInjectionForLead
);
router.post(
  "/:id/leads/:leadId/manual-ftd-injection-complete",
  [protect, isManager],
  completeManualFTDInjectionForLead
);
router.post(
  "/:id/leads/:leadId/manual-injection-start",
  [protect, isManager],
  startManualInjectionForLead
);
router.post(
  "/:id/leads/:leadId/manual-injection-complete",
  [protect, isManager],
  completeManualInjectionForLead
);
router.post(
  "/:id/assign-devices",
  protect,
  authorize("admin", "affiliate_manager"),
  async (req, res) => {
    try {
      const { deviceConfig } = req.body;
      const orderId = req.params.id;
      const Order = require("../models/Order");
      const Lead = require("../models/Lead");
      const DeviceAssignmentService = require("../services/deviceAssignmentService");
      const validation =
        DeviceAssignmentService.validateDeviceConfig(deviceConfig);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }
      const order = await Order.findById(orderId).populate("leads");
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      const results = await DeviceAssignmentService.assignDevicesToLeads(
        order.leads,
        deviceConfig,
        req.user.id
      );
      order.injectionSettings.deviceConfig = deviceConfig;
      await order.save();
      res.status(200).json({
        success: true,
        message: "Device assignment completed",
        data: {
          results,
          order: order,
        },
      });
    } catch (error) {
      console.error("Error assigning devices to order:", error);
      res.status(500).json({
        success: false,
        message: "Server error during device assignment",
        error: error.message,
      });
    }
  }
);
router.get(
  "/:id/device-stats",
  protect,
  authorize("admin", "affiliate_manager"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const Order = require("../models/Order");
      const DeviceAssignmentService = require("../services/deviceAssignmentService");
      const order = await Order.findById(orderId).populate("leads");
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      const stats = await DeviceAssignmentService.getDeviceStats(order.leads);
      res.status(200).json({
        success: true,
        data: {
          stats,
          deviceConfig: order.injectionSettings?.deviceConfig || null,
        },
      });
    } catch (error) {
      console.error("Error getting device stats:", error);
      res.status(500).json({
        success: false,
        message: "Server error getting device statistics",
        error: error.message,
      });
    }
  }
);
router.post(
  "/monitor-proxies",
  protect,
  authorize("admin", "affiliate_manager"),
  async (req, res) => {
    try {
      const ProxyManagementService = require("../services/proxyManagementService");
      console.log("Starting proxy health monitoring...");
      const results = await ProxyManagementService.monitorProxyHealth();
      res.status(200).json({
        success: true,
        message: "Proxy health monitoring completed",
        data: results,
      });
    } catch (error) {
      console.error("Error monitoring proxy health:", error);
      res.status(500).json({
        success: false,
        message: "Server error during proxy monitoring",
        error: error.message,
      });
    }
  }
);
router.get(
  "/proxy-stats",
  protect,
  authorize("admin", "affiliate_manager"),
  async (req, res) => {
    try {
      const ProxyManagementService = require("../services/proxyManagementService");
      const stats = await ProxyManagementService.getProxyStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting proxy stats:", error);
      res.status(500).json({
        success: false,
        message: "Server error getting proxy statistics",
        error: error.message,
      });
    }
  }
);
router.put(
  "/leads/:leadId/device",
  protect,
  authorize("admin", "affiliate_manager"),
  async (req, res) => {
    try {
      const { deviceType } = req.body;
      const leadId = req.params.leadId;
      if (
        !deviceType ||
        !["windows", "android", "ios", "mac"].includes(deviceType)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid device type is required",
        });
      }
      const DeviceAssignmentService = require("../services/deviceAssignmentService");
      const result = await DeviceAssignmentService.updateLeadDevice(
        leadId,
        deviceType,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: `Updated lead device to ${deviceType}`,
        data: result,
      });
    } catch (error) {
      console.error("Error updating lead device:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating lead device",
        error: error.message,
      });
    }
  }
);
module.exports = router;