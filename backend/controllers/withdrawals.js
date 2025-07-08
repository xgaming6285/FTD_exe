const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// Create withdrawal request (Agent only)
const createWithdrawal = async (req, res) => {
  try {
    const { walletAddress, amount, breakdown } = req.body;
    
    // Validate required fields
    if (!walletAddress || !amount || !breakdown) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, amount, and breakdown are required'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Check if agent exists
    const agent = await User.findById(req.user.id);
    if (!agent || agent.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: 'Only agents can create withdrawal requests'
      });
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      agent: req.user.id,
      amount: parseFloat(amount),
      walletAddress: walletAddress.trim(),
      breakdown: {
        basePay: parseFloat(breakdown.basePay || 0),
        bonuses: parseFloat(breakdown.bonuses || 0),
        fines: parseFloat(breakdown.fines || 0)
      }
    });

    await withdrawal.save();
    
    // Populate agent details for response
    await withdrawal.populate('agent', 'fullName email fourDigitCode');

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create withdrawal request',
      error: error.message
    });
  }
};

// Get agent's withdrawal requests
const getAgentWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const withdrawals = await Withdrawal.getAgentWithdrawals(req.user.id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const totalCount = await Withdrawal.countDocuments({ 
      agent: req.user.id,
      ...(status && { status })
    });

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching agent withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal requests',
      error: error.message
    });
  }
};

// Get all withdrawal requests (Admin only)
const getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const withdrawals = await Withdrawal.getAllWithdrawals({
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const totalCount = await Withdrawal.countDocuments({
      ...(status && { status })
    });

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal requests',
      error: error.message
    });
  }
};

// Get withdrawal statistics (Admin only)
const getWithdrawalStats = async (req, res) => {
  try {
    const stats = await Withdrawal.getWithdrawalStats();
    
    // Format stats for better response
    const formattedStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    };

    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats.totalAmount += stat.totalAmount;
      
      switch (stat._id) {
        case 'pending':
          formattedStats.pending = stat.count;
          formattedStats.pendingAmount = stat.totalAmount;
          break;
        case 'approved':
          formattedStats.approved = stat.count;
          break;
        case 'rejected':
          formattedStats.rejected = stat.count;
          break;
        case 'completed':
          formattedStats.completed = stat.count;
          formattedStats.completedAmount = stat.totalAmount;
          break;
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal statistics',
      error: error.message
    });
  }
};

// Process withdrawal request (Admin only)
const processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, paymentLink } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or completed'
      });
    }

    // Find withdrawal request
    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Check if already processed
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal request has already been processed'
      });
    }

    // Process withdrawal
    await withdrawal.processWithdrawal(status, req.user.id, adminNotes, paymentLink);
    
    // Populate for response
    await withdrawal.populate([
      { path: 'agent', select: 'fullName email fourDigitCode' },
      { path: 'processedBy', select: 'fullName email' }
    ]);

    res.json({
      success: true,
      message: `Withdrawal request ${status} successfully`,
      data: withdrawal
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request',
      error: error.message
    });
  }
};

// Get specific withdrawal request
const getWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await Withdrawal.findById(id)
      .populate('agent', 'fullName email fourDigitCode')
      .populate('processedBy', 'fullName email');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Check if agent is requesting their own withdrawal or if user is admin
    if (req.user.role !== 'admin' && withdrawal.agent._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own withdrawal requests'
      });
    }

    res.json({
      success: true,
      data: withdrawal
    });
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal request',
      error: error.message
    });
  }
};

module.exports = {
  createWithdrawal,
  getAgentWithdrawals,
  getAllWithdrawals,
  getWithdrawalStats,
  processWithdrawal,
  getWithdrawal
}; 