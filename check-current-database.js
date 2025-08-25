const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentDatabase() {
  try {
    console.log('🔍 Checking Current Database State...\n');

    // 1. Check total ledger entries
    console.log('📊 1. Total Ledger Entries:');
    const { count: totalEntries, error: countError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`   Total entries: ${totalEntries}`);

    // 2. Check parties
    console.log('\n👥 2. Parties:');
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*');

    if (partiesError) throw partiesError;
    console.log(`   Total parties: ${parties.length}`);
    
    if (parties.length > 0) {
      parties.forEach(party => {
        console.log(`     - ${party.party_name} (${party.commission_system || 'No system'})`);
      });
    }

    // 3. Check users
    console.log('\n👤 3. Users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) throw usersError;
    console.log(`   Total users: ${users.length}`);

    // 4. If there are ledger entries, show them
    if (totalEntries > 0) {
      console.log('\n📋 4. Sample Ledger Entries:');
      const { data: sampleEntries, error: sampleError } = await supabase
        .from('ledger_entries')
        .select('*')
        .limit(5)
        .order('created_at', { ascending: false });

      if (sampleError) throw sampleError;

      sampleEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.date} | ${entry.party_name} | ${entry.remarks}`);
        console.log(`      ${entry.tns_type} ₹${entry.credit || entry.debit || 0} | Balance: ₹${entry.balance || 0}`);
        console.log(`      Old Record: ${entry.is_old_record} | Settlement: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    console.log('✅ Database check completed!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkCurrentDatabase();
