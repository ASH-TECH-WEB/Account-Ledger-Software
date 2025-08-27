-- Clear All Data Script
-- This script will permanently delete ALL data from the database
-- WARNING: This action cannot be undone!

-- Clear all transactions/ledger entries
DELETE FROM ledger_entries;

-- Clear all parties
DELETE FROM parties;

-- Clear all user settings
DELETE FROM user_settings;

-- Clear all users (this will log you out and require new registration)
DELETE FROM users;

-- Reset auto-increment counters (if using them)
-- Note: Supabase handles this automatically, but included for completeness

-- Verify tables are empty
SELECT 'ledger_entries' as table_name, COUNT(*) as count FROM ledger_entries
UNION ALL
SELECT 'parties' as table_name, COUNT(*) as count FROM parties
UNION ALL
SELECT 'user_settings' as table_name, COUNT(*) as count FROM user_settings
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;
