const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const OurNetwork = require("../models/OurNetwork");
const User = require("../models/User");
const Lead = require("../models/Lead");

exports.getOurNetworks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (req.user.role === "affiliate_manager") {
      filter.assignedAffiliateManagers = req.user._id;
    }

    const skip = (page - 1) * limit;
    const [ourNetworks, total] = await Promise.all([
      OurNetwork.find(filter)
        .populate("assignedAffiliateManagers", "fullName email")
        .populate("createdBy", "fullName email")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      OurNetwork.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: ourNetworks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOurNetwork = async (req, res, next) => {
  try {
    const ourNetwork = await OurNetwork.findById(req.params.id)
      .populate("assignedAffiliateManagers", "fullName email")
      .populate("createdBy", "fullName email");

    if (!ourNetwork) {
      return res.status(404).json({
        success: false,
        message: "Our network not found",
      });
    }

    if (req.user.role === "affiliate_manager") {
      const isAssigned = ourNetwork.assignedAffiliateManagers.some(
        (manager) => manager._id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Access denied - our network not assigned to you",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: ourNetwork,
    });
  } catch (error) {
    next(error);
  }
};

exports.createOurNetwork = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { name, description, assignedAffiliateManagers = [] } = req.body;

    if (assignedAffiliateManagers.length > 0) {
      const managers = await User.find({
        _id: { $in: assignedAffiliateManagers },
        role: "affiliate_manager",
        isActive: true,
        status: "approved",
      });

      if (managers.length !== assignedAffiliateManagers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more affiliate managers are invalid or inactive",
        });
      }
    }

    const ourNetwork = new OurNetwork({
      name,
      description,
      assignedAffiliateManagers,
      createdBy: req.user._id,
    });

    await ourNetwork.save();
    await ourNetwork.populate([
      { path: "assignedAffiliateManagers", select: "fullName email" },
      { path: "createdBy", select: "fullName email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Our network created successfully",
      data: ourNetwork,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Our network name already exists",
      });
    }
    next(error);
  }
};

exports.updateOurNetwork = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { name, description, assignedAffiliateManagers, isActive } = req.body;

    const ourNetwork = await OurNetwork.findById(req.params.id);
    if (!ourNetwork) {
      return res.status(404).json({
        success: false,
        message: "Our network not found",
      });
    }

    if (assignedAffiliateManagers && assignedAffiliateManagers.length > 0) {
      const managers = await User.find({
        _id: { $in: assignedAffiliateManagers },
        role: "affiliate_manager",
        isActive: true,
        status: "approved",
      });

      if (managers.length !== assignedAffiliateManagers.length) {
        return res.status(400).json({
          success: false,
          message: "One or more affiliate managers are invalid or inactive",
        });
      }
    }

    if (name !== undefined) ourNetwork.name = name;
    if (description !== undefined) ourNetwork.description = description;
    if (assignedAffiliateManagers !== undefined)
      ourNetwork.assignedAffiliateManagers = assignedAffiliateManagers;
    if (isActive !== undefined) ourNetwork.isActive = isActive;

    await ourNetwork.save();
    await ourNetwork.populate([
      { path: "assignedAffiliateManagers", select: "fullName email" },
      { path: "createdBy", select: "fullName email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Our network updated successfully",
      data: ourNetwork,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Our network name already exists",
      });
    }
    next(error);
  }
};

exports.deleteOurNetwork = async (req, res, next) => {
  try {
    const ourNetwork = await OurNetwork.findById(req.params.id);
    if (!ourNetwork) {
      return res.status(404).json({
        success: false,
        message: "Our network not found",
      });
    }

    await OurNetwork.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Our network deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyOurNetworks = async (req, res, next) => {
  try {
    if (req.user.role !== "affiliate_manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only affiliate managers can access this endpoint.",
      });
    }

    const ourNetworks = await OurNetwork.find({
      assignedAffiliateManagers: req.user._id,
      isActive: true,
    })
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: ourNetworks,
    });
  } catch (error) {
    next(error);
  }
}; 