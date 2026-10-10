const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate token
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          totalPointsEarned: user.totalPointsEarned,
          problemsSolved: user.problemsSolved
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = user.generateToken();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          totalPointsEarned: user.totalPointsEarned,
          problemsSolved: user.problemsSolved
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Daily Quest Assignment Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let questUpdated = false;
    if (!user.dailyQuest || !user.dailyQuest.assignedAt || user.dailyQuest.assignedAt < today) {
      const quests = [
        { desc: 'Solve 2 Python challenges', target: 2, reward: 50 },
        { desc: 'Solve 1 Medium difficulty challenge', target: 1, reward: 75 },
        { desc: 'Achieve an AI Score of 90+ on any problem', target: 1, reward: 100 },
        { desc: 'Execute 3 challenges successfully', target: 3, reward: 60 }
      ];
      const randomQuest = quests[Math.floor(Math.random() * quests.length)];
      
      user.dailyQuest = {
        description: randomQuest.desc,
        target: randomQuest.target,
        progress: 0,
        rewardPoints: randomQuest.reward,
        completed: false,
        assignedAt: new Date()
      };
      questUpdated = true;
    }
    
    if (questUpdated) {
      await user.save();
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        totalPointsEarned: user.totalPointsEarned,
        problemsSolved: user.problemsSolved,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        badges: user.badges,
        dailyQuest: user.dailyQuest,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

module.exports = router;
