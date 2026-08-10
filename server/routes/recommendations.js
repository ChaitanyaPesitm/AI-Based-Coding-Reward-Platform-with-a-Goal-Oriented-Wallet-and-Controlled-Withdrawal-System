const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { buildRecommendations } = require('../services/recommendations');

router.use(protect);

// GET /api/recommendations - AI personalized learning + adaptive difficulty
router.get('/', async (req, res) => {
  try {
    const data = await buildRecommendations(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to build recommendations', error: error.message });
  }
});

module.exports = router;
