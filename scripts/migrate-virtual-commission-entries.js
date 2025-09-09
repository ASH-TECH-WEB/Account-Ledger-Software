const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function migrateVirtualCommissionEntries() {
  try {
    console.log('🚀 Starting virtual Commission entries migration...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📊 Found ${users.length} users`);
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const user of users) {
      try {
        const userId = user.user_id;
        console.log(`\n👤 Processing user: ${userId}`);
        
        // Get all ledger entries for this user that might be virtual Commission entries
        const { data: allEntries, error: entriesError } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', userId)
          .or('party_name.ilike.%commission%,remarks.ilike.%commission%,remarks.ilike.%auto-calculated%');
        
        if (entriesError) {
          console.error(`❌ Error fetching entries for user ${userId}:`, entriesError);
          totalErrors++;
          continue;
        }
        
        if (!allEntries || allEntries.length === 0) {
          console.log(`⏭️ No virtual Commission entries found for user ${userId}`);
          totalSkipped++;
          continue;
        }
        
        console.log(`📋 Found ${allEntries.length} potential virtual Commission entries`);
        
        // Get the real Commission party for this user
        const { data: commissionParty, error: partyError } = await supabase
          .from('parties')
          .select('id, party_name')
          .eq('user_id', userId)
          .eq('party_name', 'Commission')
          .single();
        
        if (partyError || !commissionParty) {
          console.error(`❌ Commission party not found for user ${userId}:`, partyError);
          totalErrors++;
          continue;
        }
        
        console.log(`✅ Found Commission party: ${commissionParty.party_name} (ID: ${commissionParty.id})`);
        
        // Filter entries that need migration
        const entriesToMigrate = allEntries.filter(entry => {
          const partyName = entry.party_name || '';
          const remarks = entry.remarks || '';
          
          // Check if it's a virtual Commission entry
          const isVirtualCommission = partyName.toLowerCase().includes('commission') ||
                                    remarks.toLowerCase().includes('commission') ||
                                    remarks.toLowerCase().includes('auto-calculated');
          
          // Check if it's not already using the real Commission party
          const isNotRealCommission = partyName !== 'Commission';
          
          return isVirtualCommission && isNotRealCommission;
        });
        
        console.log(`🔄 Found ${entriesToMigrate.length} entries to migrate`);
        
        if (entriesToMigrate.length === 0) {
          console.log(`⏭️ No entries need migration for user ${userId}`);
          totalSkipped++;
          continue;
        }
        
        // Migrate each entry
        let userMigrated = 0;
        let userErrors = 0;
        
        for (const entry of entriesToMigrate) {
          try {
            const entryId = entry.id;
            
            // Update the entry to use the real Commission party
            const { error: updateError } = await supabase
              .from('ledger_entries')
              .update({
                party_name: 'Commission',
                updated_at: new Date().toISOString()
              })
              .eq('id', entryId);
            
            if (updateError) {
              console.error(`❌ Error migrating entry ${entryId}:`, updateError);
              userErrors++;
            } else {
              console.log(`✅ Migrated entry ${entryId}: ${entry.party_name} → Commission`);
              userMigrated++;
            }
          } catch (error) {
            console.error(`❌ Error processing entry ${entry.id}:`, error);
            userErrors++;
          }
        }
        
        console.log(`📊 User ${userId} migration summary:`);
        console.log(`  ✅ Migrated: ${userMigrated}`);
        console.log(`  ❌ Errors: ${userErrors}`);
        
        totalMigrated += userMigrated;
        totalErrors += userErrors;
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        totalErrors++;
      }
    }
    
    console.log('\n📊 Virtual Commission Migration Summary:');
    console.log(`✅ Total entries migrated: ${totalMigrated}`);
    console.log(`⏭️ Users skipped: ${totalSkipped}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`📊 Total users processed: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
migrateVirtualCommissionEntries();
