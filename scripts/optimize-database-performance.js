/**
 * Database Performance Optimization Script
 * 
 * Based on authenticated testing results showing 1.2-1.5s API response times.
 * This script adds critical database indexes to improve query performance.
 * 
 * Expected improvements:
 * - API response time: 1,200-1,500ms → 200-500ms
 * - Account Ledger/Give LCP: 7,408ms → 3,000ms
 * - Database query time: 80% reduction
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function optimizeDatabasePerformance() {
  console.log('🚀 Starting Database Performance Optimization...');
  console.log('=' * 60);
  
  try {
    // 1. Critical indexes for ledger_entries table
    console.log('📊 Adding indexes for ledger_entries table...');
    
    const ledgerIndexes = [
      // Primary user index (most important)
      {
        name: 'idx_ledger_entries_user_id',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);`
      },
      
      // User + date index for chronological queries
      {
        name: 'idx_ledger_entries_user_date',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date ON ledger_entries(user_id, created_at DESC);`
      },
      
      // User + party index for party-specific queries
      {
        name: 'idx_ledger_entries_user_party',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party ON ledger_entries(user_id, party_name);`
      },
      
      // Transaction type index for filtering
      {
        name: 'idx_ledger_entries_transaction_type',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_type ON ledger_entries(transaction_type);`
      },
      
      // Amount index for financial calculations
      {
        name: 'idx_ledger_entries_amount',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_amount ON ledger_entries(amount);`
      },
      
      // Composite index for party ledger queries (CRITICAL for Account Ledger/Give page)
      {
        name: 'idx_ledger_entries_user_party_date',
        query: `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party_date ON ledger_entries(user_id, party_name, created_at DESC);`
      }
    ];
    
    for (const index of ledgerIndexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index.query });
        if (error) {
          console.log(`⚠️  Index ${index.name}: ${error.message}`);
        } else {
          console.log(`✅ Index ${index.name}: Created successfully`);
        }
      } catch (err) {
        console.log(`❌ Index ${index.name}: ${err.message}`);
      }
    }
    
    // 2. Indexes for parties table
    console.log('\n📊 Adding indexes for parties table...');
    
    const partyIndexes = [
      {
        name: 'idx_parties_user_id',
        query: `CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);`
      },
      {
        name: 'idx_parties_party_name',
        query: `CREATE INDEX IF NOT EXISTS idx_parties_party_name ON parties(party_name);`
      },
      {
        name: 'idx_parties_user_party',
        query: `CREATE INDEX IF NOT EXISTS idx_parties_user_party ON parties(user_id, party_name);`
      }
    ];
    
    for (const index of partyIndexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index.query });
        if (error) {
          console.log(`⚠️  Index ${index.name}: ${error.message}`);
        } else {
          console.log(`✅ Index ${index.name}: Created successfully`);
        }
      } catch (err) {
        console.log(`❌ Index ${index.name}: ${err.message}`);
      }
    }
    
    // 3. Indexes for user_settings table
    console.log('\n📊 Adding indexes for user_settings table...');
    
    const userSettingsIndexes = [
      {
        name: 'idx_user_settings_user_id',
        query: `CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);`
      },
      {
        name: 'idx_user_settings_company_account',
        query: `CREATE INDEX IF NOT EXISTS idx_user_settings_company_account ON user_settings(company_account);`
      }
    ];
    
    for (const index of userSettingsIndexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index.query });
        if (error) {
          console.log(`⚠️  Index ${index.name}: ${error.message}`);
        } else {
          console.log(`✅ Index ${index.name}: Created successfully`);
        }
      } catch (err) {
        console.log(`❌ Index ${index.name}: ${err.message}`);
      }
    }
    
    // 4. Analyze table statistics for query optimization
    console.log('\n📊 Updating table statistics...');
    
    const analyzeTables = [
      'ANALYZE ledger_entries;',
      'ANALYZE parties;',
      'ANALYZE user_settings;'
    ];
    
    for (const analyzeQuery of analyzeTables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: analyzeQuery });
        if (error) {
          console.log(`⚠️  Analyze: ${error.message}`);
        } else {
          console.log(`✅ Analyze: Table statistics updated`);
        }
      } catch (err) {
        console.log(`❌ Analyze: ${err.message}`);
      }
    }
    
    // 5. Test query performance
    console.log('\n🧪 Testing query performance...');
    
    const testQueries = [
      {
        name: 'User Ledger Entries (most common)',
        query: `SELECT * FROM ledger_entries WHERE user_id = 'test-user' ORDER BY created_at DESC LIMIT 50;`
      },
      {
        name: 'Party Summary (dashboard)',
        query: `SELECT party_name, COUNT(*) as count, SUM(amount) as total FROM ledger_entries WHERE user_id = 'test-user' GROUP BY party_name;`
      },
      {
        name: 'Trial Balance (critical page)',
        query: `SELECT p.party_name, COALESCE(SUM(CASE WHEN le.transaction_type = 'debit' THEN le.amount ELSE 0 END), 0) as debit, COALESCE(SUM(CASE WHEN le.transaction_type = 'credit' THEN le.amount ELSE 0 END), 0) as credit FROM parties p LEFT JOIN ledger_entries le ON p.party_name = le.party_name AND p.user_id = le.user_id WHERE p.user_id = 'test-user' GROUP BY p.party_name;`
      }
    ];
    
    for (const test of testQueries) {
      try {
        const startTime = Date.now();
        const { error } = await supabase.rpc('exec_sql', { sql: test.query });
        const duration = Date.now() - startTime;
        
        if (error) {
          console.log(`⚠️  ${test.name}: ${error.message}`);
        } else {
          console.log(`✅ ${test.name}: ${duration}ms (${duration < 100 ? 'Fast' : duration < 500 ? 'Moderate' : 'Slow'})`);
        }
      } catch (err) {
        console.log(`❌ ${test.name}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database optimization completed!');
    console.log('\n📈 Expected Performance Improvements:');
    console.log('   • API Response Time: 1,200-1,500ms → 200-500ms');
    console.log('   • Account Ledger/Give LCP: 7,408ms → 3,000ms');
    console.log('   • Database Query Time: 80% reduction');
    console.log('   • Overall Performance Score: +10-15 points');
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Deploy the optimized backend');
    console.log('   2. Test API performance with new caching');
    console.log('   3. Run authenticated performance tests again');
    console.log('   4. Monitor performance improvements');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    process.exit(1);
  }
}

// Run the optimization
if (require.main === module) {
  optimizeDatabasePerformance().catch(console.error);
}

module.exports = { optimizeDatabasePerformance };
