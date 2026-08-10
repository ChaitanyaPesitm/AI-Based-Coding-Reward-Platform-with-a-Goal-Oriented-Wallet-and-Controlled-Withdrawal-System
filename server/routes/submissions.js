const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Goal = require('../models/Goal');
const User = require('../models/User');
const ProctorSession = require('../models/ProctorSession');
const { protect, adminOnly } = require('../middleware/auth');
const { executeCode } = require('../services/wandbox');
const { evaluateCode } = require('../services/gemini');
const { calculatePoints } = require('../services/rewardEngine');
const { analyzeCode, compareComplexity } = require('../services/complexityAnalyzer');
const { BADGE_META } = require('../services/badges');
const { recordTransaction } = require('../services/ledger');

// Hard cap on submitted code size (chars) — protects the remote executor.
const MAX_CODE_CHARS = 50 * 1024;

router.use(protect);

// ─── Badge definitions ────────────────────────────────────────────────────────
// Checks read from BADGE_META for labels/descriptions (single source of truth).
const BADGES = {
  first_solve:      { check: (u) => u.problemsSolved >= 1 },
  problems_10:      { check: (u) => u.problemsSolved >= 10 },
  problems_25:      { check: (u) => u.problemsSolved >= 25 },
  problems_50:      { check: (u) => u.problemsSolved >= 50 },
  points_1000:      { check: (u) => u.totalPointsEarned >= 1000 },
  points_5000:      { check: (u) => u.totalPointsEarned >= 5000 },
  points_10000:     { check: (u) => u.totalPointsEarned >= 10000 },
  streak_7:         { check: (u) => u.longestStreak >= 7 },
  streak_30:        { check: (u) => u.longestStreak >= 30 },
  no_plagiarism_10: { check: (u, ctx) => ctx.cleanSubmissionCount >= 10 },
};

/**
 * Compute which new badges a user just earned, add them, and return the names.
 */
async function awardBadges(user) {
  const cleanSubmissionCount = await Submission.countDocuments({
    user: user._id,
    plagiarismFlag: { $ne: true }
  });
  const ctx = { cleanSubmissionCount };
  const earned = [];
  for (const [id, { check }] of Object.entries(BADGES)) {
    if (!user.badges.includes(id) && check(user, ctx)) {
      user.badges.push(id);
      earned.push(id);
    }
  }
  return earned;
}

/**
 * Update daily activity streak.
 * Streak increments when the user has an accepted submission today.
 * Streak resets to 1 if the last activity was more than 1 day ago.
 */
function updateStreak(user) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  if (!user.lastActivityDate) {
    // Very first activity
    user.currentStreak = 1;
  } else {
    const lastStr = new Date(user.lastActivityDate).toISOString().slice(0, 10);
    if (lastStr === todayStr) {
      // Already counted today — nothing to change
      return;
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastStr === yesterdayStr) {
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else {
      // Gap — reset streak
      user.currentStreak = 1;
    }
  }

  user.lastActivityDate = now;
  if (user.currentStreak > (user.longestStreak || 0)) {
    user.longestStreak = user.currentStreak;
  }
}

// POST /api/submissions - Submit code for a problem
router.post('/', async (req, res) => {
  try {
    const { problemId, code, language } = req.body;

    if (!problemId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID and code are required'
      });
    }

    if (code.length > MAX_CODE_CHARS) {
      return res.status(413).json({
        success: false,
        message: `Code too large (max ${Math.round(MAX_CODE_CHARS / 1024)} KB). Please shorten your solution.`
      });
    }

    // Get problem with test cases
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const submissionLanguage = language || problem.language;

    // Check if user already solved this problem (accepted at least once)
    const alreadySolved = req.user.solvedProblems &&
      req.user.solvedProblems.map(id => id.toString()).includes(problemId.toString());

    // Get user's active goal
    const activeGoal = await Goal.findOne({ user: req.user._id, status: 'active' });

    // Create submission record. Proctoring data is NOT accepted from the client —
    // it is read from the server-side proctor session below.
    const submission = await Submission.create({
      user: req.user._id,
      problem: problemId,
      goal: activeGoal ? activeGoal._id : null,
      code,
      language: submissionLanguage,
      status: 'running',
      totalTestCases: problem.testCases.length
    });

    // Step 1: Execute code against test cases via Wandbox
    let judgeResult;
    try {
      judgeResult = await executeCode(code, submissionLanguage, problem.testCases);
    } catch (judgeError) {
      submission.status = 'runtime_error';
      submission.executionOutput = judgeError.message;
      await submission.save();
      return res.json({ success: true, message: 'Code execution failed', data: submission });
    }

    submission.testCasesPassed = judgeResult.passed;
    submission.totalTestCases = judgeResult.total;
    submission.executionTime = judgeResult.executionTime || 0;

    if (judgeResult.compilationError) {
      submission.status = 'compilation_error';
      submission.executionOutput = judgeResult.compilationError;
      await submission.save();
      return res.json({ success: true, message: 'Compilation error', data: submission });
    }

    // Determine status
    if (judgeResult.allPassed) {
      submission.status = 'accepted';
    } else if (judgeResult.passed > 0) {
      submission.status = 'wrong_answer';
    } else {
      const hasRuntimeError = judgeResult.results.some(r => r.statusId >= 7 && r.statusId <= 12);
      const hasTLE = judgeResult.results.some(r => r.statusId === 5);
      if (hasTLE) submission.status = 'time_limit_exceeded';
      else if (hasRuntimeError) submission.status = 'runtime_error';
      else submission.status = 'wrong_answer';
    }

    // Step 2: AI Evaluation (only if at least one test case passed)
    let aiResult = {
      aiScore: 0,
      timeComplexity: 'N/A',
      spaceComplexity: 'N/A',
      codeQuality: 0,
      efficiency: 0,
      suggestions: 'No test cases passed - AI evaluation skipped.',
      plagiarismRisk: 0
    };

    // Local complexity analysis (always runs, works even without Gemini API)
    const localAnalysis = analyzeCode(code, submissionLanguage);

    if (judgeResult.passed > 0) {
      aiResult = await evaluateCode(
        code,
        submissionLanguage,
        problem.description,
        judgeResult.passed,
        judgeResult.total
      );

      // If Gemini failed or returned "Could not analyze", use local analysis
      if (!aiResult.timeComplexity || aiResult.timeComplexity === 'Could not analyze' || aiResult.timeComplexity === 'Unknown') {
        aiResult.timeComplexity = localAnalysis.timeComplexity;
      }
      if (!aiResult.spaceComplexity || aiResult.spaceComplexity === 'Could not analyze' || aiResult.spaceComplexity === 'Unknown') {
        aiResult.spaceComplexity = localAnalysis.spaceComplexity;
      }
    } else {
      // Even if no test cases passed, still provide complexity analysis
      aiResult.timeComplexity = localAnalysis.timeComplexity;
      aiResult.spaceComplexity = localAnalysis.spaceComplexity;
    }

    // Compare with expected complexity if available
    const complexityComparison = {
      time: compareComplexity(aiResult.timeComplexity, problem.expectedTimeComplexity),
      space: compareComplexity(aiResult.spaceComplexity, problem.expectedSpaceComplexity)
    };

    submission.aiScore = aiResult.aiScore;
    submission.aiFeedback = {
      timeComplexity: aiResult.timeComplexity,
      spaceComplexity: aiResult.spaceComplexity,
      codeQuality: aiResult.codeQuality,
      efficiency: aiResult.efficiency,
      suggestions: aiResult.suggestions,
      complexityComparison
    };
    submission.plagiarismFlag = aiResult.plagiarismRisk > 70;

    // Step 3: Server-side proctoring — read violations from the recorded session.
    // Client-supplied proctoring values are ignored; only a session the client
    // explicitly started (and the server recorded violations into) counts.
    const activeSession = await ProctorSession.findOne({
      user: req.user._id,
      problem: problemId,
      status: 'active'
    }).sort({ createdAt: -1 });
    const proctorViolations = activeSession ? activeSession.violations.length : 0;
    const proctorFlagged = activeSession ? activeSession.flagged : false;
    if (activeSession) {
      activeSession.status = 'ended';
      await activeSession.save();
    }

    // Step 4: Atomic solve claim — prevents double-awarding when two concurrent
    // submissions for the same problem both see "alreadySolved === false".
    // Only the first request can add the problem to solvedProblems.
    let claim = null;
    if (submission.status === 'accepted' && !alreadySolved) {
      claim = await User.findOneAndUpdate(
        { _id: req.user._id, solvedProblems: { $ne: problemId } },
        { $addToSet: { solvedProblems: problemId } },
        { new: true }
      );
      if (!claim) {
        // A concurrent request claimed this solve first
        alreadySolved = true;
      }
    }

    // Step 5: Calculate points
    // No points if user already solved this problem with an accepted submission
    let points = 0;
    let breakdown = null;

    if (!alreadySolved) {
      const result = calculatePoints({
        basePoints: problem.basePoints,
        testCasesPassed: judgeResult.passed,
        totalTestCases: judgeResult.total,
        aiScore: aiResult.aiScore,
        difficulty: problem.difficulty
      });
      points = result.points;
      breakdown = result.breakdown;
    } else {
      breakdown = {
        note: 'You already solved this problem — re-submission allowed but no additional points awarded.',
        basePoints: problem.basePoints,
        pointsEarned: 0
      };
    }

    // Step 6: Proctoring penalty (0.5x) when the session was flagged
    if (points > 0 && proctorFlagged) {
      const penalty = Math.floor(points * 0.5);
      points -= penalty;
      breakdown.proctoringPenalty = `-${penalty} (flagged — ${proctorViolations} violation(s))`;
    }

    // Step 7: Load the authoritative user document once (the atomic claim result
    // when available) so the hint bonus, awarding, and badge checks all persist
    // consistently in a single save.
    const freshUser = claim || await User.findById(req.user._id);

    // Rewarded-ad AI hint bonus: +5%, consumed once per problem
    if (points > 0 && freshUser) {
      const hintIndex = (freshUser.hintUnlocks || [])
        .findIndex(h => h.problem.toString() === problemId.toString() && !h.usedAt);
      if (hintIndex !== -1) {
        const hintBonus = Math.round(points * 0.05);
        points += hintBonus;
        breakdown.aiHintBonus = `+${hintBonus} (5% rewarded-ad AI hint bonus)`;
        freshUser.hintUnlocks[hintIndex].usedAt = new Date();
      }
    }

    submission.pointsEarned = points;
    submission.proctorViolations = proctorViolations;
    submission.proctorFlagged = proctorFlagged;
    await submission.save();

    // Step 8: Update user stats (only for new solves)
    let newBadges = [];
    if (points > 0 && !alreadySolved) {
      freshUser.totalPointsEarned += points;

      if (submission.status === 'accepted') {
        freshUser.problemsSolved += 1;

        // Update daily streak
        updateStreak(freshUser);

        // Award goal-based streak bonus (5% extra on 7+ day streaks)
        if (freshUser.currentStreak >= 7 && activeGoal) {
          const streakBonus = Math.round(points * 0.05);
          points += streakBonus;
          freshUser.totalPointsEarned += streakBonus;
          submission.pointsEarned += streakBonus;
          await submission.save();
          breakdown.streakBonus = `+${streakBonus} (${freshUser.currentStreak}-day streak bonus)`;
        }
      }

      newBadges = await awardBadges(freshUser);
      await freshUser.save();

      // Update active goal
      if (activeGoal) {
        activeGoal.currentPoints += submission.pointsEarned;
        if (activeGoal.currentPoints >= activeGoal.targetAmount) {
          activeGoal.status = 'completed';
        }
        await activeGoal.save();
      }
    } else if (submission.status === 'accepted' && alreadySolved) {
      // Still update streak even on re-solve, but no points
      updateStreak(freshUser);
      await freshUser.save();
    }

    // Step 9: Reward ledger — every point earned gets an auditable entry.
    // The breakdown metadata explains how the total is composed (base, hint
    // bonus, streak bonus, proctor penalty) so each entry is fully auditable.
    if (submission.pointsEarned > 0) {
      await recordTransaction({
        user: req.user._id,
        type: 'earn',
        amount: submission.pointsEarned,
        source: 'submission',
        reference: { model: 'Submission', id: submission._id },
        description: `Solved "${problem.title}" (${problem.difficulty})`,
        metadata: {
          problem: problemId,
          problemTitle: problem.title,
          difficulty: problem.difficulty,
          language: submissionLanguage,
          aiScore: aiResult.aiScore,
          testCasesPassed: judgeResult.passed,
          totalTestCases: judgeResult.total,
          breakdown
        }
      }).catch(err => console.error('Ledger write failed:', err.message));
    }

    res.json({
      success: true,
      message: submission.status === 'accepted'
        ? (alreadySolved ? '✅ Accepted! (No points — already solved)' : '✅ All test cases passed!')
        : `${judgeResult.passed}/${judgeResult.total} test cases passed`,
      data: {
        submission,
        alreadySolved,
        judgeResults: judgeResult.results.map(r => ({
          status: r.status,
          passed: r.passed,
          time: r.time,
          input: r.input ? r.input.substring(0, 50) + '...' : '',
          expectedOutput: '[hidden]',
          actualOutput: r.passed ? '[correct]' : '[incorrect]'
        })),
        aiEvaluation: {
          score: aiResult.aiScore,
          timeComplexity: aiResult.timeComplexity,
          spaceComplexity: aiResult.spaceComplexity,
          codeQuality: aiResult.codeQuality,
          efficiency: aiResult.efficiency,
          suggestions: aiResult.suggestions,
          strengths: aiResult.strengths || '',
          complexityComparison
        },
        pointsBreakdown: breakdown,
        pointsEarned: submission.pointsEarned,
        newBadges
      }
    });
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).json({
      success: false,
      message: 'Submission failed',
      error: error.message
    });
  }
});

// GET /api/submissions - Get user's submission history
router.get('/', async (req, res) => {
  try {
    const { problemId, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (problemId) filter.problem = problemId;

    const submissions = await Submission.find(filter)
      .populate('problem', 'title difficulty language basePoints')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch submissions', error: error.message });
  }
});

// GET /api/submissions/violators - Admin: list students who violated proctoring rules.
// Must be declared BEFORE the /:id route so "violators" is not treated as an id.
router.get('/violators', protect, adminOnly, async (req, res) => {
  try {
    const violators = await Submission.aggregate([
      { $match: { proctorFlagged: true } },
      {
        $group: {
          _id: '$user',
          flaggedCount: { $sum: 1 },
          totalViolations: { $sum: '$proctorViolations' },
          lastFlaggedAt: { $max: '$createdAt' },
          problems: { $addToSet: '$problem' }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $lookup: { from: 'problems', localField: 'problems', foreignField: '_id', as: 'problemDetails' } },
      { $sort: { lastFlaggedAt: -1 } }
    ]);

    const data = violators.map(v => ({
      userId: v._id,
      name: v.user.name,
      email: v.user.email,
      flaggedCount: v.flaggedCount,
      totalViolations: v.totalViolations,
      lastFlaggedAt: v.lastFlaggedAt,
      problems: v.problemDetails.map(p => ({ title: p.title, difficulty: p.difficulty, language: p.language }))
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Violators fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch violators', error: error.message });
  }
});

// GET /api/submissions/analytics - User's performance analytics + improvement trend.
// Must be declared BEFORE the /:id route.
router.get('/analytics', async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user._id })
      .populate('problem', 'title difficulty basePoints category')
      .sort({ createdAt: 1 });

    const total = submissions.length;
    const accepted = submissions.filter(s => s.status === 'accepted');
    const withAi = submissions.filter(s => s.aiScore > 0);
    const withTime = submissions.filter(s => s.executionTime > 0);

    const series = submissions.slice(-30).map((s, i) => ({
      index: i + 1,
      date: s.createdAt,
      status: s.status,
      aiScore: s.aiScore,
      executionTime: s.executionTime,
      testCasesPassed: s.testCasesPassed,
      totalTestCases: s.totalTestCases,
      pointsEarned: s.pointsEarned,
      problemTitle: s.problem?.title || 'Unknown'
    }));

    // Per-problem performance for fine-grained improvement tracking
    const perProblem = {};
    for (const s of submissions) {
      const key = String(s.problem?._id || 'unknown');
      if (!perProblem[key]) {
        perProblem[key] = {
          problem: s.problem?.title || 'Unknown',
          difficulty: s.problem?.difficulty || 'unknown',
          attempts: 0,
          accepted: 0,
          aiScores: [],
          times: [],
          bestAiScore: 0
        };
      }
      perProblem[key].attempts += 1;
      perProblem[key].accepted += s.status === 'accepted' ? 1 : 0;
      if (s.aiScore > 0) {
        perProblem[key].aiScores.push(s.aiScore);
        perProblem[key].bestAiScore = Math.max(perProblem[key].bestAiScore, s.aiScore);
      }
      if (s.executionTime > 0) perProblem[key].times.push(s.executionTime);
    }
    const problemStats = Object.values(perProblem).map(p => ({
      ...p,
      avgAiScore: p.aiScores.length ? Math.round(p.aiScores.reduce((a, b) => a + b, 0) / p.aiScores.length) : 0,
      avgExecutionTime: p.times.length ? Math.round(p.times.reduce((a, b) => a + b, 0) / p.times.length) : 0,
      acceptRate: p.attempts ? Math.round((p.accepted / p.attempts) * 100) : 0
    })).sort((a, b) => b.attempts - a.attempts);

    res.json({
      success: true,
      data: {
        totals: {
          submissions: total,
          accepted: accepted.length,
          acceptRate: total ? Math.round((accepted.length / total) * 100) : 0,
          avgAiScore: withAi.length ? Math.round(withAi.reduce((a, b) => a + b.aiScore, 0) / withAi.length) : 0,
          bestAiScore: withAi.length ? Math.max(...withAi.map(s => s.aiScore)) : 0,
          avgExecutionTime: withTime.length ? Math.round(withTime.reduce((a, b) => a + b.executionTime, 0) / withTime.length) : 0,
          avgTestPassRate: total ? Math.round(submissions.reduce((a, b) => a + (b.totalTestCases ? b.testCasesPassed / b.totalTestCases : 0), 0) / total * 100) : 0,
          pointsEarned: submissions.reduce((a, b) => a + (b.pointsEarned || 0), 0)
        },
        series,
        problemStats
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to build analytics', error: error.message });
  }
});

// GET /api/submissions/:id - Get single submission
router.get('/:id', async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('problem', 'title difficulty language basePoints');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch submission', error: error.message });
  }
});

module.exports = router;
