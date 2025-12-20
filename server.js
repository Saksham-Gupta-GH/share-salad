import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import mime from 'mime-types';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const MESSAGE_TTL_MS = 5 * 60 * 1000; // 5 minutes strict
const ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes strict
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

// Uploads directory (support Render persistent disk via UPLOAD_DIR)
const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const type = file.mimetype;
    if (!ALLOWED_MIME.includes(type)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  }
});

// In-memory runtime state
const rooms = new Map(); // code -> { code, createdAt, expiresAt, clients:Set, items:[] }

// DB setup (PostgreSQL)
const DATABASE_URL = process.env.DATABASE_URL || '';
const ssl = process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false };
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl })
  : null;

async function initDb() {
  if (!pool) {
    console.warn('[DB] DATABASE_URL not set. Running without Postgres persistence.');
    return;
  }
  await pool.query(`
    create table if not exists rooms (
      code text primary key,
      created_at timestamptz not null,
      expires_at timestamptz not null
    );
    create index if not exists idx_rooms_expires on rooms(expires_at);
  `);
  console.log('[DB] Initialized rooms table.');
}

async function upsertRoomRow(code, createdAtMs, expiresAtMs) {
  if (!pool) return;
  await pool.query(
    `insert into rooms(code, created_at, expires_at)
     values ($1, to_timestamp($2/1000.0), to_timestamp($3/1000.0))
     on conflict (code)
     do update set created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at`,
    [code, createdAtMs, expiresAtMs]
  );
}

async function deleteRoomRow(code) {
  if (!pool) return;
  await pool.query('delete from rooms where code = $1', [code]);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    const type = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Upload endpoint
app.post('/api/upload', (req, res) => {
  const room = req.query.room;
  if (!room || !rooms.has(room)) return res.status(400).json({ error: 'Invalid room' });
  upload.single('file')(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    const r = rooms.get(room);
    const item = {
      id: nanoid(10),
      type: 'file',
      from: req.query.from || 'anon',
      fileMeta: {
        name: file.originalname,
        path: file.path,
        size: file.size,
        mime: file.mimetype,
        url: `/uploads/${path.basename(file.path)}`
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + MESSAGE_TTL_MS
    };
    r.items.push(item);
    scheduleItemCleanup(r, item);
    broadcast(r, { type: 'item_added', item: sanitizeItem(item) });
    res.json({ ok: true, item: sanitizeItem(item) });
  });
});

function sanitizeItem(item) {
  const base = {
    id: item.id,
    type: item.type,
    from: item.from,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt
  };
  if (item.type === 'text') {
    return { ...base, content: item.content };
  } else {
    const meta = item.fileMeta || {};
    return { ...base, file: { name: meta.name, size: meta.size, mime: meta.mime, url: meta.url } };
  }
}

function broadcast(room, payload) {
  const msg = JSON.stringify(payload);
  for (const ws of room.clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function safeUnlink(p) { fs.unlink(p, () => {}); }

function scheduleRoomCleanup(code, atMs) {
  const delay = Math.max(atMs - Date.now(), 0);
  setTimeout(async () => {
    const r = rooms.get(code);
    if (!r) return;
    if (Date.now() >= r.expiresAt) {
      for (const it of r.items) {
        if (it.type === 'file' && it.fileMeta?.path && fs.existsSync(it.fileMeta.path)) {
          safeUnlink(it.fileMeta.path);
        }
      }
      rooms.delete(code);
      await deleteRoomRow(code).catch(()=>{});
    }
  }, delay + 1000);
}

function scheduleItemCleanup(room, item) {
  const delay = Math.max(item.expiresAt - Date.now(), 0);
  setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r) return;
    const idx = r.items.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      const removed = r.items.splice(idx, 1)[0];
      if (removed.type === 'file' && removed.fileMeta?.path && fs.existsSync(removed.fileMeta.path)) {
        safeUnlink(removed.fileMeta.path);
      }
      broadcast(room, { type: 'item_removed', id: removed.id });
    }
  }, delay + 1000);
}

// WebSocket
wss.on('connection', (ws) => {
  let joinedRoom = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'join') {
        const code = (msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        if (!code) return ws.send(JSON.stringify({ type: 'error', error: 'Invalid code' }));
        let room = rooms.get(code);
        if (!room) room = await createRoom(code);
        joinedRoom = room;
        room.clients.add(ws);
        ws.send(JSON.stringify({
          type: 'joined',
          code: room.code,
          expiresAt: room.expiresAt,
          items: room.items.map(sanitizeItem)
        }));
      } else if (msg.type === 'text' && joinedRoom) {
        const content = String(msg.content || '').slice(0, 8000);
        if (!content.trim()) return;
        const item = {
          id: nanoid(10),
          type: 'text',
          from: String(msg.from || 'anon').slice(0, 32),
          content,
          createdAt: Date.now(),
          expiresAt: Date.now() + MESSAGE_TTL_MS
        };
        joinedRoom.items.push(item);
        scheduleItemCleanup(joinedRoom, item);
        broadcast(joinedRoom, { type: 'item_added', item: sanitizeItem(item) });
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Bad message' }));
    }
  });

  ws.on('close', () => {
    if (joinedRoom) joinedRoom.clients.delete(ws);
  });
});

async function createRoom(code) {
  const now = Date.now();
  const room = {
    code,
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
    clients: new Set(),
    items: []
  };
  rooms.set(code, room);
  scheduleRoomCleanup(code, room.expiresAt);
  await upsertRoomRow(code, now, room.expiresAt).catch(()=>{});
  return room;
}

// Safety sweeper
setInterval(async () => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now >= room.expiresAt) {
      for (const it of room.items) {
        if (it.type === 'file' && it.fileMeta?.path && fs.existsSync(it.fileMeta.path)) safeUnlink(it.fileMeta.path);
      }
      rooms.delete(code);
      await deleteRoomRow(code).catch(()=>{});
      continue;
    }
    const remain = [];
    for (const it of room.items) {
      if (now >= it.expiresAt) {
        if (it.type === 'file' && it.fileMeta?.path && fs.existsSync(it.fileMeta.path)) safeUnlink(it.fileMeta.path);
        broadcast(room, { type: 'item_removed', id: it.id });
      } else remain.push(it);
    }
    room.items = remain;
  }
}, 10 * 1000);

const PORT = process.env.PORT || 3000;

// Boot
initDb()
  .catch((e) => console.warn('[DB] init error:', e.message))
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`Share Salad running on http://localhost:${PORT}`);
      if (!DATABASE_URL) console.log('Note: DATABASE_URL not set. Postgres persistence disabled.');
    });
  });
