-- Google Authentication Database Schema Update
-- Run this script in your Supabase SQL editor

-- Add Google authentication fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create unique index for google_id (allows multiple NULL values)
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Create index for auth_provider
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- Create index for email_verified
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Update existing users to have email_verified = true
UPDATE users SET email_verified = TRUE WHERE email IS NOT NULL;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Add RLS policies for Google users
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow insertion of new users (for registration)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (without sequence - Supabase handles this automatically)
GRANT ALL ON users TO authenticated;
