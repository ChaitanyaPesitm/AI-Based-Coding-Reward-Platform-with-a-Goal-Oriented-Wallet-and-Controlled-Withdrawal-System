const mongoose = require('mongoose');

// Goal-category advertisements managed by admins. Replaces the old hardcoded
// mock list. `rewardPoints` > 0 enables the rewarded-watch flow (earn points).
const adSchema = new mongoose.Schema({
  sponsor: {
    type: String,
    required: [true, 'Sponsor name is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Ad title is required'],
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: [true, 'Ad destination URL is required'],
    trim: true
  },
  cta: {
    type: String,
    default: 'Learn More'
  },
  badge: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['laptop', 'course', 'travel', 'gadget', 'savings', 'custom'],
    default: 'custom',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Rewarded-watch: points a user earns after watching this ad.
  rewardPoints: {
    type: Number,
    default: 0,
    min: 0,
    max: 500
  },
  // Per-user cooldown (hours) before the same ad can reward again.
  rewardCooldownHours: {
    type: Number,
    default: 24,
    min: 0,
    max: 168
  },
  // Aggregate performance stats (server-side counters)
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  rewardClaims: { type: Number, default: 0 }
}, {
  timestamps: true
});

adSchema.index({ category: 1, isActive: 1 });
adSchema.index({ isActive: 1, rewardPoints: 1 });

module.exports = mongoose.model('Ad', adSchema);
