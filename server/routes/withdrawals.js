const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const Goal = require('../models/Goal');
const Submission = require('../models/Submission');
const { protect, adminOnly } = require('../middleware/auth');
const { pointsToCurrency } = require('../services/rewardEngine');

router.use(protect);

// POST /api/withdrawals - Request withdrawal (controlled withdrawal guard)
router.post('/', async (req, res) => {
  try {
    const { goalId, paymentMethod, upiId } = req.body;

    // Get the goal
    const goal = await Goal.findOne({ _id: goalId, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // CONTROLLED WITHDRAWAL GUARD: Check if goal is 100% complete
    if (goal.currentPoints < goal.targetAmount) {
      return res.status(400).json({
        success: false,
        message: `Goal not yet completed. Progress: ${goal.progressPercentage}%. You need ${goal.targetAmount - goal.currentPoints} more points.`
      });
    }

    // Check for existing pending withdrawal
    const existingWithdrawal = await Withdrawal.findOne({
      user: req.user._id,
      goal: goalId,
      status: { $in: ['pending', 'verified'] }
    });
    if (existingWithdrawal) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending withdrawal for this goal.'
      });
    }

    // FRAUD DETECTION CHECK
    const fraudDetails = await runFraudCheck(req.user._id, goalId);

    const withdrawal = await Withdrawal.create({
      user: req.user._id,
      goal: goalId,
      pointsAmount: goal.targetAmount,
      currencyAmount: pointsToCurrency(goal.targetAmount),
      paymentMethod: paymentMethod || 'upi',
      upiId: upiId || '',
      fraudScore: fraudDetails.score,
      fraudDetails: {
        plagiarismCount: fraudDetails.plagiarismCount,
        rapidSubmissions: fraudDetails.rapidSubmissions,
        suspiciousPatterns: fraudDetails.notes
      },
      // Auto-verify if fraud score is low
      status: fraudDetails.score < 30 ? 'verified' : 'pending'
    });

    // Update goal status
    goal.status = 'withdrawn';
    await goal.save();

    res.status(201).json({
      success: true,
      message: fraudDetails.score < 30
        ? 'Withdrawal request submitted and auto-verified! Awaiting admin approval.'
        : 'Withdrawal request submitted. Under review due to fraud detection flags.',
      data: {
        withdrawal,
        fraudCheck: {
          score: fraudDetails.score,
          status: fraudDetails.score < 30 ? 'clean' : 'flagged',
          details: fraudDetails.notes
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Withdrawal request failed',
      error: error.message
    });
  }
});

// GET /api/withdrawals - List user's withdrawals
router.get('/', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id })
      .populate('goal', 'title category targetAmount')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawals',
      error: error.message
    });
  }
});

// GET /api/withdrawals/admin/all - Admin: Get all pending withdrawals
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const withdrawals = await Withdrawal.find(filter)
      .populate('user', 'name email')
      .populate('goal', 'title category targetAmount currentPoints')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawals',
      error: error.message
    });
  }
});

// PUT /api/withdrawals/:id/approve - Admin: Approve withdrawal
router.put('/:id/approve', adminOnly, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    withdrawal.adminNotes = req.body.notes || 'Approved by admin';
    await withdrawal.save();

    // Deduct the approved points from the user's available balance
    await User.findByIdAndUpdate(withdrawal.user, { $inc: { withdrawnPoints: withdrawal.pointsAmount } });

    // Emit real-time notification via Socket.io
    const { sendUserNotification } = require('../services/socket');
    sendUserNotification(withdrawal.user, 'withdrawal_updated', {
      status: 'approved',
      amount: withdrawal.currencyAmount,
      message: `🎉 Your withdrawal request for ₹${withdrawal.currencyAmount} has been approved by admin!`
    });

    res.json({
      success: true,
      message: 'Withdrawal approved',
      data: withdrawal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve withdrawal',
      error: error.message
    });
  }
});

// PUT /api/withdrawals/:id/reject - Admin: Reject withdrawal
router.put('/:id/reject', adminOnly, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    withdrawal.status = 'rejected';
    withdrawal.processedAt = new Date();
    withdrawal.adminNotes = req.body.notes || 'Rejected by admin';
    await withdrawal.save();

    // Restore goal to active so user can try again
    await Goal.findByIdAndUpdate(withdrawal.goal, { status: 'active' });

    // Emit real-time notification via Socket.io
    const { sendUserNotification } = require('../services/socket');
    sendUserNotification(withdrawal.user, 'withdrawal_updated', {
      status: 'rejected',
      amount: withdrawal.currencyAmount,
      message: `⚠️ Your withdrawal request for ₹${withdrawal.currencyAmount} was rejected: ${withdrawal.adminNotes}`
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected',
      data: withdrawal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject withdrawal',
      error: error.message
    });
  }
});

/**
 * Fraud Detection Check
 * Analyzes user's submissions for suspicious patterns
 */
async function runFraudCheck(userId, goalId) {
  let score = 0;
  let notes = [];

  // Check 1: Plagiarism flags on submissions
  const flaggedSubmissions = await Submission.countDocuments({
    user: userId,
    plagiarismFlag: true
  });

  if (flaggedSubmissions > 0) {
    score += flaggedSubmissions * 15;
    notes.push(`${flaggedSubmissions} submission(s) flagged for plagiarism`);
  }

  // Check 2: Rapid submissions (more than 10 in 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSubmissions = await Submission.countDocuments({
    user: userId,
    createdAt: { $gte: oneHourAgo }
  });

  const rapidSubmissions = recentSubmissions > 10;
  if (rapidSubmissions) {
    score += 20;
    notes.push(`${recentSubmissions} submissions in the last hour (suspicious rate)`);
  }

  // Check 3: Very high acceptance rate (might indicate test case knowledge)
  const totalSubmissions = await Submission.countDocuments({ user: userId });
  const acceptedSubmissions = await Submission.countDocuments({
    user: userId,
    status: 'accepted'
  });

  if (totalSubmissions > 5 && acceptedSubmissions / totalSubmissions > 0.95) {
    score += 10;
    notes.push(`Unusually high acceptance rate: ${Math.round(acceptedSubmissions / totalSubmissions * 100)}%`);
  }

  return {
    score: Math.min(100, score),
    plagiarismCount: flaggedSubmissions,
    rapidSubmissions,
    notes: notes.join('; ') || 'No suspicious patterns detected'
  };
}

module.exports = router;
