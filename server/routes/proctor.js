const express = require('express');
const router = express.Router();
const ProctorSession = require('../models/ProctorSession');
const { protect } = require('../middleware/auth');

router.use(protect);

// POST /api/proctor/start - Begin a proctored session for a problem.
// The server records violations here so the submission route never trusts
// client-supplied proctoring data.
router.post('/start', async (req, res) => {
  try {
    const { problemId } = req.body;
    if (!problemId) {
      return res.status(400).json({ success: false, message: 'problemId is required' });
    }

    // End any previous active session for this user + problem
    await ProctorSession.updateMany(
      { user: req.user._id, problem: problemId, status: 'active' },
      { $set: { status: 'ended' } }
    );

    const session = await ProctorSession.create({ user: req.user._id, problem: problemId });

    res.status(201).json({ success: true, data: { session } });
  } catch (error) {
    console.error('Proctor start error:', error);
    res.status(500).json({ success: false, message: 'Failed to start proctored session' });
  }
});

// POST /api/proctor/violation - Record a violation on an active session
router.post('/violation', async (req, res) => {
  try {
    const { sessionId, type, message } = req.body;
    if (!sessionId || !type) {
      return res.status(400).json({ success: false, message: 'sessionId and type are required' });
    }

    const session = await ProctorSession.findOne({
      _id: sessionId,
      user: req.user._id,
      status: 'active'
    });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active proctored session not found' });
    }

    session.violations.push({ type, message: message || '', at: new Date() });
    if (type === 'tab_switch' || session.violations.length >= 3) {
      session.flagged = true;
    }
    await session.save();

    res.json({ success: true, data: { count: session.violations.length, flagged: session.flagged } });
  } catch (error) {
    console.error('Proctor violation error:', error);
    res.status(500).json({ success: false, message: 'Failed to record violation' });
  }
});

// POST /api/proctor/end - End an active session
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await ProctorSession.findOneAndUpdate(
      { _id: sessionId, user: req.user._id, status: 'active' },
      { $set: { status: 'ended' } }
    );
    res.json({ success: true, message: 'Proctored session ended' });
  } catch (error) {
    console.error('Proctor end error:', error);
    res.status(500).json({ success: false, message: 'Failed to end proctored session' });
  }
});

module.exports = router;
