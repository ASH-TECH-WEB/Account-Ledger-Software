// Database Query Performance Analysis
// This script will help identify the slowest queries

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function analyzeSlowQueries() {
  console.log('🔍 Analyzing slow database queries...\n');
  
  try {
    // Enable query performance monitoring
    await supabase.rpc('enable_query_performance_monitoring');
    
    // Get slow query statistics
    const { data: slowQueries, error } = await supabase
      .from('pg_stat_statements')
      .select('*')
      .order('mean_exec_time', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('⚠️ Could not access pg_stat_statements. Checking alternative metrics...\n');
      
      // Alternative: Check table sizes and indexes
      const { data: tableStats } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_rows')
        .eq('table_schema', 'public');
      
      console.log('📊 Table Statistics:');
      console.log('==================');
      tableStats?.forEach(table => {
        console.log(`${table.table_name}: ${table.table_rows} rows`);
      });
      
    } else {
      console.log('🐌 Top 10 Slowest Queries:');
      console.log('==========================');
      slowQueries?.forEach((query, index) => {
        console.log(`${index + 1}. ${query.query}: ${query.mean_exec_time}ms avg`);
      });
    }
    
    // Check index usage
    const { data: indexUsage } = await supabase
      .from('pg_stat_user_indexes')
      .select('schemaname, tablename, indexname, idx_scan, idx_tup_read')
      .order('idx_scan', { ascending: false });
    
    console.log('\n📈 Index Usage Statistics:');
    console.log('==========================');
    indexUsage?.forEach(index => {
      console.log(`${index.tablename}.${index.indexname}: ${index.idx_scan} scans, ${index.idx_tup_read} tuples read`);
    });
    
    // Test specific queries with timing
    console.log('\n⏱️ Testing Critical Queries:');
    console.log('============================');
    
    const testQueries = [
      {
        name: 'Get all parties for user',
        query: () => supabase.from('parties').select('*').eq('user_id', '05d9bcec-5f53-4e6d-a28a-7291260c280b')
      },
      {
        name: 'Get ledger entries for party',
        query: () => supabase.from('ledger_entries').select('*').eq('party_name', 'Give')
      },
      {
        name: 'Get user settings',
        query: () => supabase.from('user_settings').select('*').eq('user_id', '05d9bcec-5f53-4e6d-a28a-7291260c280b')
      }
    ];
    
    for (const test of testQueries) {
      const start = Date.now();
      const { data, error } = await test.query();
      const duration = Date.now() - start;
      
      if (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: ${duration}ms (${data?.length || 0} records)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeSlowQueries().catch(console.error);
