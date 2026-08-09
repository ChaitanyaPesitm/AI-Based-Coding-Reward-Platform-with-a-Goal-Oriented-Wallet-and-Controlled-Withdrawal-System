const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULTS = {
  proctoringEnabled: true
};

const loadSettings = async () => {
  const docs = await Setting.find({});
  const settings = { ...DEFAULTS };
  docs.forEach((doc) => {
    settings[doc.key] = doc.value;
  });
  return settings;
};

// GET /api/settings - Public platform settings (no auth required)
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
});

// PUT /api/settings - Admin: Update platform settings
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const updates = req.body || {};
    const allowedKeys = Object.keys(DEFAULTS);

    for (const key of Object.keys(updates)) {
      if (!allowedKeys.includes(key)) continue;
      await Setting.findOneAndUpdate(
        { key },
        { key, value: updates[key] },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const settings = await loadSettings();
    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
});

module.exports = router;
