const mongoose = require('mongoose');

// A snapshot of a user's fraud evaluation, kept for admin review.
const fraudCaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  level: {
    type: String,
    enum: ['clean', 'attention', 'flagged', 'critical'],
    default: 'clean'
  },
  // Transparent breakdown: each signal + its contribution to the score.
  reasons: [{
    signal: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    points: { type: Number },
    detail: { type: String }
  }],
  summary: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'reviewed', 'cleared', 'flagged'],
    default: 'open'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

fraudCaseSchema.index({ score: -1, createdAt: -1 });
fraudCaseSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('FraudCase', fraudCaseSchema);
