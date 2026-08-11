const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// POST /api/goals - Create a new goal
router.post('/', async (req, res) => {
  try {
    const { title, description, category, targetAmount } = req.body;

    // Check if user already has an active goal
    const activeGoal = await Goal.findOne({ user: req.user._id, status: 'active' });
    if (activeGoal) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active goal. Complete or delete it before creating a new one.'
      });
    }

    const goal = await Goal.create({
      user: req.user._id,
      title,
      description,
      category,
      targetAmount
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
      error: error.message
    });
  }
});

// GET /api/goals - Get all goals for current user
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
});

// GET /api/goals/active - Get the user's current active goal
router.get('/active', async (req, res) => {
  try {
    const goal = await Goal.findOne({ user: req.user._id, status: 'active' });
    res.json({
      success: true,
      data: goal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active goal',
      error: error.message
    });
  }
});

// GET /api/goals/:id - Get single goal
router.get('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
      error: error.message
    });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, targetAmount } = req.body;
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, description, category, targetAmount },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update goal',
      error: error.message
    });
  }
});

// POST /api/goals/:id/reset - Reset goal progress back to active/0 points
router.post('/:id/reset', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    goal.currentPoints = 0;
    goal.status = 'active';
    await goal.save();

    res.json({ success: true, message: 'Goal reset successfully', data: goal });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset goal',
      error: error.message
    });
  }
});

// DELETE /api/goals/:id - Delete goal (only if no points accumulated)
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.currentPoints > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a goal with accumulated points. Please withdraw or contact admin.'
      });
    }

    await Goal.deleteOne({ _id: goal._id });
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
});

module.exports = router;
