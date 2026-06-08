const mongoose = require('mongoose');

/* -------------------- Message Schema -------------------- */
const messageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['text', 'file'],
      required: true
    },
    content: {
      type: String // Text message OR file URL
    },
    originalName: {
      type: String // Original filename (for files)
    },
    mimeType: {
      type: String
    },
    size: {
      type: Number
    },
    senderId: {
      type: String // Anonymous user ID
    },
    senderName: {
      type: String // Display name
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false } // Prevent unnecessary subdocument _id
);

/* -------------------- Room Schema -------------------- */
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // 🔥 Auto-delete room after 30 minutes (TTL)
  },

  messages: {
    type: [messageSchema],
    default: []
  }
});

module.exports = mongoose.model('Room', roomSchema);
