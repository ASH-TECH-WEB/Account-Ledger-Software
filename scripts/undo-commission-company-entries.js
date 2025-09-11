/**
 * Undo Commission and Company Entries Script
 * 
 * This script will:
 * 1. Delete all Commission and Company party entries that were created by the previous script
 * 2. Only delete entries with "Commission Auto-calculated" or "Transaction with" remarks
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Main function to undo the entries
const undoEntries = async () => {
  console.log('🚀 Starting to undo Commission and Company entries...');
  
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
      
      // Delete Commission entries with "Commission Auto-calculated" remarks
      const { data: commissionEntries, error: commissionError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, credit, debit')
        .eq('user_id', user.id)
        .eq('party_name', 'Commission')
        .like('remarks', 'Commission Auto-calculated%')
        .eq('is_old_record', false);

      if (commissionError) {
        console.error(`❌ Error fetching commission entries for user ${user.id}:`, commissionError);
        continue;
      }

      // Delete Company entries with "Transaction with" remarks
      const { data: companyEntries, error: companyError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, credit, debit')
        .eq('user_id', user.id)
        .eq('party_name', companyName)
        .like('remarks', 'Transaction with%')
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

    console.log('\n🎉 Undo script completed successfully!');
    console.log(`📊 Total entries deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Undo script error:', error);
  }
};

// Run the script
undoEntries()
  .then(() => {
    console.log('✅ Undo script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Undo script failed:', error);
    process.exit(1);
  });
