const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { pointsToCurrency } = require('../services/rewardEngine');

router.use(protect);

// GET /api/wallet - Get wallet overview
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const activeGoal = await Goal.findOne({ user: req.user._id, status: 'active' });
    const allGoals = await Goal.find({ user: req.user._id });

    const totalPoints = user.totalPointsEarned;
    const withdrawnPoints = user.withdrawnPoints || 0;
    const availablePoints = Math.max(0, totalPoints - withdrawnPoints);

    res.json({
      success: true,
      data: {
        totalPoints,
        withdrawnPoints,
        availablePoints,
        currencyEquivalent: pointsToCurrency(availablePoints),
        problemsSolved: user.problemsSolved,
        activeGoal: activeGoal ? {
          id: activeGoal._id,
          title: activeGoal.title,
          category: activeGoal.category,
          targetAmount: activeGoal.targetAmount,
          currentPoints: activeGoal.currentPoints,
          progressPercentage: activeGoal.progressPercentage,
          currencyEquivalent: pointsToCurrency(activeGoal.currentPoints),
          targetCurrency: pointsToCurrency(activeGoal.targetAmount),
          canWithdraw: activeGoal.currentPoints >= activeGoal.targetAmount
        } : null,
        goalsCompleted: allGoals.filter(g => g.status === 'completed').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet',
      error: error.message
    });
  }
});

// GET /api/wallet/history - Transaction history from the reward ledger
router.get('/history', async (req, res) => {
  try {
    const entries = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const transactions = entries.map(t => {
      const isEarn = t.amount >= 0;
      return {
        id: t._id,
        type: isEarn ? 'earned' : 'spent',
        points: isEarn ? t.amount : Math.abs(t.amount),
        signedPoints: t.amount,
        currency: pointsToCurrency(Math.abs(t.amount)),
        description: t.description || 'Transaction',
        source: t.source,
        difficulty: t.metadata?.difficulty || 'unknown',
        language: t.metadata?.language || '',
        aiScore: t.metadata?.aiScore || 0,
        date: t.createdAt
      };
    });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: error.message
    });
  }
});

module.exports = router;
