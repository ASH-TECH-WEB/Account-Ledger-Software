const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createCommissionPartiesForAllUsers() {
  try {
    console.log('🚀 Starting Commission party creation for all users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📊 Found ${users.length} users`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const userId = user.user_id;
        
        // Check if Commission party already exists for this user
        const { data: existingParties, error: partiesError } = await supabase
          .from('parties')
          .select('id, party_name')
          .eq('user_id', userId)
          .eq('party_name', 'Commission');
        
        if (partiesError) {
          console.error(`❌ Error checking parties for user ${userId}:`, partiesError);
          errorCount++;
          continue;
        }
        
        if (existingParties && existingParties.length > 0) {
          console.log(`⏭️ Commission party already exists for user ${userId}`);
          skipCount++;
          continue;
        }
        
        // Create Commission party
        const commissionPartyData = {
          user_id: userId,
          party_name: 'Commission',
          sr_no: `COMM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'A', // Active
          commi_system: 'Give', // Commission system
          balance_limit: '0',
          m_commission: 'With Commission',
          rate: '0', // No rate for Commission party itself
          monday_final: 'No',
          address: '',
          phone: '',
          email: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newParty, error: createError } = await supabase
          .from('parties')
          .insert([commissionPartyData])
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Error creating Commission party for user ${userId}:`, createError);
          errorCount++;
        } else {
          console.log(`✅ Commission party created for user ${userId} (ID: ${newParty.id})`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Commission Party Creation Summary:');
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`⏭️ Already existed: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total users processed: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
createCommissionPartiesForAllUsers();
