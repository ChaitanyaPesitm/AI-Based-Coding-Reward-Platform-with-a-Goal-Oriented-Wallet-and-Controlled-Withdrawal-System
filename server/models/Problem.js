const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: {
    type: String,
    default: '',
    validate: {
      validator: function (v) {
        // Allow empty strings but require the field to be present
        return v !== undefined && v !== null;
      }
    }
  },
  isHidden: { type: Boolean, default: true }
}, { _id: false });

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Problem description is required']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard']
  },
  basePoints: {
    type: Number,
    required: true,
    default: 100
  },
  language: {
    type: String,
    required: true,
    enum: ['c', 'python', 'java'],
    default: 'c'
  },
  starterCode: {
    type: String,
    default: ''
  },
  constraints: {
    type: String,
    default: ''
  },
  // Expected complexity for this problem (for reference/validation)
  expectedTimeComplexity: {
    type: String,
    default: ''
  },
  expectedSpaceComplexity: {
    type: String,
    default: ''
  },
  // Category/topic of the problem (arrays, strings, dp, etc.)
  category: {
    type: String,
    default: 'general'
  },
  testCases: {
    type: [testCaseSchema],
    required: true,
    validate: [arr => arr.length > 0, 'At least one test case is required']
  },
  sampleInput: {
    type: String,
    default: ''
  },
  sampleOutput: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Problem', problemSchema);