-- Database Performance Indexes
-- Run this in Supabase SQL Editor for optimal performance

-- 1. Ledger Entries Table Indexes (using actual schema)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_name ON ledger_entries(party_name);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date ON ledger_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_date ON ledger_entries(party_name, date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party ON ledger_entries(user_id, party_name);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tns_type ON ledger_entries(tns_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at);

-- 2. Parties Table Indexes (using actual schema)
CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_party_name ON parties(party_name);
CREATE INDEX IF NOT EXISTS idx_parties_user_party_name ON parties(user_id, party_name);
CREATE INDEX IF NOT EXISTS idx_parties_created_at ON parties(created_at);

-- 3. Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 4. Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_tns_type_date ON ledger_entries(user_id, tns_type, date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_tns_type_date ON ledger_entries(party_name, tns_type, date);

-- 5. Partial Indexes for Active Records
CREATE INDEX IF NOT EXISTS idx_ledger_entries_active ON ledger_entries(user_id, date) WHERE is_old_record = false;
CREATE INDEX IF NOT EXISTS idx_parties_active ON parties(user_id, party_name) WHERE status = 'R';

-- 6. Text Search Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_entries_remarks_gin ON ledger_entries USING gin(to_tsvector('english', remarks));
CREATE INDEX IF NOT EXISTS idx_parties_party_name_gin ON parties USING gin(to_tsvector('english', party_name));

-- 7. Statistics Update
ANALYZE ledger_entries;
ANALYZE parties;
ANALYZE users;

-- 8. Query Performance Monitoring
-- Check index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;
