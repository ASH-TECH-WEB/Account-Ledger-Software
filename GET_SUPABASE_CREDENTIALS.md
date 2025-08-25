# 🔑 Supabase Credentials Setup Guide

## 🚨 **URGENT: Fix Connection Issues**

Your server is failing to connect because the Supabase credentials are placeholders. Follow these steps:

### 📋 **Step 1: Get Supabase Anon Key**

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Login to your account
   - Select project: `fwbizsvzkwzfahvgnegr`

2. **Navigate to API Settings:**
   - Click on **Settings** in the left sidebar
   - Click on **API** tab

3. **Copy the Anon Key:**
   - Find the **"anon public"** key
   - Copy the entire key (it starts with `eyJ...`)

### 📋 **Step 2: Update .env File**

Replace the placeholder in your `.env` file:

```env
# OLD (placeholder)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Yml6c3Z6a3d6ZmFodmduZWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# NEW (your actual key)
SUPABASE_ANON_KEY=your-actual-anon-key-from-dashboard
```

### 📋 **Step 3: Get PostgreSQL Password**

1. **Go to Database Settings:**
   - In Supabase dashboard, click **Settings** → **Database**

2. **Find Connection String:**
   - Look for **"Connection string"** section
   - Copy the password from the connection string

3. **Update POSTGRES_URL:**
   ```env
   POSTGRES_URL=postgresql://postgres:YOUR-ACTUAL-PASSWORD@db.fwbizsvzkwzfahvgnegr.supabase.co:5432/postgres
   ```

### 🧪 **Step 4: Test Connection**

After updating credentials:

```bash
npm run dev
```

### ✅ **Expected Output:**
```
🚀 Server running on port 5000
🗄️ Supabase: Connected
🗄️ PostgreSQL: Connected
```

### 🆘 **If Still Failing:**

1. **Check Project Status:**
   - Go to Supabase dashboard
   - Check if project is active

2. **Verify Database:**
   - Go to **Table Editor**
   - Check if tables exist

3. **Check RLS Policies:**
   - Go to **Authentication** → **Policies**
   - Ensure policies are set to `USING (true)`

### 📞 **Need Help?**
- Supabase Documentation: https://supabase.com/docs
- Project URL: https://supabase.com/dashboard/project/fwbizsvzkwzfahvgnegr
