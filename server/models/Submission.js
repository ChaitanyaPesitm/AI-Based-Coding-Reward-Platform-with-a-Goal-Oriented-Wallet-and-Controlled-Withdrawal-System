const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
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
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  language: {
    type: String,
    required: true,
    enum: ['c', 'python', 'java']
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'accepted', 'wrong_answer', 'compilation_error', 'runtime_error', 'time_limit_exceeded'],
    default: 'pending'
  },
  testCasesPassed: {
    type: Number,
    default: 0
  },
  totalTestCases: {
    type: Number,
    default: 0
  },
  // AI Evaluation Results
  aiScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  aiFeedback: {
    timeComplexity: { type: String, default: '' },
    spaceComplexity: { type: String, default: '' },
    codeQuality: { type: Number, default: 0 },
    efficiency: { type: Number, default: 0 },
    suggestions: { type: String, default: '' },
    complexityComparison: {
      time: {
        isOptimal: { type: Boolean, default: true },
        message: { type: String, default: '' }
      },
      space: {
        isOptimal: { type: Boolean, default: true },
        message: { type: String, default: '' }
      }
    }
  },
  plagiarismFlag: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  executionTime: {
    type: Number, // in milliseconds
    default: 0
  },
  executionOutput: {
    type: String,
    default: ''
  },
  // Proctoring data
  proctorViolations: {
    type: Number,
    default: 0
  },
  proctorFlagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hot queries: per-user history, per-user fraud checks
submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ user: 1, plagiarismFlag: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
