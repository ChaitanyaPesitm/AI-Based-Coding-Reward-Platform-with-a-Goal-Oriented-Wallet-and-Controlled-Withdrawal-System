const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

// GET /api/problems - List all problems with solved status for the requesting user
router.get('/', protect, async (req, res) => {
  try {
    const { difficulty, language } = req.query;
    const filter = { isActive: true };

    if (difficulty) filter.difficulty = difficulty;
    if (language) filter.language = language;

    const problems = await Problem.find(filter)
      .select('-testCases')
      .sort({ difficulty: 1, createdAt: -1 });

    // Build a Set of solved problem IDs for O(1) lookup
    const solvedSet = new Set(
      (req.user.solvedProblems || []).map(id => id.toString())
    );

    const data = problems.map(p => ({
      ...p.toObject(),
      solved: solvedSet.has(p._id.toString())
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch problems', error: error.message });
  }
});

// POST /api/problems/:id/unlock-hint - Unlock a rewarded-ad AI hint.
// Uses Socratic AI hint generation if code is provided.
router.post('/:id/unlock-hint', protect, aiLimiter, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const { code, language } = req.body;

    const user = await User.findById(req.user._id);
    const alreadyUnlocked = (user.hintUnlocks || [])
      .some(h => h.problem.toString() === problem._id.toString());

    if (!alreadyUnlocked) {
      user.hintUnlocks.push({ problem: problem._id });
      await user.save();
    }

    const { getSocraticHint } = require('../services/gemini');
    let hintText = `Key Approach for "${problem.title}": Focus on understanding input formatting and boundary cases. Break down the problem step-by-step before writing code!`;
    
    if (code && language) {
      hintText = await getSocraticHint(code, language, problem.title, problem.description);
    }

    res.json({
      success: true,
      data: {
        problemId: problem._id,
        hint: hintText,
        multiplierBonus: 1.05 // 5% bonus point multiplier, consumed on the next earning submission
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unlock AI hint', error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).select('-testCases');

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const solved = (req.user.solvedProblems || [])
      .map(id => id.toString())
      .includes(req.params.id);

    res.json({ success: true, data: { ...problem.toObject(), solved } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch problem', error: error.message });
  }
});

// POST /api/problems - Admin: Create new problem
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, difficulty, basePoints, language, starterCode, constraints, testCases, sampleInput, sampleOutput } = req.body;

    const problem = await Problem.create({
      title, description, difficulty, basePoints, language,
      starterCode, constraints, testCases, sampleInput, sampleOutput
    });

    res.status(201).json({ success: true, message: 'Problem created successfully', data: problem });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create problem', error: error.message });
  }
});

// PUT /api/problems/:id - Admin: Update problem
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    res.json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update problem', error: error.message });
  }
});

// DELETE /api/problems/:id - Admin: Delete problem
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    res.json({ success: true, message: 'Problem deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete problem', error: error.message });
  }
});

// POST /api/problems/:id/rubber-duck - Socratic debugging chat (never writes code)
router.post('/:id/rubber-duck', protect, aiLimiter, async (req, res) => {
  try {
    const { message, code, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const problem = await Problem.findById(req.params.id).select('title language description');
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const { rubberDuckChat } = require('../services/gemini');
    const reply = await rubberDuckChat(
      message,
      code || '',
      problem.language,
      problem.title,
      history || []
    );

    res.json({ success: true, data: { reply } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to chat', error: error.message });
  }
});

// POST /api/problems/:id/senior-dev-answer - Grade a Senior Dev follow-up answer
// Awards +20 bonus points for a conceptually correct answer (once per submission)
router.post('/:id/senior-dev-answer', protect, aiLimiter, async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required' });
    }

    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const { gradeSeniorDevAnswer } = require('../services/gemini');
    const { recordTransaction } = require('../services/ledger');

    const gradeResult = await gradeSeniorDevAnswer(question, answer, problem.title);

    let bonusPoints = 0;
    if (gradeResult.correct) {
      bonusPoints = 20;
      const user = await User.findById(req.user._id);
      user.totalPointsEarned += bonusPoints;
      await user.save();

      // Update active goal
      const Goal = require('../models/Goal');
      const activeGoal = await Goal.findOne({ user: req.user._id, status: 'active' });
      if (activeGoal) {
        activeGoal.currentPoints += bonusPoints;
        if (activeGoal.currentPoints >= activeGoal.targetAmount) activeGoal.status = 'completed';
        await activeGoal.save();
      }

      await recordTransaction({
        user: req.user._id,
        type: 'earn',
        amount: bonusPoints,
        source: 'other',
        reference: { model: 'Problem', id: problem._id },
        description: `Senior Dev Bonus: "${problem.title}" conceptual review`,
        metadata: { question, answer }
      }).catch(err => console.error('Ledger senior dev failed:', err.message));
    }

    res.json({
      success: true,
      data: {
        correct: gradeResult.correct,
        feedback: gradeResult.feedback,
        bonusPoints
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to grade answer', error: error.message });
  }
});

module.exports = router;
