const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Goal = require('../models/Goal');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { executeCode } = require('../services/wandbox');
const { evaluateCode } = require('../services/gemini');
const { calculatePoints } = require('../services/rewardEngine');
const { analyzeCode, compareComplexity } = require('../services/complexityAnalyzer');

router.use(protect);

// ─── Badge definitions ────────────────────────────────────────────────────────
const BADGES = {
  first_solve: { check: (u) => u.problemsSolved >= 1, label: '🥇 First Solve' },
  problems_10: { check: (u) => u.problemsSolved >= 10, label: '🔟 10 Problems' },
  problems_25: { check: (u) => u.problemsSolved >= 25, label: '💪 25 Problems' },
  problems_50: { check: (u) => u.problemsSolved >= 50, label: '🏆 50 Problems' },
  points_1000: { check: (u) => u.totalPointsEarned >= 1000, label: '💎 1K Points' },
  points_5000: { check: (u) => u.totalPointsEarned >= 5000, label: '🌟 5K Points' },
  points_10000: { check: (u) => u.totalPointsEarned >= 10000, label: '👑 10K Points' },
  streak_7: { check: (u) => u.longestStreak >= 7, label: '🔥 7-Day Streak' },
  streak_30: { check: (u) => u.longestStreak >= 30, label: '⚡ 30-Day Streak' },
};

/**
 * Compute which new badges a user just earned, add them, and return the names.
 */
function awardBadges(user) {
  const earned = [];
  for (const [id, { check }] of Object.entries(BADGES)) {
    if (!user.badges.includes(id) && check(user)) {
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
    const { problemId, code, language, proctorViolations = 0, proctorFlagged = false } = req.body;

    if (!problemId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Problem ID and code are required'
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

    // Create submission record
    const submission = await Submission.create({
      user: req.user._id,
      problem: problemId,
      goal: activeGoal ? activeGoal._id : null,
      code,
      language: submissionLanguage,
      status: 'running',
      totalTestCases: problem.testCases.length,
      proctorViolations,
      proctorFlagged
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

    // Step 3: Calculate points
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

    submission.pointsEarned = points;
    await submission.save();

    // Step 4: Update user stats (only for new solves)
    let newBadges = [];
    if (points > 0 && !alreadySolved) {
      const freshUser = await User.findById(req.user._id);

      freshUser.totalPointsEarned += points;

      if (submission.status === 'accepted') {
        freshUser.problemsSolved += 1;

        // Track solved problem to prevent double-earning
        if (!freshUser.solvedProblems.map(id => id.toString()).includes(problemId.toString())) {
          freshUser.solvedProblems.push(problemId);
        }

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

      newBadges = awardBadges(freshUser);
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
      const freshUser = await User.findById(req.user._id);
      updateStreak(freshUser);
      await freshUser.save();
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
