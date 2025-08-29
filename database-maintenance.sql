-- 🗜️ DATABASE MAINTENANCE COMMANDS
-- ⚠️ IMPORTANT: Run these commands SEPARATELY in Supabase SQL Editor
-- These commands cannot run inside transactions

-- 🚨 RUN EACH COMMAND SEPARATELY (One by one):

-- 1. Clean up and analyze ledger_entries table
VACUUM ANALYZE ledger_entries;

-- 2. Clean up and analyze parties table  
VACUUM ANALYZE parties;

-- 3. Clean up and analyze user_settings table
VACUUM ANALYZE user_settings;

-- 4. Reindex ledger_entries table
REINDEX TABLE ledger_entries;

-- 5. Reindex parties table
REINDEX TABLE parties;

-- 6. Reindex user_settings table
REINDEX TABLE user_settings;

-- 7. Check table sizes after maintenance
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 🎯 WHAT THESE COMMANDS DO:
-- VACUUM: Cleans up deleted rows and updates statistics
-- REINDEX: Rebuilds indexes for optimal performance
-- ANALYZE: Updates table statistics for better query planning

-- ⏰ WHEN TO RUN:
-- ✅ After running performance-optimization.sql
-- ✅ When you notice slow performance
-- ✅ After deleting many records
-- ✅ Monthly maintenance (recommended)

-- 🚀 EXPECTED RESULTS:
-- ✅ Faster database queries
-- ✅ Better query planning
-- ✅ Cleaner database structure
-- ✅ Optimized index performance
