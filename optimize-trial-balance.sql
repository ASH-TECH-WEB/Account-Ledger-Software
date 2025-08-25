-- Database Optimization Script for Trial Balance Performance
-- Run this script to add indexes for faster trial balance queries

-- Add composite index for user_id + party_name (most common query)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party 
ON ledger_entries(user_id, party_name);

-- Add index for user_id + tns_type (for credit/debit filtering)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_type 
ON ledger_entries(user_id, tns_type);

-- Add index for user_id + date (for chronological ordering)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date 
ON ledger_entries(user_id, date);

-- Add index for party_name (for party-specific queries)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_name 
ON ledger_entries(party_name);

-- Add partial index for credit transactions (only where credit > 0)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_credit_positive 
ON ledger_entries(user_id, party_name) 
WHERE credit > 0 AND tns_type = 'CR';

-- Add partial index for debit transactions (only where debit > 0)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_debit_positive 
ON ledger_entries(user_id, party_name) 
WHERE debit > 0 AND tns_type = 'DR';

-- Analyze tables to update statistics
ANALYZE ledger_entries;

-- Show index information
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'ledger_entries'
ORDER BY indexname;
