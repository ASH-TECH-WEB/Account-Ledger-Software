/**
 * Cleanup Duplicate Entries Script
 * 
 * This script will:
 * 1. Delete all entries with "Commission Auto-calculated" remarks
 * 2. Delete all entries with "Transaction with" remarks
 * 3. Keep only original transactions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Main function to cleanup duplicate entries
const cleanupDuplicates = async () => {
  console.log('🚀 Starting to cleanup duplicate entries...');
  
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
      
      // Delete all entries with "Commission Auto-calculated" remarks
      const { data: commissionEntries, error: commissionError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, party_name, credit, debit')
        .eq('user_id', user.id)
        .like('remarks', 'Commission Auto-calculated%')
        .eq('is_old_record', false);

      if (commissionError) {
        console.error(`❌ Error fetching commission entries for user ${user.id}:`, commissionError);
        continue;
      }

      // Delete all entries with "Transaction with" remarks
      const { data: transactionEntries, error: transactionError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, party_name, credit, debit')
        .eq('user_id', user.id)
        .like('remarks', 'Transaction with%')
        .eq('is_old_record', false);

      if (transactionError) {
        console.error(`❌ Error fetching transaction entries for user ${user.id}:`, transactionError);
        continue;
      }

      console.log(`📊 Found ${commissionEntries.length} commission entries to delete`);
      console.log(`📊 Found ${transactionEntries.length} transaction entries to delete`);

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

      // Delete Transaction entries
      if (transactionEntries.length > 0) {
        const transactionIds = transactionEntries.map(entry => entry.id);
        const { error: deleteTransactionError } = await supabase
          .from('ledger_entries')
          .delete()
          .in('id', transactionIds);

        if (deleteTransactionError) {
          console.error(`❌ Error deleting transaction entries for user ${user.id}:`, deleteTransactionError);
        } else {
          console.log(`✅ Deleted ${transactionEntries.length} transaction entries for user ${user.name}`);
          totalDeleted += transactionEntries.length;
        }
      }

      console.log(`✅ Completed processing user ${user.name}`);
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log(`📊 Total entries deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Cleanup script error:', error);
  }
};

// Run the script
cleanupDuplicates()
  .then(() => {
    console.log('✅ Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
