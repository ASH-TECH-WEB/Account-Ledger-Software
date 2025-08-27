/**
 * Database Status Check Script
 * This script will check the current status of all tables
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

async function checkDatabaseStatus() {
  console.log('🔍 Checking Database Status...');
  console.log('');

  try {
    // 1. Check ledger entries
    console.log('📊 Checking ledger_entries table...');
    const { data: ledgerData, error: ledgerError, count: ledgerCount } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });
    
    if (ledgerError) {
      console.error('❌ Error checking ledger_entries:', ledgerError);
    } else {
      console.log(`   📈 Total ledger entries: ${ledgerCount || 0}`);
      if (ledgerData && ledgerData.length > 0) {
        console.log('   📝 Sample entries:');
        ledgerData.slice(0, 3).forEach((entry, index) => {
          console.log(`      ${index + 1}. ${entry.partyName} - ₹${entry.amount} (${entry.tnsType})`);
        });
      }
    }

    console.log('');

    // 2. Check parties
    console.log('👥 Checking parties table...');
    const { data: partiesData, error: partiesError, count: partiesCount } = await supabase
      .from('parties')
      .select('*', { count: 'exact', head: true });
    
    if (partiesError) {
      console.error('❌ Error checking parties:', partiesError);
    } else {
      console.log(`   📈 Total parties: ${partiesCount || 0}`);
      if (partiesData && partiesData.length > 0) {
        console.log('   📝 Sample parties:');
        partiesData.slice(0, 3).forEach((party, index) => {
          console.log(`      ${index + 1}. ${party.party_name} (${party.sr_no})`);
        });
      }
    }

    console.log('');

    // 3. Check user settings
    console.log('⚙️  Checking user_settings table...');
    const { data: settingsData, error: settingsError, count: settingsCount } = await supabase
      .from('user_settings')
      .select('*', { count: 'exact', head: true });
    
    if (settingsError) {
      console.error('❌ Error checking user_settings:', settingsError);
    } else {
      console.log(`   📈 Total user settings: ${settingsCount || 0}`);
      if (settingsData && settingsData.length > 0) {
        console.log('   📝 Sample settings:');
        settingsData.slice(0, 3).forEach((setting, index) => {
          console.log(`      ${index + 1}. User ID: ${setting.user_id} - Company: ${setting.company_account || 'Not set'}`);
        });
      }
    }

    console.log('');

    // 4. Check users
    console.log('👤 Checking users table...');
    const { data: usersData, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      console.error('❌ Error checking users:', usersError);
    } else {
      console.log(`   📈 Total users: ${usersCount || 0}`);
      if (usersData && usersData.length > 0) {
        console.log('   📝 Sample users:');
        usersData.slice(0, 3).forEach((user, index) => {
          console.log(`      ${index + 1}. ${user.fullname} (${user.email})`);
        });
      }
    }

    console.log('');
    console.log('📊 Database Status Summary:');
    console.log('============================');
    console.log(`📈 Ledger Entries: ${ledgerCount || 0}`);
    console.log(`👥 Parties: ${partiesCount || 0}`);
    console.log(`⚙️  User Settings: ${settingsCount || 0}`);
    console.log(`👤 Users: ${usersCount || 0}`);
    console.log('');

    if ((ledgerCount || 0) === 0 && (partiesCount || 0) === 0 && 
        (settingsCount || 0) === 0 && (usersCount || 0) === 0) {
      console.log('🎉 Database is completely empty! All data has been successfully cleared.');
      console.log('✅ Ready for fresh start!');
    } else {
      console.log('⚠️  Some data still exists in the database.');
      console.log('🔄 You may need to run the clear script again.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
checkDatabaseStatus();
