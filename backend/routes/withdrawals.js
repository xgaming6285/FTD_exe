const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createWithdrawal,
  getAgentWithdrawals,
  getAllWithdrawals,
  getWithdrawalStats,
  processWithdrawal,
  getWithdrawal
} = require('../controllers/withdrawals');

// @desc    Create withdrawal request
// @route   POST /api/withdrawals
// @access  Private (Agent only)
router.post('/', protect, authorize('agent'), createWithdrawal);

// @desc    Get agent's withdrawal requests
// @route   GET /api/withdrawals/me
// @access  Private (Agent only)
router.get('/me', protect, authorize('agent'), getAgentWithdrawals);

// @desc    Get all withdrawal requests
// @route   GET /api/withdrawals
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), getAllWithdrawals);

// @desc    Get withdrawal statistics
// @route   GET /api/withdrawals/stats
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), getWithdrawalStats);

// @desc    Process withdrawal request
// @route   PUT /api/withdrawals/:id/process
// @access  Private (Admin only)
router.put('/:id/process', protect, authorize('admin'), processWithdrawal);

// @desc    Get specific withdrawal request
// @route   GET /api/withdrawals/:id
// @access  Private (Agent can view own, Admin can view all)
router.get('/:id', protect, getWithdrawal);

module.exports = router; 