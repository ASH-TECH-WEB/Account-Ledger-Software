/**
 * Clear Commission and Company Entries Script
 * 
 * This script will:
 * 1. Delete all Commission party entries
 * 2. Delete all Company party entries (Sad/AQC)
 * 3. Keep only original transactions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Main function to clear commission and company entries
const clearCommissionCompanyEntries = async () => {
  console.log('🚀 Starting to clear Commission and Company entries...');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, company_account')
      .eq('is_approved', true);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.length} approved users`);

    let totalDeleted = 0;

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      const companyName = user.company_account || 'AQC';
      
      // Delete all Commission entries
      const { data: commissionEntries, error: commissionError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, party_name, credit, debit')
        .eq('user_id', user.id)
        .eq('party_name', 'Commission')
        .eq('is_old_record', false);

      if (commissionError) {
        console.error(`❌ Error fetching commission entries for user ${user.id}:`, commissionError);
        continue;
      }

      // Delete all Company entries
      const { data: companyEntries, error: companyError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, party_name, credit, debit')
        .eq('user_id', user.id)
        .eq('party_name', companyName)
        .eq('is_old_record', false);

      if (companyError) {
        console.error(`❌ Error fetching company entries for user ${user.id}:`, companyError);
        continue;
      }

      console.log(`📊 Found ${commissionEntries.length} commission entries to delete`);
      console.log(`📊 Found ${companyEntries.length} company entries to delete`);

      // Delete Commission entries
      if (commissionEntries.length > 0) {
        const commissionIds = commissionEntries.map(entry => entry.id);
        const { error: deleteCommissionError } = await supabase
          .from('ledger_entries')
          .delete()
          .in('id', commissionIds);

        if (deleteCommissionError) {
          console.error(`❌ Error deleting commission entries for user ${user.id}:`, deleteCommissionError);
        } else {
          console.log(`✅ Deleted ${commissionEntries.length} commission entries for user ${user.name}`);
          totalDeleted += commissionEntries.length;
        }
      }

      // Delete Company entries
      if (companyEntries.length > 0) {
        const companyIds = companyEntries.map(entry => entry.id);
        const { error: deleteCompanyError } = await supabase
          .from('ledger_entries')
          .delete()
          .in('id', companyIds);

        if (deleteCompanyError) {
          console.error(`❌ Error deleting company entries for user ${user.id}:`, deleteCompanyError);
        } else {
          console.log(`✅ Deleted ${companyEntries.length} company entries for user ${user.name}`);
          totalDeleted += companyEntries.length;
        }
      }

      console.log(`✅ Completed processing user ${user.name}`);
    }

    console.log('\n🎉 Clear script completed successfully!');
    console.log(`📊 Total entries deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Clear script error:', error);
  }
};

// Run the script
clearCommissionCompanyEntries()
  .then(() => {
    console.log('✅ Clear script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clear script failed:', error);
    process.exit(1);
  });
