# Payment Tracker - Deployment Guide (Vercel & Render)

This repository is fully configured for turnkey zero-configuration deployment:
- **Frontend**: Deploy on **Vercel**
- **Backend**: Deploy on **Render**

---

## 🚀 Part 1: Deploy Backend to Render

### Option A: 1-Click Render Blueprint (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
2. Connect your GitHub repository (`Payment-Track`).
3. Render will automatically detect [`render.yaml`](file:///c:/Users/srima/Downloads/Payment-Track/render.yaml).
4. Set the following environment variables when prompted:
   - `SUPABASE_URL`: `https://rzslgglgpbvjytjqnair.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c2xnZ2xncGJ2anl0anFuYWlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4MzY0NiwiZXhwIjoyMTAyMjU5NjQ2fQ.LZOHc9iv8YlDpRKeZifmUpqwXEtcccr_iafe6VBZf6k`
   - `FRONTEND_URL`: `*` (or your Vercel deployment URL)
5. Click **Apply**.
6. Once deployed, note down your Render service URL (e.g., `https://payment-track-backend.onrender.com`).

### Option B: Manual Web Service on Render
- **Language**: `Node`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

---

## ⚡ Part 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`Payment-Track`).
3. Vercel will automatically detect the [`vercel.json`](file:///c:/Users/srima/Downloads/Payment-Track/vercel.json) configuration.
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `frontend` if deploying frontend repo directly)
   - **Build Command**: `npm --prefix frontend run build` (or `npm run build`)
   - **Output Directory**: `frontend/dist` (or `dist`)
4. Add the following **Environment Variables** in the Vercel project settings:

| Variable Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://rzslgglgpbvjytjqnair.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c2xnZ2xncGJ2anl0anFuYWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODM2NDYsImV4cCI6MjEwMjI1OTY0Nn0.oKpRVARTOBNDRp41YaDztftyGpmbME4QYXcZmtIv_zY` |
| `VITE_BACKEND_URL` | *(Your Render backend URL, e.g. `https://payment-track-backend.onrender.com`)* |

5. Click **Deploy**.
6. Your payment tracker will be live worldwide with SSL and global CDN!

---

## 🔒 Security & Verification
- SPA route rewrites are configured in [`vercel.json`](file:///c:/Users/srima/Downloads/Payment-Track/vercel.json) to prevent 404s on page refresh.
- Real-time WebSockets connect automatically via Supabase Realtime channel subscriptions.
- Backend API includes health check endpoint `/health` for zero-downtime health probes.
