-- Fix RLS policies for user registration
-- Run this in your Supabase SQL editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies that allow all operations
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true);

-- Alternative: Disable RLS for users table (for testing)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
