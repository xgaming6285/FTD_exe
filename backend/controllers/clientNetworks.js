const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const ClientNetwork = require("../models/ClientNetwork");
const User = require("../models/User");
const Lead = require("../models/Lead");
exports.getClientNetworks = async (req, res, next) => {
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
    const [clientNetworks, total] = await Promise.all([
      ClientNetwork.find(filter)
        .populate("assignedAffiliateManagers", "fullName email")
        .populate("createdBy", "fullName email")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      ClientNetwork.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      data: clientNetworks,
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
exports.getClientNetwork = async (req, res, next) => {
  try {
    const clientNetwork = await ClientNetwork.findById(req.params.id)
      .populate("assignedAffiliateManagers", "fullName email")
      .populate("createdBy", "fullName email");
    if (!clientNetwork) {
      return res.status(404).json({
        success: false,
        message: "Client network not found",
      });
    }
    if (req.user.role === "affiliate_manager") {
      const isAssigned = clientNetwork.assignedAffiliateManagers.some(
        (manager) => manager._id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Access denied - client network not assigned to you",
        });
      }
    }
    res.status(200).json({
      success: true,
      data: clientNetwork,
    });
  } catch (error) {
    next(error);
  }
};
exports.createClientNetwork = async (req, res, next) => {
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
    const clientNetwork = new ClientNetwork({
      name,
      description,
      assignedAffiliateManagers,
      createdBy: req.user._id,
    });
    await clientNetwork.save();
    await clientNetwork.populate([
      { path: "assignedAffiliateManagers", select: "fullName email" },
      { path: "createdBy", select: "fullName email" },
    ]);
    res.status(201).json({
      success: true,
      message: "Client network created successfully",
      data: clientNetwork,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Client network name already exists",
      });
    }
    next(error);
  }
};
exports.updateClientNetwork = async (req, res, next) => {
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
    const clientNetwork = await ClientNetwork.findById(req.params.id);
    if (!clientNetwork) {
      return res.status(404).json({
        success: false,
        message: "Client network not found",
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
    if (name !== undefined) clientNetwork.name = name;
    if (description !== undefined) clientNetwork.description = description;
    if (assignedAffiliateManagers !== undefined)
      clientNetwork.assignedAffiliateManagers = assignedAffiliateManagers;
    if (isActive !== undefined) clientNetwork.isActive = isActive;
    await clientNetwork.save();
    await clientNetwork.populate([
      { path: "assignedAffiliateManagers", select: "fullName email" },
      { path: "createdBy", select: "fullName email" },
    ]);
    res.status(200).json({
      success: true,
      message: "Client network updated successfully",
      data: clientNetwork,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Client network name already exists",
      });
    }
    next(error);
  }
};
exports.deleteClientNetwork = async (req, res, next) => {
  try {
    const clientNetwork = await ClientNetwork.findById(req.params.id);
    if (!clientNetwork) {
      return res.status(404).json({
        success: false,
        message: "Client network not found",
      });
    }
    await ClientNetwork.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Client network deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.getMyClientNetworks = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }
    const clientNetworks = await ClientNetwork.find({
      assignedAffiliateManagers: req.user._id,
      isActive: true,
    })
      .select("name description")
      .sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: clientNetworks,
    });
  } catch (error) {
    console.error('Error in getMyClientNetworks:', error);
    next(error);
  }
};