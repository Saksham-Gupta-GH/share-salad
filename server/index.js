const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const Room = require('./models/Room');
const File = require('./models/File');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Storage Configuration (Memory)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fileshare')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create Room
app.post('/api/create-room', async (req, res) => {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new Room({ roomId });
    await room.save();
    res.json({ roomId });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get Room History / Poll Messages
app.get('/api/room/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send Message
app.post('/api/messages', async (req, res) => {
  const { roomId, type, content, originalName, mimeType, size, senderId, senderName } = req.body;
  try {
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found or expired' });
    
    const message = {
      type,
      content,
      originalName,
      mimeType,
      size,
      senderId,
      senderName,
      createdAt: new Date()
    };
    room.messages.push(message);
    await room.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload File
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const fileDoc = new File({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
      size: req.file.size
    });
    await fileDoc.save();
    
    const fileUrl = `/api/file/${fileDoc._id}`;
    res.json({
      url: fileUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Download/View File
app.get('/api/file/:fileId', async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.fileId);
    if (!fileDoc) return res.status(404).json({ error: 'File not found or expired' });
    
    res.set('Content-Type', fileDoc.contentType);
    res.set('Content-Disposition', `inline; filename="${fileDoc.originalName}"`);
    res.send(fileDoc.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

// Export the app for Vercel
module.exports = app;
