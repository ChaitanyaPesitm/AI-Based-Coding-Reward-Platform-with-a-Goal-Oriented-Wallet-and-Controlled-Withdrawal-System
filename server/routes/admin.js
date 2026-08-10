const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const FraudCase = require('../models/FraudCase');
const Ad = require('../models/Ad');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/admin/analytics - Full admin dashboard stats
router.get('/analytics', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      todayUsers,
      totalSubmissions,
      acceptedSubmissions,
      todaySubmissions,
      aiFailures,
      totalPoints,
      totalWithdrawn,
      withdrawalStats,
      pointsLedger,
      openFraud,
      highRiskFraud,
      problems,
      recentSubs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'accepted' }),
      Submission.countDocuments({ createdAt: { $gte: todayStart } }),
      // AI failures = submissions that passed tests but got no AI score (Gemini failed)
      Submission.countDocuments({ testCasesPassed: { $gt: 0 }, aiScore: 0 }),
      User.aggregate([{ $group: { _id: null, pts: { $sum: '$totalPointsEarned' } } }]),
      User.aggregate([{ $group: { _id: null, pts: { $sum: '$withdrawnPoints' } } }]),
      Withdrawal.aggregate([
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          pts: { $sum: '$pointsAmount' }
        } }
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: {
          _id: null,
          earned: { $sum: { $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0] } },
          spent: { $sum: { $cond: [{ $eq: ['$type', 'spend'] }, '$amount', 0] } }
        } }
      ]),
      FraudCase.countDocuments({ status: { $in: ['open', 'flagged'] } }),
      FraudCase.countDocuments({ score: { $gte: 50 }, status: { $in: ['open', 'flagged'] } }),
      Problem.find({ isActive: true }).select('title difficulty basePoints category language').lean(),
      Submission.find({ createdAt: { $gte: weekAgo } }).populate('problem', 'title').sort({ createdAt: 1 }).lean()
    ]);

    const totalPointsDistributed = totalPoints[0]?.pts || 0;
    const totalWithdrawnPoints = totalWithdrawn[0]?.pts || 0;

    // ── Per-problem stats (most solved / most difficult) ───────────────────
    const [perProblem] = await Promise.all([
      Submission.aggregate([
        { $group: { _id: '$problem', attempts: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } } } },
        { $lookup: { from: 'problems', localField: '_id', foreignField: '_id', as: 'problem' } },
        { $unwind: '$problem' },
        { $project: {
          title: '$problem.title',
          difficulty: '$problem.difficulty',
          language: '$problem.language',
          category: '$problem.category',
          basePoints: '$problem.basePoints',
          attempts: 1,
          accepted: 1,
          acceptRate: { $cond: [{ $gt: ['$attempts', 0] }, { $multiply: [{ $divide: ['$accepted', '$attempts'] }, 100] }, 0] }
        } }
      ])
    ]);

    const mostSolved = perProblem
      .filter(p => p.accepted > 0)
      .sort((a, b) => b.accepted - a.accepted)
      .slice(0, 6);

    const mostDifficult = perProblem
      .filter(p => p.attempts >= 3)
      .sort((a, b) => a.acceptRate - b.acceptRate)
      .slice(0, 6);

    // ── 14-day series ───────────────────────────────────────────────────────
    const days = 14;
    const submissionsByDay = new Map();
    const pointsByDay = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      submissionsByDay.set(key, 0);
      pointsByDay.set(key, 0);
    }
    for (const s of recentSubs) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (submissionsByDay.has(key)) submissionsByDay.set(key, submissionsByDay.get(key) + 1);
      if (s.pointsEarned) pointsByDay.set(key, pointsByDay.get(key) + s.pointsEarned);
    }

    const withdrawalMap = {};
    withdrawalStats.forEach(w => { withdrawalMap[w._id] = w; });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, newToday: todayUsers },
        submissions: {
          total: totalSubmissions,
          accepted: acceptedSubmissions,
          today: todaySubmissions,
          acceptanceRate: totalSubmissions ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0,
          aiFailures
        },
        points: {
          distributed: totalPointsDistributed,
          withdrawn: totalWithdrawnPoints,
          available: Math.max(0, totalPointsDistributed - totalWithdrawnPoints),
          last7dEarned: pointsLedger[0]?.earned || 0,
          last7dSpent: Math.abs(pointsLedger[0]?.spent || 0)
        },
        withdrawals: {
          counts: Object.fromEntries(withdrawalStats.map(w => [w._id, w.count])),
          totalApprovedPoints: (withdrawalMap.approved?.pts || 0) + (withdrawalMap.completed?.pts || 0),
          pending: withdrawalMap.pending?.count || 0,
          verified: withdrawalMap.verified?.count || 0
        },
        fraud: { openCases: openFraud, highRisk: highRiskFraud },
        mostSolved,
        mostDifficult,
        series: {
          submissions: [...submissionsByDay.entries()].map(([date, count]) => ({ date, count })),
          points: [...pointsByDay.entries()].map(([date, pts]) => ({ date, pts }))
        },
        topProblems: problems.length
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to load admin analytics', error: error.message });
  }
});

// ─── Ad management ───────────────────────────────────────────────────────────

// GET /api/admin/ads - All ads with performance stats (CTR = clicks/impressions)
router.get('/ads', async (req, res) => {
  try {
    const ads = await Ad.find({}).sort({ createdAt: -1 });
    const data = ads.map(a => ({
      _id: a._id,
      sponsor: a.sponsor,
      title: a.title,
      description: a.description,
      url: a.url,
      cta: a.cta,
      badge: a.badge,
      category: a.category,
      isActive: a.isActive,
      rewardPoints: a.rewardPoints,
      rewardCooldownHours: a.rewardCooldownHours,
      impressions: a.impressions,
      clicks: a.clicks,
      rewardClaims: a.rewardClaims,
      ctr: a.impressions > 0 ? Math.round((a.clicks / a.impressions) * 1000) / 10 : 0,
      createdAt: a.createdAt
    }));
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ads', error: error.message });
  }
});

// POST /api/admin/ads - Create an ad
router.post('/ads', async (req, res) => {
  try {
    const { sponsor, title, description, url, cta, badge, category, isActive, rewardPoints, rewardCooldownHours } = req.body;
    if (!sponsor || !title || !url) {
      return res.status(400).json({ success: false, message: 'sponsor, title and url are required' });
    }
    const ad = await Ad.create({
      sponsor,
      title,
      description: description || '',
      url,
      cta: cta || 'Learn More',
      badge: badge || '',
      category: category || 'custom',
      isActive: isActive !== false,
      rewardPoints: Math.max(0, parseInt(rewardPoints) || 0),
      rewardCooldownHours: Math.min(168, Math.max(0, parseInt(rewardCooldownHours) || 24))
    });
    res.status(201).json({ success: true, message: 'Ad created', data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create ad', error: error.message });
  }
});

// PUT /api/admin/ads/:id - Update an ad (or toggle isActive)
router.put('/ads/:id', async (req, res) => {
  try {
    const allowed = ['sponsor', 'title', 'description', 'url', 'cta', 'badge', 'category', 'isActive', 'rewardPoints', 'rewardCooldownHours'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.rewardPoints !== undefined) updates.rewardPoints = Math.max(0, parseInt(updates.rewardPoints) || 0);
    if (updates.rewardCooldownHours !== undefined) updates.rewardCooldownHours = Math.min(168, Math.max(0, parseInt(updates.rewardCooldownHours) || 24));

    const ad = await Ad.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    res.json({ success: true, message: 'Ad updated', data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update ad', error: error.message });
  }
});

// DELETE /api/admin/ads/:id - Delete an ad
router.delete('/ads/:id', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    res.json({ success: true, message: 'Ad deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete ad', error: error.message });
  }
});

// GET /api/admin/ledger - Full reward ledger (admin audit trail)
router.get('/ledger', async (req, res) => {
  try {
    const { userId, source, type, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (source) filter.source = source;
    if (type) filter.type = type;

    const total = await Transaction.countDocuments(filter);
    const entries = await Transaction.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ success: true, count: entries.length, total, data: entries });
  } catch (error) {
    console.error('Admin ledger error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger', error: error.message });
  }
});

// POST /api/admin/ledger/adjust - Admin: manual point adjustment (audited)
router.post('/ledger/adjust', async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'userId, amount and reason are required' });
    }
    if (Math.abs(amount) > 100000) {
      return res.status(400).json({ success: false, message: 'Adjustment amount too large' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Only claw back up to the user's available balance
    const available = Math.max(0, (user.totalPointsEarned || 0) - (user.withdrawnPoints || 0));
    const effective = amount < 0 ? Math.max(amount, -available) : amount;

    if (effective < 0) {
      // Deduct from earned total (fraud clawback)
      await User.findByIdAndUpdate(userId, { $inc: { totalPointsEarned: effective } });
    } else {
      await User.findByIdAndUpdate(userId, { $inc: { totalPointsEarned: effective } });
    }

    const { recordTransaction } = require('../services/ledger');
    await recordTransaction({
      user: userId,
      type: 'adjust',
      amount: effective,
      source: 'admin_adjustment',
      description: reason,
      recordedBy: req.user._id
    });

    res.json({
      success: true,
      message: `Adjusted ${effective >= 0 ? '+' : ''}${effective} points for user`,
      data: { userId, amount: effective, reason }
    });
  } catch (error) {
    console.error('Ledger adjust error:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust points', error: error.message });
  }
});

module.exports = router;
