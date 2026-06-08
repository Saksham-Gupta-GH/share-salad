const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  data: {
    type: Buffer,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900 // Auto-delete file after 15 minutes (TTL)
  }
});

module.exports = mongoose.model('File', fileSchema);
