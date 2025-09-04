const { supabase } = require('./src/config/supabase');

async function checkEntries() {
  try {
    const { data: entries, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Recent Ledger Entries:');
    entries.forEach((entry, i) => {
      console.log(`${i+1}. Party: ${entry.party_name}`);
      console.log(`   Remarks: ${entry.remarks}`);
      console.log(`   Credit: ${entry.credit}, Debit: ${entry.debit}`);
      console.log(`   Date: ${entry.date}`);
      console.log('   ---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEntries();
