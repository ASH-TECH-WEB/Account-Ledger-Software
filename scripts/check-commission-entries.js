const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCommissionEntries() {
  try {
    console.log('🔍 Checking Commission entries in database...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📊 Found ${users.length} users`);
    
    for (const user of users) {
      try {
        const userId = user.user_id;
        console.log(`\n👤 User: ${userId}`);
        
        // Check Commission party
        const { data: commissionParty, error: partyError } = await supabase
          .from('parties')
          .select('id, party_name, status')
          .eq('user_id', userId)
          .eq('party_name', 'Commission')
          .single();
        
        if (partyError) {
          console.log(`❌ Commission party not found: ${partyError.message}`);
        } else {
          console.log(`✅ Commission party found: ${commissionParty.party_name} (ID: ${commissionParty.id}, Status: ${commissionParty.status})`);
        }
        
        // Check Commission ledger entries
        const { data: commissionEntries, error: entriesError } = await supabase
          .from('ledger_entries')
          .select('id, party_name, remarks, credit, debit, balance, created_at')
          .eq('user_id', userId)
          .eq('party_name', 'Commission');
        
        if (entriesError) {
          console.log(`❌ Error fetching Commission entries: ${entriesError.message}`);
        } else {
          console.log(`📋 Commission entries found: ${commissionEntries?.length || 0}`);
          if (commissionEntries && commissionEntries.length > 0) {
            commissionEntries.forEach((entry, index) => {
              console.log(`  ${index + 1}. ID: ${entry.id}, Remarks: ${entry.remarks}, Credit: ${entry.credit}, Debit: ${entry.debit}, Balance: ${entry.balance}`);
            });
          }
        }
        
        // Check for any entries with commission-related remarks
        const { data: allCommissionEntries, error: allEntriesError } = await supabase
          .from('ledger_entries')
          .select('id, party_name, remarks, credit, debit, balance, created_at')
          .eq('user_id', userId)
          .or('remarks.ilike.%commission%,remarks.ilike.%auto-calculated%');
        
        if (allEntriesError) {
          console.log(`❌ Error fetching all commission-related entries: ${allEntriesError.message}`);
        } else {
          console.log(`📋 All commission-related entries: ${allCommissionEntries?.length || 0}`);
          if (allCommissionEntries && allCommissionEntries.length > 0) {
            allCommissionEntries.forEach((entry, index) => {
              console.log(`  ${index + 1}. Party: ${entry.party_name}, Remarks: ${entry.remarks}, Credit: ${entry.credit}, Debit: ${entry.debit}, Balance: ${entry.balance}`);
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
checkCommissionEntries();
