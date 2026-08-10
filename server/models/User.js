const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't return password in queries by default
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  totalPointsEarned: {
    type: Number,
    default: 0
  },
  problemsSolved: {
    type: Number,
    default: 0
  },
  // Track which problems the user has already solved (accepted at least once)
  solvedProblems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  }],
  // Points already paid out through approved withdrawals
  withdrawnPoints: {
    type: Number,
    default: 0
  },
  // Rewarded-ad AI hint unlocks (each problem can be used once for +5% bonus)
  hintUnlocks: [{
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    usedAt: { type: Date, default: null }
  }],
  // Gamification: badges earned
  badges: [{
    type: String,
    enum: [
      'first_solve',
      'problems_10',
      'problems_25',
      'problems_50',
      'points_1000',
      'points_5000',
      'points_10000',
      'streak_7',
      'streak_30',
      'no_plagiarism_10'
    ]
  }],
  // Streak tracking
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Leaderboard sorts by total points; withdraw check sums withdrawn points
userSchema.index({ totalPointsEarned: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, isAdmin: this.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = mongoose.model('User', userSchema);
