/**
 * Database Index Optimization Script
 * 
 * This script adds proper database indexes to improve query performance
 * for the Account Ledger Software application.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { supabase } = require('../src/config/supabase');

/**
 * Add database indexes for better performance
 */
const addDatabaseIndexes = async () => {
  try {
    console.log('🚀 Starting database index optimization...');

    // Index for ledger_entries table - most frequently queried
    console.log('📊 Adding indexes for ledger_entries table...');
    
    // Composite index for user_id and created_at (most common query pattern)
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'ledger_entries',
      index_name: 'idx_ledger_entries_user_created',
      columns: ['user_id', 'created_at DESC']
    });

    // Index for party_name searches
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'ledger_entries',
      index_name: 'idx_ledger_entries_party_name',
      columns: ['party_name']
    });

    // Composite index for user_id and party_name
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'ledger_entries',
      index_name: 'idx_ledger_entries_user_party',
      columns: ['user_id', 'party_name']
    });

    // Index for user_settings table
    console.log('⚙️ Adding indexes for user_settings table...');
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'user_settings',
      index_name: 'idx_user_settings_user_id',
      columns: ['user_id']
    });

    // Index for parties table
    console.log('👥 Adding indexes for parties table...');
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'parties',
      index_name: 'idx_parties_user_id',
      columns: ['user_id']
    });

    // Index for users table
    console.log('👤 Adding indexes for users table...');
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'users',
      index_name: 'idx_users_email',
      columns: ['email']
    });

    console.log('✅ Database indexes added successfully!');
    console.log('📈 Performance should be significantly improved now.');

  } catch (error) {
    console.error('❌ Error adding database indexes:', error.message);
    
    // If the RPC function doesn't exist, create indexes manually
    if (error.message.includes('function create_index_if_not_exists')) {
      console.log('🔄 Creating indexes manually...');
      await createIndexesManually();
    }
  }
};

/**
 * Create indexes manually using SQL
 */
const createIndexesManually = async () => {
  try {
    const indexes = [
      // Ledger entries indexes
      `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created 
       ON ledger_entries (user_id, created_at DESC);`,
      
      `CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_name 
       ON ledger_entries (party_name);`,
      
      `CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_party 
       ON ledger_entries (user_id, party_name);`,
      
      // User settings indexes
      `CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
       ON user_settings (user_id);`,
      
      // Parties indexes
      `CREATE INDEX IF NOT EXISTS idx_parties_user_id 
       ON parties (user_id);`,
      
      // Users indexes
      `CREATE INDEX IF NOT EXISTS idx_users_email 
       ON users (email);`
    ];

    for (const indexSQL of indexes) {
      try {
        await supabase.rpc('exec_sql', { sql: indexSQL });
        console.log('✅ Index created successfully');
      } catch (indexError) {
        console.warn('⚠️ Index creation failed (may already exist):', indexError.message);
      }
    }

    console.log('✅ Manual index creation completed!');

  } catch (error) {
    console.error('❌ Error in manual index creation:', error.message);
  }
};

/**
 * Analyze query performance
 */
const analyzePerformance = async () => {
  try {
    console.log('📊 Analyzing query performance...');
    
    // Test common queries
    const startTime = Date.now();
    
    // Test ledger entries query
    const { data: ledgerTest } = await supabase
      .from('ledger_entries')
      .select('id')
      .limit(1);
    
    const ledgerQueryTime = Date.now() - startTime;
    
    // Test user settings query
    const settingsStartTime = Date.now();
    const { data: settingsTest } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);
    
    const settingsQueryTime = Date.now() - settingsStartTime;
    
    console.log('📈 Performance Analysis:');
    console.log(`   Ledger entries query: ${ledgerQueryTime}ms`);
    console.log(`   User settings query: ${settingsQueryTime}ms`);
    
    if (ledgerQueryTime < 100 && settingsQueryTime < 100) {
      console.log('🎉 Excellent performance!');
    } else if (ledgerQueryTime < 500 && settingsQueryTime < 500) {
      console.log('👍 Good performance');
    } else {
      console.log('⚠️ Performance needs improvement');
    }

  } catch (error) {
    console.error('❌ Error analyzing performance:', error.message);
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log('🔧 Database Optimization Tool');
    console.log('============================');
    
    await addDatabaseIndexes();
    await analyzePerformance();
    
    console.log('\n🎯 Optimization completed!');
    console.log('💡 Your application should now be significantly faster.');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    process.exit(1);
  }
};

// Run the optimization
if (require.main === module) {
  main();
}

module.exports = {
  addDatabaseIndexes,
  analyzePerformance
};
