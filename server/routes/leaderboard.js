const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const BADGE_META = {
  first_solve:      { label: '🥇 First Solve',    description: 'Solved your first problem' },
  problems_10:      { label: '🔟 10 Problems',     description: 'Solved 10 problems' },
  problems_25:      { label: '💪 25 Problems',     description: 'Solved 25 problems' },
  problems_50:      { label: '🏆 50 Problems',     description: 'Solved 50 problems' },
  points_1000:      { label: '💎 1K Points',       description: 'Earned 1,000 points' },
  points_5000:      { label: '🌟 5K Points',       description: 'Earned 5,000 points' },
  points_10000:     { label: '👑 10K Points',      description: 'Earned 10,000 points' },
  streak_7:         { label: '🔥 7-Day Streak',    description: 'Maintained a 7-day activity streak' },
  streak_30:        { label: '⚡ 30-Day Streak',   description: 'Maintained a 30-day activity streak' },
  no_plagiarism_10: { label: '✨ Clean Coder',      description: '10 submissions with no plagiarism flag' }
};

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
