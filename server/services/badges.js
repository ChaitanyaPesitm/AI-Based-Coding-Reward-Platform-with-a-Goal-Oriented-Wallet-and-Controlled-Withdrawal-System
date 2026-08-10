/**
 * Single source of truth for badge metadata.
 * Both the reward engine (submissions route) and the leaderboard route
 * import from here so the definitions can never drift.
 */
const BADGE_META = {
  first_solve:      { label: '🥇 First Solve',    description: 'Solved your first problem', color: '#fbbf24' },
  problems_10:      { label: '🔟 10 Problems',     description: 'Solved 10 problems', color: '#60a5fa' },
  problems_25:      { label: '💪 25 Problems',     description: 'Solved 25 problems', color: '#818cf8' },
  problems_50:      { label: '🏆 50 Problems',     description: 'Solved 50 problems', color: '#f59e0b' },
  points_1000:      { label: '💎 1K Points',       description: 'Earned 1,000 points', color: '#a5f3fc' },
  points_5000:      { label: '🌟 5K Points',       description: 'Earned 5,000 points', color: '#c4b5fd' },
  points_10000:     { label: '👑 10K Points',      description: 'Earned 10,000 points', color: '#fde68a' },
  streak_7:         { label: '🔥 7-Day Streak',    description: 'Maintained a 7-day activity streak', color: '#fb923c' },
  streak_30:        { label: '⚡ 30-Day Streak',   description: 'Maintained a 30-day activity streak', color: '#facc15' },
  no_plagiarism_10: { label: '✨ Clean Coder',     description: '10 submissions with no plagiarism flag', color: '#86efac' }
};

module.exports = { BADGE_META };
