const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  pointsAmount: {
    type: Number,
    required: true,
    min: 100
  },
  currencyAmount: {
    type: Number, // Calculated: (pointsAmount / 100) * 10 = ₹ value
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'approved', 'completed', 'rejected'],
    default: 'pending'
  },
  fraudScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  fraudDetails: {
    plagiarismCount: { type: Number, default: 0 },
    rapidSubmissions: { type: Boolean, default: false },
    suspiciousPatterns: { type: String, default: '' }
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer'],
    default: 'upi'
  },
  upiId: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
