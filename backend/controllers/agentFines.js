const AgentFine = require("../models/AgentFine");
const User = require("../models/User");

// Get all fines for all agents (admin view)
const getAllAgentFines = async (req, res) => {
  try {
    const fines = await AgentFine.getAllActiveFines();

    res.json({
      success: true,
      data: fines,
    });
  } catch (error) {
    console.error("Error fetching agent fines:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent fines",
      error: error.message,
    });
  }
};

// Get fines summary for all agents (for admin dashboard)
const getFinesSummary = async (req, res) => {
  try {
    const summary = await AgentFine.getFinesSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching fines summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fines summary",
      error: error.message,
    });
  }
};

// Get fines for a specific agent
const getAgentFines = async (req, res) => {
  try {
    const { agentId } = req.params;
    const includeResolved = req.query.includeResolved === "true";

    const fines = await AgentFine.getAgentFines(agentId, includeResolved);

    res.json({
      success: true,
      data: fines,
    });
  } catch (error) {
    console.error("Error fetching agent fines:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent fines",
      error: error.message,
    });
  }
};

// Create a new fine for an agent
const createAgentFine = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { amount, reason, description, notes } = req.body;
    const adminId = req.user.id;

    // Validate that the agent exists
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fine amount must be greater than 0",
      });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Fine reason is required",
      });
    }

    // Create the fine
    const fine = await AgentFine.create({
      agent: agentId,
      amount: parseFloat(amount),
      reason: reason.trim(),
      description: description?.trim() || "",
      imposedBy: adminId,
      notes: notes?.trim() || "",
    });

    // Populate the response
    await fine.populate("agent", "fullName email");
    await fine.populate("imposedBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Fine created successfully",
      data: fine,
    });
  } catch (error) {
    console.error("Error creating agent fine:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create agent fine",
      error: error.message,
    });
  }
};

// Update a fine (mainly for editing details)
const updateAgentFine = async (req, res) => {
  try {
    const { fineId } = req.params;
    const { amount, reason, description, notes } = req.body;
    const adminId = req.user.id;

    const fine = await AgentFine.findById(fineId);
    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found",
      });
    }

    // Only allow updating if the fine is still active
    if (fine.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a resolved fine",
      });
    }

    // Update the fine
    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fine amount must be greater than 0",
        });
      }
      fine.amount = parseFloat(amount);
    }

    if (reason !== undefined) {
      if (reason.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Fine reason is required",
        });
      }
      fine.reason = reason.trim();
    }

    if (description !== undefined) {
      fine.description = description.trim();
    }

    if (notes !== undefined) {
      fine.notes = notes.trim();
    }

    await fine.save();

    // Populate the response
    await fine.populate("agent", "fullName email");
    await fine.populate("imposedBy", "fullName email");

    res.json({
      success: true,
      message: "Fine updated successfully",
      data: fine,
    });
  } catch (error) {
    console.error("Error updating agent fine:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update agent fine",
      error: error.message,
    });
  }
};

// Resolve a fine (mark as paid, waived, etc.)
const resolveAgentFine = async (req, res) => {
  try {
    const { fineId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user.id;

    const fine = await AgentFine.findById(fineId);
    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found",
      });
    }

    // Validate status
    const validStatuses = ["paid", "waived", "disputed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: paid, waived, disputed",
      });
    }

    // Resolve the fine
    await fine.resolve(status, adminId, notes);

    // Populate the response
    await fine.populate("agent", "fullName email");
    await fine.populate("imposedBy", "fullName email");
    await fine.populate("resolvedBy", "fullName email");

    res.json({
      success: true,
      message: `Fine marked as ${status}`,
      data: fine,
    });
  } catch (error) {
    console.error("Error resolving agent fine:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve agent fine",
      error: error.message,
    });
  }
};

// Delete a fine (set as inactive)
const deleteAgentFine = async (req, res) => {
  try {
    const { fineId } = req.params;
    const adminId = req.user.id;

    const fine = await AgentFine.findById(fineId);
    if (!fine) {
      return res.status(404).json({
        success: false,
        message: "Fine not found",
      });
    }

    // Mark as inactive instead of deleting
    fine.isActive = false;
    await fine.save();

    res.json({
      success: true,
      message: "Fine deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting agent fine:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete agent fine",
      error: error.message,
    });
  }
};

// Get total active fines for an agent
const getAgentTotalFines = async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await AgentFine.getTotalActiveFines(agentId);
    const totalFines = result.length > 0 ? result[0].totalFines : 0;

    res.json({
      success: true,
      data: {
        agentId,
        totalActiveFines: totalFines,
      },
    });
  } catch (error) {
    console.error("Error fetching agent total fines:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent total fines",
      error: error.message,
    });
  }
};

module.exports = {
  getAllAgentFines,
  getFinesSummary,
  getAgentFines,
  createAgentFine,
  updateAgentFine,
  resolveAgentFine,
  deleteAgentFine,
  getAgentTotalFines,
};
