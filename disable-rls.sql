-- Disable RLS for testing
-- Run this in your Supabase SQL editor

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on parties table  
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;

-- Disable RLS on ledger_entries table
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
