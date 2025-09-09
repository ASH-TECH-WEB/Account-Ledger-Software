const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixCommissionBalances() {
  try {
    console.log('🔧 Starting Commission party balance fixes...');
    
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
        console.log(`\n👤 Processing user: ${userId}`);
        
        // Get Commission party for this user
        const { data: commissionParty, error: partyError } = await supabase
          .from('parties')
          .select('id, party_name')
          .eq('user_id', userId)
          .eq('party_name', 'Commission')
          .single();
        
        if (partyError || !commissionParty) {
          console.log(`⏭️ No Commission party found for user ${userId}`);
          continue;
        }
        
        console.log(`✅ Found Commission party: ${commissionParty.party_name} (ID: ${commissionParty.id})`);
        
        // Get all Commission entries for this user
        const { data: commissionEntries, error: entriesError } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('party_name', 'Commission')
          .order('created_at', { ascending: true }); // Sort by creation time
        
        if (entriesError) {
          console.error(`❌ Error fetching Commission entries:`, entriesError);
          continue;
        }
        
        if (!commissionEntries || commissionEntries.length === 0) {
          console.log(`⏭️ No Commission entries found for user ${userId}`);
          continue;
        }
        
        console.log(`📋 Found ${commissionEntries.length} Commission entries`);
        
        // Recalculate balances chronologically
        let runningBalance = 0;
        let updatedCount = 0;
        
        for (let i = 0; i < commissionEntries.length; i++) {
          const entry = commissionEntries[i];
          const entryId = entry.id;
          
          // Skip Monday Final settlement entries
          if (entry.remarks?.includes('Monday Final Settlement')) {
            console.log(`⏭️ Skipping Monday Final entry: ${entryId}`);
            continue;
          }
          
          const entryCredit = parseFloat(entry.credit || 0);
          const entryDebit = parseFloat(entry.debit || 0);
          
          // Calculate running balance
          if (entry.tns_type === 'CR') {
            runningBalance += entryCredit;
          } else if (entry.tns_type === 'DR') {
            runningBalance -= entryDebit;
          }
          
          // Update the entry with correct balance
          const { error: updateError } = await supabase
            .from('ledger_entries')
            .update({
              balance: runningBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', entryId);
          
          if (updateError) {
            console.error(`❌ Error updating entry ${entryId}:`, updateError);
          } else {
            console.log(`✅ Updated entry ${entryId}: ${entry.tns_type} ${entryCredit || entryDebit} → Balance: ${runningBalance}`);
            updatedCount++;
          }
        }
        
        console.log(`📊 User ${userId} summary:`);
        console.log(`  ✅ Entries updated: ${updatedCount}`);
        console.log(`  📊 Final Commission balance: ${runningBalance}`);
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
      }
    }
    
    console.log('\n🎉 Commission balance fixes completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
fixCommissionBalances();
