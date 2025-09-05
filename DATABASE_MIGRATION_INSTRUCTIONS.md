# Database Migration Instructions - User Approval System

## Problem
The admin dashboard is showing a 500 error because the database is missing the approval system columns.

## Solution
You need to run the following SQL commands in your Supabase SQL editor to add the required columns.

## Steps

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Go to SQL Editor

2. **Run the following SQL commands:**

```sql
-- Add approval system columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_account VARCHAR(255);

-- Update existing users to be approved (so they don't lose access)
UPDATE users SET is_approved = TRUE, approved_at = NOW() WHERE is_approved IS NULL OR is_approved = FALSE;
```

3. **Verify the migration:**
   ```sql
   SELECT id, email, is_approved, approved_at, status FROM users LIMIT 5;
   ```

## What this does:
- Adds all required columns for the approval system
- Sets existing users as approved so they don't lose access
- New users will be created as unapproved by default
- Admin can approve/disapprove users from the dashboard

## After running the SQL:
- The admin dashboard will work correctly
- New users will need approval before they can login
- Existing users will continue to have access
- Admin can manage user approvals from the dashboard

## Testing:
After running the SQL, test the admin dashboard at:
https://escrow-account-ledger.web.app/admin/dashboard

The 500 error should be resolved and you should see the pending users management interface.
