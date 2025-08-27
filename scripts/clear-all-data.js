/**
 * Clear All Data Script
 * This script will permanently delete ALL data from the database
 * WARNING: This action cannot be undone!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please check SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
  console.log('🚨 WARNING: This will delete ALL data from the database!');
  console.log('This action cannot be undone!');
  console.log('');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('Type "YES DELETE ALL" to confirm: ', resolve);
  });
  rl.close();

  if (answer !== 'YES DELETE ALL') {
    console.log('❌ Operation cancelled');
    process.exit(0);
  }

  console.log('');
  console.log('🗑️  Starting data deletion...');
  console.log('');

  try {
    // 1. Clear all ledger entries/transactions
    console.log('📊 Clearing ledger entries...');
    const { error: ledgerError } = await supabase
      .rpc('exec_sql', { sql_query: 'DELETE FROM ledger_entries' });
    
    if (ledgerError) {
      console.error('❌ Error clearing ledger entries:', ledgerError);
      // Try alternative method
      console.log('🔄 Trying alternative method...');
      const { error: altError } = await supabase
        .from('ledger_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (altError) {
        console.error('❌ Alternative method also failed:', altError);
      } else {
        console.log('✅ Ledger entries cleared (alternative method)');
      }
    } else {
      console.log('✅ Ledger entries cleared');
    }

    // 2. Clear all parties
    console.log('👥 Clearing parties...');
    const { error: partiesError } = await supabase
      .rpc('exec_sql', { sql_query: 'DELETE FROM parties' });
    
    if (partiesError) {
      console.error('❌ Error clearing parties:', partiesError);
      // Try alternative method
      console.log('🔄 Trying alternative method...');
      const { error: altError } = await supabase
        .from('parties')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (altError) {
        console.error('❌ Alternative method also failed:', altError);
      } else {
        console.log('✅ Parties cleared (alternative method)');
      }
    } else {
      console.log('✅ Parties cleared');
    }

    // 3. Clear all user settings
    console.log('⚙️  Clearing user settings...');
    const { error: settingsError } = await supabase
      .rpc('exec_sql', { sql_query: 'DELETE FROM user_settings' });
    
    if (settingsError) {
      console.error('❌ Error clearing user settings:', settingsError);
      // Try alternative method
      console.log('🔄 Trying alternative method...');
      const { error: altError } = await supabase
        .from('user_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (altError) {
        console.error('❌ Alternative method also failed:', altError);
      } else {
        console.log('✅ User settings cleared (alternative method)');
      }
    } else {
      console.log('✅ User settings cleared');
    }

    // 4. Clear all users
    console.log('👤 Clearing users...');
    const { error: usersError } = await supabase
      .rpc('exec_sql', { sql_query: 'DELETE FROM users' });
    
    if (usersError) {
      console.error('❌ Error clearing users:', usersError);
      // Try alternative method
      console.log('🔄 Trying alternative method...');
      const { error: altError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (altError) {
        console.error('❌ Alternative method also failed:', altError);
      } else {
        console.log('✅ Users cleared (alternative method)');
      }
    } else {
      console.log('✅ Users cleared');
    }

    console.log('');
    console.log('🎉 Data deletion completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. You will need to register a new user account');
    console.log('2. The application will be completely fresh');
    console.log('3. All previous data is permanently deleted');
    console.log('');
    console.log('⚠️  Remember: This action cannot be undone!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
clearAllData();
