const mongoose = require('mongoose');

const proctorSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  violations: [{
    type: { type: String },
    message: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  }],
  flagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Proctoring lookups are by user + problem for the active session
proctorSessionSchema.index({ user: 1, problem: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ProctorSession', proctorSessionSchema);
