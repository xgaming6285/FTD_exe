const express = require("express");
const { body } = require("express-validator");
const {
    getClientBrokers,
    getClientBroker,
    createClientBroker,
    updateClientBroker,
    deleteClientBroker,
    assignLeadToBroker,
    unassignLeadFromBroker,
    getBrokerLeads,
    getBrokerStats,
} = require("../controllers/clientBrokers");
const { protect, isAdmin, authorize } = require("../middleware/auth");
const router = express.Router();
router.get("/", [protect, authorize("admin", "affiliate_manager")], getClientBrokers);
router.get("/stats", [protect, authorize("admin", "affiliate_manager")], getBrokerStats);
router.get("/:id", [protect, authorize("admin", "affiliate_manager")], getClientBroker);
router.post(
    "/",
    [
        protect,
        isAdmin,
        body("name")
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Broker name is required and must be less than 100 characters"),
        body("domain")
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage("Domain must be less than 200 characters"),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage("Description must be less than 500 characters"),
    ],
    createClientBroker
);
router.put(
    "/:id",
    [
        protect,
        isAdmin,
        body("name")
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Broker name must be less than 100 characters"),
        body("domain")
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage("Domain must be less than 200 characters"),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage("Description must be less than 500 characters"),
        body("isActive")
            .optional()
            .isBoolean()
            .withMessage("isActive must be a boolean"),
    ],
    updateClientBroker
);
router.delete("/:id", [protect, isAdmin], deleteClientBroker);
router.post(
    "/:id/assign-lead",
    [
        protect,
        authorize("admin", "affiliate_manager"),
        body("leadId")
            .isMongoId()
            .withMessage("Valid lead ID is required"),
        body("orderId")
            .optional()
            .isMongoId()
            .withMessage("Order ID must be valid"),
        body("intermediaryClientNetwork")
            .optional()
            .isMongoId()
            .withMessage("Client network ID must be valid"),
        body("domain")
            .optional()
            .trim(),
    ],
    assignLeadToBroker
);
router.delete(
    "/:id/unassign-lead/:leadId",
    [protect, authorize("admin", "affiliate_manager")],
    unassignLeadFromBroker
);
router.get("/:id/leads", [protect, authorize("admin", "affiliate_manager")], getBrokerLeads);
module.exports = router;