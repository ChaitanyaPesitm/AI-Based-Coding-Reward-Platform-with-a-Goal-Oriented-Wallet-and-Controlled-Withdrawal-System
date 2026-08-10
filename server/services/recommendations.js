const Submission = require('../models/Submission');
const Problem = require('../models/Problem');

/**
 * Personalized learning + adaptive difficulty engine.
 *
 * Analyzes a user's submission history to surface:
 *  - weak areas (problem categories with low AI score / low acceptance),
 *  - an adaptive difficulty recommendation,
 *  - a ranked list of problems to attempt next, each with a human-readable reason.
 */

const DIFF_RANK = { easy: 1, medium: 2, hard: 3 };

function groupStats(submissions, keyFn) {
  const map = new Map();
  for (const s of submissions) {
    const key = keyFn(s);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { attempts: 0, accepted: 0, aiScoreSum: 0, passedSum: 0, totalSum: 0, lastAttempt: s.createdAt });
    }
    const g = map.get(key);
    g.attempts += 1;
    g.accepted += s.status === 'accepted' ? 1 : 0;
    g.aiScoreSum += s.aiScore || 0;
    g.passedSum += s.testCasesPassed || 0;
    g.totalSum += s.totalTestCases || 0;
    if (s.createdAt > g.lastAttempt) g.lastAttempt = s.createdAt;
  }
  return map;
}

/**
 * @param {ObjectId} userId
 * @returns {Promise<{weakAreas:Array, difficultyRecommendation:Object, recommendations:Array}>}
 */
async function buildRecommendations(userId) {
  const user = await require('../models/User').findById(userId);

  const [submissions, allProblems] = await Promise.all([
    Submission.find({ user: userId })
      .populate('problem', 'title difficulty basePoints category language')
      .sort({ createdAt: -1 })
      .lean(),
    Problem.find({ isActive: true }).select('title difficulty basePoints category language expectedTimeComplexity').lean()
  ]);

  const solvedIds = new Set((user?.solvedProblems || []).map(String));
  const unsolved = allProblems.filter(p => !solvedIds.has(String(p._id)));
  const submissionsWithProblem = submissions.filter(s => s.problem && s.problem.category);

  // ── 1. Weak areas by category ─────────────────────────────────────────────
  const catStats = groupStats(submissionsWithProblem, s => s.problem.category);
  const weakAreas = [...catStats.entries()]
    .map(([category, g]) => {
      const avgAi = g.aiScoreSum / g.attempts;
      const acceptRate = g.accepted / g.attempts;
      const passRate = g.totalSum > 0 ? g.passedSum / g.totalSum : 0;
      // Weakness score: higher = weaker area
      const weakness = Math.round(
        ((100 - avgAi) * 0.4) + ((1 - acceptRate) * 100 * 0.35) + ((1 - passRate) * 100 * 0.25)
      );
      return { category, attempts: g.attempts, accepted: g.accepted, avgAiScore: Math.round(avgAi), acceptRate, passRate, weakness };
    })
    .sort((a, b) => b.weakness - a.weakness);

  // ── 2. Adaptive difficulty ────────────────────────────────────────────────
  const diffStats = groupStats(submissionsWithProblem, s => s.problem.difficulty);
  const byDiff = (d) => diffStats.get(d) || { attempts: 0, accepted: 0, aiScoreSum: 0, passRate: 0 };
  const easy = byDiff('easy');
  const medium = byDiff('medium');
  const hard = byDiff('hard');

  const haveMedium = allProblems.some(p => p.difficulty === 'medium' && !solvedIds.has(String(p._id)));
  const haveHard = allProblems.some(p => p.difficulty === 'hard' && !solvedIds.has(String(p._id)));

  let difficultyRecommendation;
  const avgEasy = easy.attempts ? easy.aiScoreSum / easy.attempts : null;
  const easyOk = easy.attempts >= 2 && avgEasy >= 75 && easy.accepted / easy.attempts >= 0.7;
  const mediumBad = medium.attempts >= 3 && (medium.accepted / medium.attempts < 0.4);

  if (mediumBad) {
    difficultyRecommendation = {
      difficulty: 'easy',
      rationale: `You've solved fewer than 40% of medium problems (${medium.accepted}/${medium.attempts}). Solidify the fundamentals on easy problems before advancing.`,
      move: 'down'
    };
  } else if (easyOk && haveMedium) {
    difficultyRecommendation = {
      difficulty: 'medium',
      rationale: `You're consistently scoring ≥75 AI on easy problems — you're ready to level up to medium.`,
      move: 'up'
    };
  } else {
    const current = !mediumBad && (medium.attempts >= 1 || !easyOk) && medium.attempts >= easy.attempts ? 'medium' : 'easy';
    difficultyRecommendation = {
      difficulty: current,
      rationale: 'Keep practicing at your current level to build consistency.',
      move: 'stay'
    };
  }

  // ── 3. Ranked problem recommendations ─────────────────────────────────────
  // Prefer unsolved problems in weak categories, then the adaptive difficulty.
  const weakCatSet = new Set(weakAreas.slice(0, 4).map(w => w.category));
  const recommended = unsolved.map(p => {
    const isWeak = weakCatSet.has(p.category);
    const atAdaptiveLevel = p.difficulty === difficultyRecommendation.difficulty;
    const catStatsForP = catStats.get(p.category);

    let score = 0;
    if (isWeak) score += 40;
    if (atAdaptiveLevel) score += 30;
    if (p.difficulty === 'easy') score += 10;
    if (!catStatsForP) score += 10; // brand new category = explore

    let reason;
    if (isWeak) reason = `Strengthen your weak area in "${p.category}" (avg AI score ${catStatsForP ? Math.round(catStatsForP.aiScoreSum / catStatsForP.attempts) : 'n/a'}).`;
    else if (atAdaptiveLevel) reason = `Recommended difficulty (${p.difficulty}) — matches your current skill level.`;
    else reason = `Good next challenge to broaden your ${p.category} skills.`;

    return { problem: p, matchScore: score, reason };
  })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5)
    .map(r => ({ ...r, matchScore: Math.min(99, Math.round(r.matchScore + Math.random() * 9)) }));

  return { weakAreas: weakAreas.slice(0, 5), difficultyRecommendation, recommendations: recommended };
}

/**
 * Pure function so it's unit-testable: does the user need more easy vs medium?
 */
function decideDifficulty(easy, medium, haveMedium) {
  const easyOk = easy.attempts >= 2 && easy.avgAiScore >= 75 && easy.acceptRate >= 0.7;
  const mediumBad = medium.attempts >= 3 && medium.acceptRate < 0.4;
  if (mediumBad) return { difficulty: 'easy', move: 'down' };
  if (easyOk && haveMedium) return { difficulty: 'medium', move: 'up' };
  return { difficulty: 'easy', move: 'stay' };
}

module.exports = { buildRecommendations, decideDifficulty, DIFF_RANK };
