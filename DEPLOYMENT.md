# Payment Tracker - Deployment Guide

This repository is configured for deployment on **Vercel** (frontend) with **Supabase** handling the backend, database, and authentication.

---

## ⚡ Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`Payment-Track`).
3. Vercel will automatically detect the `vercel.json` configuration.
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm --prefix frontend run build`
   - **Output Directory**: `frontend/dist`
4. Add the following **Environment Variables** in the Vercel project settings:

| Variable Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `<your-supabase-project-url>` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `<your-supabase-anon-key>` |
| `VITE_BACKEND_URL` | `<your-backend-url>` (if using a custom backend) |

5. Click **Deploy**.
6. Your payment tracker will be live worldwide with SSL and global CDN!

---

## 🗄️ Supabase Setup

1. Create a project at [supabase.com](https://supabase.com/).
2. Run your database schema setup via the Supabase SQL Editor or Dashboard.
3. Copy your **Project URL** and **Anon Key** from **Settings > API** and set them as Vercel environment variables above.

---

## 🔒 Security Notes

- **Never commit API keys or secrets to your repository.** Use environment variables in your hosting platform.
- SPA route rewrites are configured in `vercel.json` to prevent 404s on page refresh.
- Real-time WebSockets connect automatically via Supabase Realtime channel subscriptions.
- Backend API includes health check endpoint `/health` for zero-downtime health probes.
