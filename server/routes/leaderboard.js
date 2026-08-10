const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { BADGE_META } = require('../services/badges');

// GET /api/leaderboard - Top 20 users by total points
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const users = await User.find({ isAdmin: false })
      .select('name totalPointsEarned problemsSolved badges currentStreak longestStreak createdAt')
      .sort({ totalPointsEarned: -1, problemsSolved: -1 })
      .limit(limit);

    // Attach rank
    const data = users.map((u, i) => ({
      rank: i + 1,
      id: u._id,
      name: u.name,
      totalPointsEarned: u.totalPointsEarned,
      problemsSolved: u.problemsSolved,
      badges: u.badges || [],
      currentStreak: u.currentStreak || 0,
      longestStreak: u.longestStreak || 0,
      memberSince: u.createdAt
    }));

    // Also include requesting user's rank even if outside top 20
    const currentUserId = req.user._id.toString();
    const inList = data.some(d => d.id.toString() === currentUserId);
    let myRank = null;

    if (!inList) {
      const betterCount = await User.countDocuments({
        isAdmin: false,
        totalPointsEarned: { $gt: req.user.totalPointsEarned }
      });
      myRank = {
        rank: betterCount + 1,
        id: req.user._id,
        name: req.user.name,
        totalPointsEarned: req.user.totalPointsEarned,
        problemsSolved: req.user.problemsSolved,
        badges: req.user.badges || [],
        currentStreak: req.user.currentStreak || 0,
        longestStreak: req.user.longestStreak || 0
      };
    }

    res.json({
      success: true,
      data,
      myRank,
      badgeMeta: BADGE_META
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
});

// GET /api/leaderboard/badges - Badge metadata for display
router.get('/badges', protect, (req, res) => {
  res.json({ success: true, data: BADGE_META });
});

module.exports = router;
