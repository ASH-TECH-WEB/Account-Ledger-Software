/**
 * Database Performance Optimization Script
 * 
 * Creates essential database indexes to improve query performance
 * from 1+ seconds to milliseconds.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database indexes to create
const indexes = [
  // Ledger Entries Table Indexes
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_name ON ledger_entries(party_name)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date ON ledger_entries(user_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_date ON ledger_entries(party_name, date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party ON ledger_entries(user_id, party_name)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_tns_type ON ledger_entries(tns_type)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at)',
  
  // Parties Table Indexes
  'CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_parties_party_name ON parties(party_name)',
  'CREATE INDEX IF NOT EXISTS idx_parties_user_party_name ON parties(user_id, party_name)',
  'CREATE INDEX IF NOT EXISTS idx_parties_created_at ON parties(created_at)',
  
  // Users Table Indexes
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)',
  'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
  
  // Composite Indexes for Common Queries
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_tns_type_date ON ledger_entries(user_id, tns_type, date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_tns_type_date ON ledger_entries(party_name, tns_type, date)',
  
  // Partial Indexes for Active Records
  'CREATE INDEX IF NOT EXISTS idx_ledger_entries_active ON ledger_entries(user_id, date) WHERE is_old_record = false',
  'CREATE INDEX IF NOT EXISTS idx_parties_active ON parties(user_id, party_name) WHERE status = \'R\'',
  
  // Statistics Update
  'ANALYZE ledger_entries',
  'ANALYZE parties',
  'ANALYZE users'
];

async function createIndexes() {
  console.log('🚀 Starting database optimization...');
  console.log(`📊 Creating ${indexes.length} indexes...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < indexes.length; i++) {
    const indexQuery = indexes[i];
    const indexName = indexQuery.match(/idx_\w+/)?.[0] || `index_${i + 1}`;
    
    try {
      console.log(`⏳ Creating ${indexName}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: indexQuery
      });
      
      if (error) {
        console.error(`❌ Failed to create ${indexName}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Created ${indexName}`);
        successCount++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`❌ Error creating ${indexName}:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Optimization Results:');
  console.log(`✅ Successfully created: ${successCount} indexes`);
  console.log(`❌ Failed to create: ${errorCount} indexes`);
  
  if (successCount > 0) {
    console.log('\n🎉 Database optimization completed!');
    console.log('📈 Expected performance improvement: 80-90% faster queries');
    console.log('⚡ API response times should drop from 1+ seconds to <200ms');
  }
  
  if (errorCount > 0) {
    console.log('\n⚠️ Some indexes failed to create. Check the errors above.');
    console.log('💡 You may need to run these manually in Supabase SQL Editor');
  }
}

// Run the optimization
createIndexes().catch(console.error);
