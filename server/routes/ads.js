const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const AdView = require('../models/AdView');
const User = require('../models/User');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');
const { adLimiter } = require('../middleware/rateLimiter');
const { recordTransaction } = require('../services/ledger');

router.use(protect, adLimiter);

// ─── Rewarded-watch anti-abuse limits ─────────────────────────────────────────
const MIN_WATCH_SECONDS = 10;      // must watch at least this long to claim
const MAX_DAILY_REWARDED_ADS = 5;  // max rewarded ads per user per day
const MAX_DAILY_REWARD_POINTS = 100; // max ad points per user per day

// Sponsored challenges (shown on the problems page)
const SPONSORED_CHALLENGES = [
  {
    id: 'sp1',
    sponsor: 'TechCorp',
    title: 'Array Optimization Challenge',
    description: 'Optimize an array sorting algorithm. Top 3 solutions win ₹500 each!',
    prize: '₹500',
    deadline: '2026-09-01',
    category: 'algorithms'
  },
  {
    id: 'sp2',
    sponsor: 'DataStart',
    title: 'String Parsing Hackathon',
    description: 'Build the fastest string parser. Winners featured on DataStart careers page.',
    prize: '₹300',
    deadline: '2026-08-25',
    category: 'strings'
  }
];

/**
 * Strip internal counters from an ad before sending it to clients.
 */
const publicAd = (ad) => ({
  id: ad._id,
  sponsor: ad.sponsor,
  title: ad.title,
  description: ad.description,
  url: ad.url,
  cta: ad.cta,
  badge: ad.badge,
  category: ad.category,
  rewardPoints: ad.rewardPoints,
  rewardCooldownHours: ad.rewardCooldownHours
});

// GET /api/ads?category=laptop - Active ads for a goal category (DB-backed)
router.get('/', async (req, res) => {
  try {
    const { category = 'custom' } = req.query;
    let ads = await Ad.find({ category, isActive: true }).lean();
    // Fall back to the generic "custom" bucket when a category has no ads
    if (ads.length === 0 && category !== 'custom') {
      ads = await Ad.find({ category: 'custom', isActive: true }).lean();
    }
    res.json({
      success: true,
      category,
      data: ads.map(publicAd),
      sponsoredChallenges: SPONSORED_CHALLENGES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ads', error: error.message });
  }
});

// GET /api/ads/sponsored-challenges
router.get('/sponsored-challenges', async (req, res) => {
  res.json({ success: true, data: SPONSORED_CHALLENGES });
});

// POST /api/ads/:id/impression - Count a displayed ad
router.post('/:id/impression', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

    AdView.create({ user: req.user._id, ad: ad._id, type: 'impression', status: 'watching' })
      .catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record impression', error: error.message });
  }
});

// POST /api/ads/:id/click - Count a click and return the destination URL
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

    AdView.create({ user: req.user._id, ad: ad._id, type: 'click', status: 'watching' })
      .catch(() => {});
    res.json({ success: true, data: { url: ad.url } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record click', error: error.message });
  }
});

/**
 * Daily rewarded-ad budget for a user (from today's rewarded views).
 */
async function dailyAdBudget(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rewarded = await AdView.find({
    user: userId,
    type: 'view',
    status: 'rewarded',
    createdAt: { $gte: todayStart }
  }).select('claimedPoints ad').lean();

  const points = rewarded.reduce((sum, v) => sum + (v.claimedPoints || 0), 0);
  const adIds = new Set(rewarded.map(v => String(v.ad)));
  return { count: rewarded.length, points, adIds };
}

// POST /api/ads/:id/view-start - Begin a rewarded watch (server timestamps it)
router.post('/:id/view-start', async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, isActive: true });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    if (!ad.rewardPoints || ad.rewardPoints <= 0) {
      return res.status(400).json({ success: false, message: 'This ad has no reward' });
    }

    // Rewarded ads only make sense while working toward a goal
    const activeGoal = await Goal.findOne({ user: req.user._id, status: 'active' });
    if (!activeGoal) {
      return res.status(400).json({ success: false, message: 'Set an active goal to earn from rewarded ads.' });
    }

    // Cooldown: same ad can't reward this user again within its cooldown window
    const lastReward = await AdView.findOne({
      user: req.user._id,
      ad: ad._id,
      type: 'view',
      status: 'rewarded'
    }).sort({ createdAt: -1 });

    if (lastReward) {
      const cooldownMs = (ad.rewardCooldownHours || 24) * 60 * 60 * 1000;
      const nextAllowed = new Date(lastReward.createdAt.getTime() + cooldownMs);
      if (Date.now() < nextAllowed.getTime()) {
        const hoursLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (60 * 60 * 1000));
        return res.status(429).json({
          success: false,
          message: `Ad cooldown active — try again in ~${hoursLeft}h.`
        });
      }
    }

    // Daily caps
    const budget = await dailyAdBudget(req.user._id);
    if (budget.count >= MAX_DAILY_REWARDED_ADS) {
      return res.status(429).json({ success: false, message: `Daily rewarded-ads limit reached (${MAX_DAILY_REWARDED_ADS}).` });
    }
    if (budget.points + ad.rewardPoints > MAX_DAILY_REWARD_POINTS) {
      return res.status(429).json({ success: false, message: `Daily ad-points limit reached (${MAX_DAILY_REWARD_POINTS}).` });
    }

    const view = await AdView.create({
      user: req.user._id,
      ad: ad._id,
      type: 'view',
      status: 'watching',
      startedAt: new Date()
    });

    res.json({ success: true, data: { viewId: view._id, requiredSeconds: MIN_WATCH_SECONDS } });
  } catch (error) {
    console.error('Ad view-start error:', error);
    res.status(500).json({ success: false, message: 'Failed to start rewarded view', error: error.message });
  }
});

// POST /api/ads/:id/reward - Claim points after the minimum watch time
router.post('/:id/reward', async (req, res) => {
  try {
    const { viewId } = req.body;
    if (!viewId) return res.status(400).json({ success: false, message: 'viewId is required' });

    const ad = await Ad.findOne({ _id: req.params.id, isActive: true });
    if (!ad || !ad.rewardPoints) {
      return res.status(400).json({ success: false, message: 'Ad reward not available' });
    }

    const view = await AdView.findOne({ _id: viewId, user: req.user._id, ad: ad._id, type: 'view' });
    if (!view) return res.status(404).json({ success: false, message: 'Rewarded view not found' });
    if (view.status === 'rewarded') {
      return res.status(400).json({ success: false, message: 'Reward already claimed' });
    }

    const watchedSeconds = Math.floor((Date.now() - new Date(view.startedAt).getTime()) / 1000);
    if (watchedSeconds < MIN_WATCH_SECONDS) {
      return res.status(400).json({
        success: false,
        message: `Please keep watching — ${MIN_WATCH_SECONDS - watchedSeconds}s remaining.`
      });
    }

    // Re-check caps (guards parallel claims) then claim atomically
    const budget = await dailyAdBudget(req.user._id);
    if (budget.count >= MAX_DAILY_REWARDED_ADS || budget.points + ad.rewardPoints > MAX_DAILY_REWARD_POINTS) {
      return res.status(429).json({ success: false, message: 'Daily ad reward limit reached.' });
    }

    const claimed = await AdView.findOneAndUpdate(
      { _id: view._id, user: req.user._id, status: 'watching' },
      { $set: { status: 'rewarded', claimedPoints: ad.rewardPoints, watchedSeconds } },
      { new: true }
    );
    if (!claimed) {
      return res.status(400).json({ success: false, message: 'Reward could not be claimed (already processed).' });
    }

    // Award points + ledger entry (immutable audit)
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalPointsEarned: ad.rewardPoints } });
    await recordTransaction({
      user: req.user._id,
      type: 'earn',
      amount: ad.rewardPoints,
      source: 'ad_reward',
      reference: { model: 'Ad', id: ad._id },
      description: `Watched ad: "${ad.title}"`,
      metadata: { sponsor: ad.sponsor, category: ad.category, rewardPoints: ad.rewardPoints }
    }).catch(err => console.error('Ledger ad-reward write failed:', err.message));

    await Ad.findByIdAndUpdate(ad._id, { $inc: { rewardClaims: 1 } });

    res.json({
      success: true,
      message: `🎉 +${ad.rewardPoints} points earned!`,
      data: { points: ad.rewardPoints, view: claimed }
    });
  } catch (error) {
    console.error('Ad reward error:', error);
    res.status(500).json({ success: false, message: 'Failed to claim ad reward', error: error.message });
  }
});

module.exports = router;
