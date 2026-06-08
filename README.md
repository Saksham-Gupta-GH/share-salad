# Anonymous FileShare & Chat

A MERN stack application for anonymous temporary rooms where users can chat and share files. Rooms expire automatically after 30 minutes.

## Features
- **Anonymous Chat**: Join rooms without login.
- **Custom Usernames**: Optional ability to change your display name.
- **File Sharing**: Share files/PDFs in real-time.
- **Auto-Expiry**: Rooms and data deleted after 30 minutes.
- **Responsive UI**: Built with React Bootstrap.

## Tech Stack
- **Frontend**: React, Vite, Bootstrap, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose), Multer, Cloudinary
- **Deployment**: Render (Single Service)

---

## 24/7 Free Deployment Guide (Render Only)

This project is configured to run as a **single service** on Render (Backend serves Frontend). This is the easiest and cheapest way to deploy.

### Prerequisites
1.  **GitHub Account**: You must push this code to a GitHub repository.
2.  **Cloudinary Account**: For free file storage (since Render deletes local files on restart).
3.  **MongoDB Atlas**: For the database.
4.  **Cron-Job.org**: To keep the free server awake 24/7.

### Step 1: Push to GitHub
```bash
git remote add origin https://github.com/Saksham-Gupta-GH/fileshare-app.git
git branch -M main
git push -u origin main
```

### Step 2: Create Web Service on Render
1.  Log in to [Render.com](https://render.com/).
2.  Click **New +** > **Web Service**.
3.  Connect your GitHub repository.
4.  **Configuration**:
    *   **Name**: `fileshare-app` (or whatever you like)
    *   **Region**: Closest to you (e.g., Singapore, Oregon)
    *   **Branch**: `main`
    *   **Root Directory**: `.` (Leave empty / default)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm run build`
        *   *(This will install everything and build the React app)*
    *   **Start Command**: `npm start`
        *   *(This starts the Node server which serves the React app)*
    *   **Instance Type**: Free

5.  **Environment Variables** (Scroll down to "Advanced"):
    Add the following variables:
    *   `MONGODB_URI`: `mongodb+srv://...` (Your Connection String)
    *   `CLOUDINARY_CLOUD_NAME`: `...` (From Cloudinary Dashboard)
    *   `CLOUDINARY_API_KEY`: `...` (From Cloudinary Dashboard)
    *   `CLOUDINARY_API_SECRET`: `...` (From Cloudinary Dashboard)

6.  Click **Create Web Service**.

### Step 3: Keep it Awake (24/7)
Render's free tier sleeps after 15 minutes of inactivity. To fix this:
1.  Copy your new Render URL (e.g., `https://fileshare-app.onrender.com`).
2.  Go to [cron-job.org](https://cron-job.org/) (Free).
3.  Create a **New Cron Job**:
    *   **URL**: `https://fileshare-app.onrender.com/ping`
    *   **Schedule**: Every 10 minutes.
4.  Save.

** Done! Your app is now live, handles file uploads safely, and runs 24/7 for free.**

---

## Local Development
1. Clone repo.
2. Install dependencies:
   ```bash
   npm run install-all  # Custom script to install root, client, and server deps
   ```
3. Create `.env` in `server/` (see `.env.example`) and `.env` in `client/`.
4. Start dev servers:
   ```bash
   npm run dev
   ```
   *This runs both Client and Server concurrently.*

### Node Version on Render
Render’s default Node.js version can change over time. To keep builds predictable:
- This repo sets `engines.node` to `>=20.0.0 <23.0.0` in [package.json](file:///Users/sakshamgupta/Documents/Fileshare/package.json).
- Alternatively, set `NODE_VERSION=22.22.0` in Render environment settings if you prefer a fixed version.
