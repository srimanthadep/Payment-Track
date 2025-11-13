# Deploying Edge Functions - Instructions

## Option 1: Deploy via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**
   - Go to: **Edge Functions** in the left sidebar
   - Or go directly to: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/functions

3. **Deploy the send-otp function**
   - Click **"Create a new function"** or find the existing function
   - Function name: `send-otp`
   - Copy the contents of `supabase/functions/send-otp/index.ts` into the editor
   - Click **Deploy**

4. **Set Environment Variables (Secrets)**
   - Go to: **Project Settings** → **Edge Functions** → **Secrets**
   - Add these secrets:
     - `SUPABASE_URL` = Your project URL (found in Project Settings → API)
     - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (found in Project Settings → API)

## Option 2: Install Supabase CLI and Deploy

### For Windows (using Scoop):
```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Then deploy:
```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref lxlhszovqelgpqtvnpvx

# Deploy the function
supabase functions deploy send-otp

# Set secrets
supabase secrets set SUPABASE_URL=your_project_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Option 3: Quick Fix - Use Supabase Dashboard

The easiest way is to:
1. Go to https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/functions
2. Create/edit the `send-otp` function
3. Copy-paste the code from `supabase/functions/send-otp/index.ts`
4. Deploy
5. Add secrets in Project Settings → Edge Functions → Secrets

## Testing

After deployment, test the function:
1. Go to your app
2. Try to send an OTP
3. Check the error message - it should now tell you exactly what's missing

## Getting Your Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/lxlhszovqelgpqtvnpvx/settings/api
2. Copy:
   - **Project URL** → Use as `SUPABASE_URL`
   - **service_role key** → Use as `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Notes

- Make sure to set all required secrets before testing in production

