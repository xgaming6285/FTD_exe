const express = require("express");
const { body } = require("express-validator");
const {
  getOurNetworks,
  getOurNetwork,
  createOurNetwork,
  updateOurNetwork,
  deleteOurNetwork,
  getMyOurNetworks,
} = require("../controllers/ourNetworks");
const { protect, isAdmin, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", [protect, authorize("admin", "affiliate_manager")], getOurNetworks);
router.get("/my-networks", [protect, authorize("affiliate_manager")], getMyOurNetworks);
router.get("/:id", [protect, authorize("admin", "affiliate_manager")], getOurNetwork);

router.post(
  "/",
  [
    protect,
    isAdmin,
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name is required and must be less than 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("assignedAffiliateManagers")
      .optional()
      .isArray()
      .withMessage("Assigned affiliate managers must be an array"),
    body("assignedAffiliateManagers.*")
      .optional()
      .isMongoId()
      .withMessage("Each affiliate manager ID must be a valid MongoDB ObjectId"),
  ],
  createOurNetwork
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
      .withMessage("Name must be less than 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),
    body("assignedAffiliateManagers")
      .optional()
      .isArray()
      .withMessage("Assigned affiliate managers must be an array"),
    body("assignedAffiliateManagers.*")
      .optional()
      .isMongoId()
      .withMessage("Each affiliate manager ID must be a valid MongoDB ObjectId"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  updateOurNetwork
);

router.delete("/:id", [protect, isAdmin], deleteOurNetwork);

module.exports = router; 