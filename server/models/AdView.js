const mongoose = require('mongoose');

// Per-user ad interactions: impressions, clicks, and rewarded views.
// Used for both performance analytics and anti-abuse (cooldown + daily caps).
const adViewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['impression', 'click', 'view', 'reward'],
    required: true
  },
  status: {
    type: String,
    enum: ['watching', 'rewarded', 'expired', 'rejected'],
    default: 'watching'
  },
  watchedSeconds: {
    type: Number,
    default: 0
  },
  claimedPoints: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Lookups for rewarded-watch flow and admin stats
adViewSchema.index({ user: 1, ad: 1, type: 1, createdAt: -1 });
adViewSchema.index({ ad: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AdView', adViewSchema);
