const { validationResult } = require("express-validator");
const User = require("../models/User");
const AgentPerformance = require("../models/AgentPerformance");
exports.getUsers = async (req, res, next) => {
  try {
    const { role, isActive, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) {
      filter.status = status;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await User.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.approveUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { role } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `User is not pending approval. Current status: ${user.status}`,
      });
    }
    user.status = 'approved';
    user.isActive = true;
    user.role = role;
    if (role === 'lead_manager') {
      user.leadManagerStatus = 'approved';
      user.leadManagerApprovedBy = req.user._id;
      user.leadManagerApprovedAt = new Date();
      user.permissions.canManageLeads = true;
    }
    if (role === 'agent' && !user.fourDigitCode) {
      let code;
      let codeExists = true;
      while (codeExists) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        codeExists = await User.findOne({ fourDigitCode: code });
      }
      user.fourDigitCode = code;
    }
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      message: 'User approved and activated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { email, password, fullName, role, fourDigitCode, permissions } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    const defaultPermissions = {
      canCreateOrders: true,
      canManageLeads: role === 'lead_manager',
    };
    const userData = {
      email,
      password,
      fullName,
      role,
      permissions: permissions || defaultPermissions,
      isActive: true,
      status: 'approved',
    };
    if (role === 'lead_manager') {
      userData.leadManagerStatus = 'approved';
      userData.leadManagerApprovedBy = req.user._id;
      userData.leadManagerApprovedAt = new Date();
    } else {
      userData.leadManagerStatus = 'not_applicable';
    }
    if (fourDigitCode) {
      const existingCode = await User.findOne({ fourDigitCode });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Four digit code already in use",
        });
      }
      userData.fourDigitCode = fourDigitCode;
    }
    const user = await User.create(userData);
    user.password = undefined;
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { fullName, email, role, fourDigitCode, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }
    if (fourDigitCode && fourDigitCode !== user.fourDigitCode) {
      const existingCode = await User.findOne({ fourDigitCode });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Four digit code already in use",
        });
      }
    }
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (fourDigitCode) updateData.fourDigitCode = fourDigitCode;
    if (isActive !== undefined) updateData.isActive = isActive;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Valid permissions object is required",
      });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "User permissions updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
exports.getUserStats = async (req, res, next) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
        },
      },
    ]);
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });
    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newThisMonth: newUsersThisMonth,
      byRole: {},
    };
    userStats.forEach((stat) => {
      stats.byRole[stat._id] = {
        total: stat.count,
        active: stat.active,
        inactive: stat.count - stat.active,
      };
    });
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
exports.getAgentPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const agentId = req.params.id;
    if (req.user.role !== 'admin' && req.user.id !== agentId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this performance data",
      });
    }
    const dateFilter = { agent: agentId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    const performance = await AgentPerformance.find(dateFilter)
      .populate("agent", "fullName fourDigitCode")
      .sort({ date: -1 });
    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateAgentPerformance = async (req, res, next) => {
  try {
    const { date, metrics } = req.body;
    const agentId = req.params.id;
    if (!date || !metrics) {
      return res.status(400).json({
        success: false,
        message: "Date and metrics are required",
      });
    }
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }
    const performance = await AgentPerformance.findOneAndUpdate(
      { agentId, date: new Date(date) },
      { ...metrics },
      { upsert: true, new: true, runValidators: true }
    ).populate('agentId', 'fullName fourDigitCode');
    res.status(200).json({
      success: true,
      message: "Agent performance updated successfully",
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};
exports.getTopPerformers = async (req, res, next) => {
  try {
    const { period = '30', limit = 10 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));
    const topPerformers = await AgentPerformance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$agent",
          totalCalls: { $sum: "$callsCompleted" },
          totalEarnings: { $sum: "$earnings" },
          totalLeadsConverted: { $sum: "$leadsConverted" },
          totalLeadsContacted: { $sum: "$leadsContacted" },
          averageCallQuality: {
            $avg: { $divide: ["$leadsConverted", "$leadsContacted"] },
          },
          recordCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "agent",
        },
      },
      {
        $unwind: "$agent",
      },
      {
        $project: {
          agent: {
            id: "$agent._id",
            fullName: "$agent.fullName",
            fourDigitCode: "$agent.fourDigitCode",
          },
          totalCalls: 1,
          totalEarnings: 1,
          totalLeadsConverted: 1,
          totalLeadsContacted: 1,
          averageCallQuality: { $round: ["$averageCallQuality", 2] },
          recordCount: 1,
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
      {
        $limit: parseInt(limit),
      },
    ]);
    res.status(200).json({
      success: true,
      data: topPerformers,
      period: `Last ${period} days`,
    });
  } catch (error) {
    next(error);
  }
};
exports.getDailyTeamStats = async (req, res, next) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const teamStats = await AgentPerformance.aggregate([
      {
        $match: {
          date: { $gte: targetDate, $lt: nextDay },
        },
      },
      {
        $group: {
          _id: null,
          totalAgents: { $sum: 1 },
          totalCalls: { $sum: "$metrics.callsMade" },
          totalEarnings: { $sum: "$metrics.earnings" },
          totalFTDs: { $sum: "$metrics.ftdCount" },
          totalFillers: { $sum: "$metrics.fillerCount" },
          averageCallQuality: { $avg: "$metrics.averageCallQuality" },
        },
      },
      {
        $project: {
          _id: 0,
          totalAgents: 1,
          totalCalls: 1,
          totalEarnings: { $round: ["$totalEarnings", 2] },
          totalFTDs: 1,
          totalFillers: 1,
          averageCallQuality: { $round: ["$averageCallQuality", 2] },
        },
      },
    ]);
    const stats = teamStats[0] || {
      totalAgents: 0,
      totalCalls: 0,
      totalEarnings: 0,
      totalFTDs: 0,
      totalFillers: 0,
      averageCallQuality: 0,
    };
    res.status(200).json({
      success: true,
      data: stats,
      date: targetDate.toISOString().split("T")[0],
    });
  } catch (error) {
    next(error);
  }
};
exports.assignAsLeadManager = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { assignAsLeadManager } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (assignAsLeadManager) {
      if (user.leadManagerStatus !== 'not_applicable') {
        return res.status(400).json({
          success: false,
          message: `User is already ${user.leadManagerStatus} for lead manager role`,
        });
      }
      user.leadManagerStatus = 'pending';
    } else {
      user.leadManagerStatus = 'not_applicable';
      user.leadManagerApprovedBy = null;
      user.leadManagerApprovedAt = null;
      if (user.role === 'lead_manager') {
        user.role = 'agent';
      }
      user.permissions.canManageLeads = false;
    }
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      message: assignAsLeadManager
        ? 'User assigned as pending lead manager'
        : 'Lead manager status removed',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
exports.approveLeadManager = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { approved, reason } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (user.leadManagerStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "User is not pending lead manager approval",
      });
    }
    if (approved) {
      user.leadManagerStatus = 'approved';
      user.role = 'lead_manager';
      user.permissions.canManageLeads = true;
      user.leadManagerApprovedBy = req.user._id;
      user.leadManagerApprovedAt = new Date();
    } else {
      user.leadManagerStatus = 'rejected';
      user.permissions.canManageLeads = false;
      if (reason) {
        user.leadManagerRejectionReason = reason;
      }
    }
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      message: approved
        ? 'User approved as lead manager'
        : 'User rejected as lead manager',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
exports.acceptEula = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    user.eulaAccepted = true;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
      message: 'EULA accepted successfully.',
    });
  } catch (error) {
    next(error);
  }
};