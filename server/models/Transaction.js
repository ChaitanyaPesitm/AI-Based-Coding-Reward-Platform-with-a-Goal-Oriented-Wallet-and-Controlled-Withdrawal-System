const mongoose = require('mongoose');

// Immutable, append-only reward ledger. Every point movement (earn, spend,
// adjustment) is journaled here so the platform is fully auditable.
const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'adjust'],
    required: true
  },
  amount: {
    // Positive = points added, negative = points deducted.
    type: Number,
    required: true
  },
  source: {
    type: String,
    enum: [
      'submission',       // points from a problem solve
      'hint_bonus',       // +5% rewarded-ad AI hint bonus
      'streak_bonus',     // +5% 7+ day streak bonus
      'ad_reward',        // points from watching a rewarded ad
      'withdrawal',       // points paid out on approved withdrawal
      'admin_adjustment', // manual correction by an admin
      'fraud_adjustment'  // points clawed back by the fraud engine
    ],
    required: true
  },
  reference: {
    // Optional pointer to the entity that caused this transaction
    // (Submission, Withdrawal, Goal, ...).
    model: { type: String },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // User's total earned minus withdrawn AFTER this transaction — makes every
  // entry independently auditable even if later entries are tampered with.
  balanceAfter: {
    type: Number,
    default: 0
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ledger is immutable by design: never update/delete, only append.
transactionSchema.pre('findOneAndUpdate', () => {
  throw new Error('Reward ledger transactions are immutable');
});
transactionSchema.pre('findOneAndDelete', () => {
  throw new Error('Reward ledger transactions are immutable');
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ source: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
