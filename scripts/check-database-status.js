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
  try {
    // 1. Check ledger entries
    const { data: ledgerData, error: ledgerError, count: ledgerCount } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });
    
    if (ledgerError) {
      console.error('❌ Error checking ledger_entries:', ledgerError);
    } else {
      if (ledgerData && ledgerData.length > 0) {
        ledgerData.slice(0, 3).forEach((entry, index) => {
          `);
        });
      }
    }

    // 2. Check parties
    const { data: partiesData, error: partiesError, count: partiesCount } = await supabase
      .from('parties')
      .select('*', { count: 'exact', head: true });
    
    if (partiesError) {
      console.error('❌ Error checking parties:', partiesError);
    } else {
      if (partiesData && partiesData.length > 0) {
        partiesData.slice(0, 3).forEach((party, index) => {
          `);
        });
      }
    }

    // 3. Check user settings
    const { data: settingsData, error: settingsError, count: settingsCount } = await supabase
      .from('user_settings')
      .select('*', { count: 'exact', head: true });
    
    if (settingsError) {
      console.error('❌ Error checking user_settings:', settingsError);
    } else {
      if (settingsData && settingsData.length > 0) {
        settingsData.slice(0, 3).forEach((setting, index) => {
          });
      }
    }

    // 4. Check users
    const { data: usersData, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      console.error('❌ Error checking users:', usersError);
    } else {
      if (usersData && usersData.length > 0) {
        usersData.slice(0, 3).forEach((user, index) => {
          `);
        });
      }
    }

    if ((ledgerCount || 0) === 0 && (partiesCount || 0) === 0 && 
        (settingsCount || 0) === 0 && (usersCount || 0) === 0) {
      } else {
      }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
checkDatabaseStatus();
