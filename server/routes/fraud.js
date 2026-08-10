const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FraudCase = require('../models/FraudCase');
const { protect, adminOnly } = require('../middleware/auth');
const { evaluateFraud, runFraudCheck, estimateUnexplainedPoints } = require('../services/fraud');

// GET /api/fraud/my-score - User sees their own transparent fraud score
router.get('/my-score', protect, async (req, res) => {
  try {
    const evaluation = await evaluateFraud(req.user._id);
    res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('Fraud score error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute fraud score', error: error.message });
  }
});

// POST /api/fraud/scan - Admin: rescan all users, upsert a FraudCase per user
router.post('/scan', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('_id name email').lean();
    let scanned = 0;
    let flagged = 0;

    for (const u of users) {
      const evaluation = await evaluateFraud(u._id);
      scanned += 1;
      if (evaluation.score > 0) flagged += 1;

      await FraudCase.findOneAndUpdate(
        { user: u._id },
        {
          user: u._id,
          score: evaluation.score,
          level: evaluation.level,
          reasons: evaluation.reasons,
          summary: evaluation.summary,
          status: evaluation.score >= 50 ? 'open' : 'cleared',
          adminNotes: evaluation.score >= 50 ? '' : 'Automatically cleared by scan'
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: `Scanned ${scanned} users`, data: { scanned, flagged } });
  } catch (error) {
    console.error('Fraud scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to scan users', error: error.message });
  }
});

// GET /api/fraud/cases - Admin: list fraud cases for review
router.get('/cases', protect, adminOnly, async (req, res) => {
  try {
    const { status, minScore = 0 } = req.query;
    const filter = { score: { $gte: parseInt(minScore) } };
    if (status && status !== 'all') filter.status = status;

    const cases = await FraudCase.find(filter)
      .populate('user', 'name email totalPointsEarned problemsSolved')
      .sort({ score: -1, createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    console.error('Fraud cases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fraud cases', error: error.message });
  }
});

// PUT /api/fraud/cases/:id/review - Admin: review/clear/flag a case
router.put('/cases/:id/review', protect, adminOnly, async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['open', 'reviewed', 'cleared', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review status' });
    }

    const fraudCase = await FraudCase.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes: notes || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    if (!fraudCase) {
      return res.status(404).json({ success: false, message: 'Fraud case not found' });
    }

    res.json({ success: true, message: `Case marked as ${status}`, data: fraudCase });
  } catch (error) {
    console.error('Fraud review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fraud case', error: error.message });
  }
});

// POST /api/fraud/cases/:id/validate - Admin: estimate unexplained points for a user
router.post('/cases/:id/validate', protect, adminOnly, async (req, res) => {
  try {
    const fraudCase = await FraudCase.findById(req.params.id);
    if (!fraudCase) {
      return res.status(404).json({ success: false, message: 'Fraud case not found' });
    }
    const unexplained = await estimateUnexplainedPoints(fraudCase.user);
    res.json({ success: true, data: unexplained });
  } catch (error) {
    console.error('Fraud validate error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate case', error: error.message });
  }
});

module.exports = router;
