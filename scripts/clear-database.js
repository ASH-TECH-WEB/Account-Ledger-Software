const { supabase } = require('../src/config/supabase');

async function clearDatabase() {
  console.log('🗑️ Clearing Supabase Database...\n');
  
  try {
    // Clear ledger entries first (due to foreign key constraints)
    console.log('📊 Clearing ledger_entries table...');
    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
    
    if (ledgerError) {
      console.error('❌ Error clearing ledger_entries:', ledgerError.message);
    } else {
      console.log('✅ ledger_entries cleared successfully');
    }

    // Clear parties
    console.log('🏢 Clearing parties table...');
    const { error: partiesError } = await supabase
      .from('parties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
    
    if (partiesError) {
      console.error('❌ Error clearing parties:', partiesError.message);
    } else {
      console.log('✅ parties cleared successfully');
    }

    // Clear users
    console.log('👥 Clearing users table...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
    
    if (usersError) {
      console.error('❌ Error clearing users:', usersError.message);
    } else {
      console.log('✅ users cleared successfully');
    }

    // Verify database is empty
    console.log('\n🔍 Verifying database is empty...');
    
    const { data: users, error: usersCheckError } = await supabase.from('users').select('*');
    const { data: parties, error: partiesCheckError } = await supabase.from('parties').select('*');
    const { data: entries, error: entriesCheckError } = await supabase.from('ledger_entries').select('*');

    if (usersCheckError) console.error('❌ Error checking users:', usersCheckError.message);
    if (partiesCheckError) console.error('❌ Error checking parties:', partiesCheckError.message);
    if (entriesCheckError) console.error('❌ Error checking ledger_entries:', entriesCheckError.message);

    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   👥 Users: ${users?.length || 0}`);
    console.log(`   🏢 Parties: ${parties?.length || 0}`);
    console.log(`   📊 Ledger Entries: ${entries?.length || 0}`);

    if ((users?.length || 0) === 0 && (parties?.length || 0) === 0 && (entries?.length || 0) === 0) {
      console.log('\n🎉 SUCCESS: Database is completely empty!');
      console.log('💡 You can now:');
      console.log('   1. Register new users via frontend');
      console.log('   2. Test the complete registration flow');
      console.log('   3. Start fresh with clean data');
    } else {
      console.log('\n⚠️ WARNING: Some data still exists in database');
    }

  } catch (error) {
    console.error('❌ Database clear failed:', error.message);
  }
}

clearDatabase();
