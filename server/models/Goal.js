const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['laptop', 'course', 'travel', 'gadget', 'savings', 'custom'],
    default: 'custom'
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount in points is required'],
    min: 100
  },
  currentPoints: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'withdrawn'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Virtual: progress percentage
goalSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentPoints / this.targetAmount) * 100));
});

// Virtual: currency equivalent (100 points = ₹10)
goalSchema.virtual('currencyEquivalent').get(function() {
  return (this.currentPoints / 100) * 10;
});

// Ensure virtuals are included in JSON
goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);
