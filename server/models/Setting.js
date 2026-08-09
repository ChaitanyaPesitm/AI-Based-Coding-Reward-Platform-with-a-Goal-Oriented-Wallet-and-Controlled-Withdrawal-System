const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
