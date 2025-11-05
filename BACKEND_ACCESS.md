# How to Access Your Backend

Your backend is powered by **Supabase**. Here's how to access all parts of it:

## 🎯 Quick Access Links

### Main Dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Your Project**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx
- **Project ID**: `lxlhszovqelgpqtvnpvx`

## 📊 Backend Components

### 1. **Database (Tables & Data)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/editor

**What you can do:**
- View all tables (transactions, profiles, portals, user_roles, etc.)
- Browse and edit data
- Run SQL queries
- View table relationships

**Key Tables:**
- `transactions` - All payment transactions
- `profiles` - User profiles
- `portals` - Payment portals (PayMama, PaysWith, etc.)
- `user_roles` - Admin/user roles
- `otp_verifications` - OTP codes for phone auth
- `scraping_configs` - Web scraping configurations

### 2. **Edge Functions (Serverless Functions)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/functions

**Functions:**
- `send-otp` - Sends OTP via SMS/WhatsApp
- `verify-otp` - Verifies OTP codes
- `scrape-website` - Scrapes websites for transaction data

**What you can do:**
- View/edit function code
- Deploy functions
- View function logs
- Set environment variables/secrets

### 3. **API Settings (Keys & URLs)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/settings/api

**You'll find:**
- **Project URL**: `https://lxlhszovqelgpqtvnpvx.supabase.co`
- **anon/public key**: Used in frontend (safe to expose)
- **service_role key**: Used in Edge Functions (KEEP SECRET!)
- **API Documentation**: Auto-generated API docs

### 4. **Authentication (Users & Sessions)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/auth/users

**What you can do:**
- View all users
- Manage user sessions
- Configure auth providers
- View user activity logs

### 5. **Storage (File Storage)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/storage/buckets

**What you can do:**
- Upload/download files
- Manage file buckets
- Set up storage policies

### 6. **Logs & Monitoring**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/logs

**What you can do:**
- View API logs
- View Edge Function logs
- Monitor errors
- View database query logs

### 7. **SQL Editor**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/sql/new

**What you can do:**
- Run custom SQL queries
- View query results
- Save frequently used queries

### 8. **Edge Function Secrets (Environment Variables)**
**Access**: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/settings/functions

**Set these secrets:**
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `TWILIO_ACCOUNT_SID` - For SMS (optional)
- `TWILIO_AUTH_TOKEN` - For SMS (optional)
- `TWILIO_PHONE_NUMBER` - For SMS (optional)

## 🔑 Getting Your Credentials

### Step 1: Get API Keys
1. Go to: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/settings/api
2. Copy:
   - **Project URL** (e.g., `https://lxlhszovqelgpqtvnpvx.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep secret!)

### Step 2: Set Environment Variables Locally
Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://lxlhszovqelgpqtvnpvx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

## 📡 API Endpoints

### REST API
Your Supabase project automatically generates REST APIs:

**Base URL**: `https://lxlhszovqelgpqtvnpvx.supabase.co/rest/v1/`

**Example endpoints:**
- `GET /rest/v1/transactions` - Get all transactions
- `GET /rest/v1/profiles` - Get all profiles
- `POST /rest/v1/transactions` - Create a transaction

**Headers required:**
```
apikey: your_anon_key
Authorization: Bearer your_anon_key
```

### Edge Functions API
**Base URL**: `https://lxlhszovqelgpqtvnpvx.supabase.co/functions/v1/`

**Endpoints:**
- `POST /functions/v1/send-otp` - Send OTP
- `POST /functions/v1/verify-otp` - Verify OTP
- `POST /functions/v1/scrape-website` - Scrape website

## 🔧 Local Development

### Using Supabase CLI (Optional)

If you want to run Supabase locally:

```bash
# Install Supabase CLI (Windows - using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Login
supabase login

# Link your project
supabase link --project-ref lxlhszovqelgpqtvnpvx

# Start local Supabase (requires Docker)
supabase start
```

## 📝 Quick Reference

| Component | URL |
|-----------|-----|
| Dashboard | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx |
| Database | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/editor |
| Edge Functions | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/functions |
| API Settings | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/settings/api |
| Auth Users | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/auth/users |
| Logs | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/logs |
| SQL Editor | https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/sql/new |

## 🚀 Next Steps

1. **Login to Supabase Dashboard** using your account
2. **Go to your project** (link above)
3. **Check Edge Functions** to deploy `send-otp`
4. **Set Secrets** in Project Settings → Edge Functions → Secrets
5. **View Database** to see your data

## ❓ Troubleshooting

**Can't access dashboard?**
- Make sure you're logged in to Supabase
- Check if you have access to the project
- Contact your project owner if needed

**Need API keys?**
- Go to Project Settings → API
- Copy the keys from there

**Function not working?**
- Check Edge Function logs in the dashboard
- Verify secrets are set correctly
- Check the function code is deployed

