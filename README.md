# Fileshare

**Live Demo (Deployed App):**  
https://share-salad.onrender.com/

Secure, temporary rooms for sharing text snippets and small files across your devices.

This project is a lightweight real-time "drop zone" you can open on your phone and laptop to quickly move content between them without logging in or installing anything.

## Features

- **Ephemeral rooms** – rooms auto-expire after a short time window (30 minutes by default).
- **Self-expiring content** – text messages and file links automatically disappear after 5 minutes.
- **File uploads** – upload small files (up to 10 MB by default) with basic MIME-type whitelisting.
- **Real-time updates** – room participants see new messages and file shares instantly via WebSockets.
- **Simple join flow** – create a room with one click or join an existing room by code.
- **Optional Postgres persistence** – room metadata can be stored in Postgres when `DATABASE_URL` is configured; otherwise it runs fully in-memory.

## Tech stack

- **Runtime:** Node.js (ES modules)
- **Web framework:** Express
- **Realtime:** `ws` WebSocket server
- **File uploads:** Multer
- **Database:** PostgreSQL (via `pg`, optional)

## Live demo

If deployed, the app can be accessed at a URL such as:

```text
https://share-salad.onrender.com/
```

_Note: the exact URL may differ depending on your Render setup._

## Project structure

- `server.js` – main Express + WebSocket server, room lifecycle logic, upload handling.
- `index.html` – single-page frontend UI (room creation/join, text and file sharing, activity feed).
- `public/` – static assets (if any).
- `render.yaml` – Render blueprint defining the web service and Postgres database.
- `package.json` – Node.js dependencies and scripts.
- `.gitignore` – standard Node.js ignores and local-only artifacts.

## Requirements

- Node.js 18+ (recommended)
- npm or another compatible package manager
- Optional: a running PostgreSQL instance if you want room metadata persisted

## Getting started (local development)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment (optional but recommended)**

   Create a `.env` file in the project root if you want to use Postgres or customize settings:

   ```bash
   # .env
   PORT=3000
   DATABASE_URL=postgres://user:password@localhost:5432/fileshare
   PGSSL=false               # set to true when using managed Postgres with SSL
   UPLOAD_DIR=./uploads      # optional custom upload directory
   ```

   If `DATABASE_URL` is not set, the app still runs, but room metadata will not be stored in Postgres.

3. **Run the server in development mode**

   ```bash
   npm run dev
   ```

   This uses `nodemon` to restart the server on code changes.

4. **Run the server in production mode (locally)**

   ```bash
   npm start
   ```

5. **Open the app**

   Visit:

   ```text
   http://localhost:3000/
   ```

   - Click **Create New Room** to generate a room code.
   - Or enter an existing room code and click **Join**.
   - Open the same URL on another device, join with the same room code, and start sharing.

## Environment variables

The server honors the following environment variables:

- `PORT` – HTTP port to listen on (default: `3000`).
- `DATABASE_URL` – Postgres connection string. When set, room metadata is stored in a `rooms` table.
- `PGSSL` – set to `false` to disable SSL; otherwise SSL is enabled with `rejectUnauthorized: false` (useful for Render and other managed Postgres providers).
- `UPLOAD_DIR` – directory for storing uploaded files. If not set, `./uploads` in the project directory is used.

## Database schema

When `DATABASE_URL` is configured, the app will automatically create a `rooms` table if it does not exist:

```sql
create table if not exists rooms (
  code text primary key,
  created_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists idx_rooms_expires on rooms(expires_at);
```

This table is used to track active rooms and their expiration times. File data itself is not stored in the database; files live on disk and are unlinked when they expire.

## Deployment

### Render (recommended)

This repository includes a `render.yaml` blueprint which defines:

- A **PostgreSQL database** (`share-salad-db` on the free plan).
- A **Node web service** which:
  - Runs `npm install` as the build command.
  - Runs `npm start` as the start command.
  - Receives `DATABASE_URL` from the managed Postgres database.
  - Sets `PGSSL=true` and `NODE_ENV=production`.

Typical deployment flow:

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select your GitHub repo.
3. Review and create the database and web service as proposed from `render.yaml`.
4. Wait for the build and deploy to complete.
5. Open the generated Render URL to use the app.

### Other platforms

Any platform that can run a long-lived Node.js process with optional Postgres will work:

1. Ensure Node.js 18+ is available.
2. Set the appropriate environment variables (`PORT`, `DATABASE_URL`, `PGSSL`, `UPLOAD_DIR`).
3. Install dependencies with `npm install`.
4. Start the server via `npm start`.
5. Expose the configured port through your hosting platform.

## Security and privacy notes

- Rooms and their contents are **ephemeral by design**:
  - Rooms automatically expire after a configured time window (30 minutes by default).
  - Individual messages and file links expire after 5 minutes by default.
- Uploaded files are stored on disk and removed when they expire or when their room is cleaned up.
- There is **no authentication** layer; room codes are the only way to join a room. Treat room codes as temporary, low-sensitivity identifiers.
- This project is designed for lightweight, casual transfers rather than long-term storage of sensitive data.

## Limitations

- Designed for relatively small files (default 10 MB limit).
- No end-to-end encryption; traffic security depends on HTTPS and your hosting provider.
- No user accounts, permissions, or access control beyond knowing the room code.

## License

This project is provided as-is for personal and educational use. Add a license (e.g. MIT) here if you intend to distribute or open source the project formally.
