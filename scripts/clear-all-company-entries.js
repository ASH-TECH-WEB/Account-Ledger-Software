/**
 * Clear All Company Entries Script
 * 
 * This script will:
 * 1. Delete ALL entries from Company parties (Sad, AQC, etc.)
 * 2. Keep only Take, Give, and other non-company parties
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Main function to clear all company entries
const clearAllCompanyEntries = async () => {
  console.log('🚀 Starting to clear ALL Company entries...');
  
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
      
      // Get ALL entries for this user
      const { data: allEntries, error: allEntriesError } = await supabase
        .from('ledger_entries')
        .select('id, remarks, party_name, credit, debit, date')
        .eq('user_id', user.id)
        .eq('is_old_record', false);

      if (allEntriesError) {
        console.error(`❌ Error fetching all entries for user ${user.id}:`, allEntriesError);
        continue;
      }

      console.log(`📊 Found ${allEntries.length} total entries for user ${user.name}`);

      // Find company entries (any party that matches company name or contains company-related keywords)
      const companyEntries = allEntries.filter(entry => {
        const partyName = entry.party_name.toLowerCase();
        return partyName === companyName.toLowerCase() || 
               partyName === 'sad' || 
               partyName === 'aqc' ||
               partyName.includes('company') ||
               partyName.includes('firm') ||
               (entry.remarks && entry.remarks.toLowerCase().includes('transaction with'));
      });

      console.log(`📊 Found ${companyEntries.length} company entries to delete`);

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
    console.log(`📊 Total company entries deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Clear script error:', error);
  }
};

// Run the script
clearAllCompanyEntries()
  .then(() => {
    console.log('✅ Clear script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clear script failed:', error);
    process.exit(1);
  });
