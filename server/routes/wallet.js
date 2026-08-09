const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Submission = require('../models/Submission');
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

    res.json({
      success: true,
      data: {
        totalPoints,
        currencyEquivalent: pointsToCurrency(totalPoints),
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

// GET /api/wallet/history - Transaction history
router.get('/history', async (req, res) => {
  try {
    const submissions = await Submission.find({
      user: req.user._id,
      pointsEarned: { $gt: 0 }
    })
      .populate('problem', 'title difficulty language')
      .sort({ createdAt: -1 })
      .limit(50);

    const transactions = submissions.map(s => ({
      id: s._id,
      type: 'earned',
      points: s.pointsEarned,
      currency: pointsToCurrency(s.pointsEarned),
      description: `Solved "${s.problem ? s.problem.title : 'Unknown'}" (${s.status})`,
      difficulty: s.problem ? s.problem.difficulty : 'unknown',
      language: s.language,
      aiScore: s.aiScore,
      date: s.createdAt
    }));

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
