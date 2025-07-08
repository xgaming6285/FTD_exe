const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const axios = require("axios");
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { fullName, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    const user = await User.create({
      fullName,
      email,
      password,
    });
    res.status(201).json({
      success: true,
      message: "Registration successful. Your account is pending approval.",
    });
  } catch (error) {
    next(error);
  }
};
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    if (user.status !== "approved" || !user.isActive) {
      let message = "Account is not permitted to log in.";
      if (user.status === "pending") {
        message = "Your account is pending approval.";
      } else if (user.status === "rejected") {
        message = "Your account registration was rejected.";
      } else if (!user.isActive) {
        message = "Your account has been deactivated.";
      }
      return res.status(403).json({ success: false, message });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const token = generateToken(user._id);
    let agentPerformanceData = null;
    if (user.role === "agent" && user.fullName) {
      try {
        const agentResponse = await axios.get(
          `https://agent-report-scraper.onrender.com/api/mongodb/agents/${encodeURIComponent(
            user.fullName
          )}`
        );
        if (agentResponse.data.success && agentResponse.data.data.length > 0) {
          agentPerformanceData = agentResponse.data.data[0];
        }
      } catch (agentError) {
        console.log(
          "Could not fetch agent performance data:",
          agentError.message
        );
      }
    }
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user,
        agentPerformanceData: agentPerformanceData,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
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
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { fullName, email } = req.body;
    const fieldsToUpdate = {};
    if (fullName) fieldsToUpdate.fullName = fullName;
    if (email) fieldsToUpdate.email = email;
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};