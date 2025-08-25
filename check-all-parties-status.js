const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllPartiesStatus() {
  try {
    console.log('🔍 Checking All Parties Status...\n');

    // 1. Get all parties
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*');

    if (partiesError) throw partiesError;

    console.log(`📊 Found ${parties.length} parties:`);
    parties.forEach(party => {
      console.log(`   - ${party.party_name} (${party.commission_system || 'No system'})`);
    });

    // 2. Check each party's transactions and balance
    for (const party of parties) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 PARTY: ${party.party_name.toUpperCase()}`);
      console.log(`${'='.repeat(60)}`);

      // Get all entries for this party
      const { data: partyEntries, error: entriesError } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('party_name', party.party_name)
        .order('created_at', { ascending: true });

      if (entriesError) throw entriesError;

      console.log(`📊 Total entries: ${partyEntries.length}`);

      if (partyEntries.length === 0) {
        console.log('   No transactions found');
        continue;
      }

      // Separate current and old records
      const currentEntries = partyEntries.filter(entry => !entry.is_old_record);
      const oldRecords = partyEntries.filter(entry => entry.is_old_record);

      console.log(`📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);

      // 3. Display current entries with balance calculation
      let runningBalance = 0;
      
      if (currentEntries.length > 0) {
        console.log('\n📋 Current Entries (Unsettled):');
        
        currentEntries.forEach((entry, index) => {
          const amount = parseFloat(entry.credit || entry.debit || 0);
          
          if (entry.tns_type === 'CR') {
            runningBalance += amount;
          } else if (entry.tns_type === 'DR') {
            runningBalance -= amount;
          }
          
          console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
          console.log(`     Amount: ₹${amount}, Remarks: ${entry.remarks}`);
          console.log(`     Running Balance: ₹${runningBalance.toFixed(2)}`);
          console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
          console.log('');
        });

        console.log(`💰 Final Current Balance: ₹${runningBalance.toFixed(2)}`);
      } else {
        console.log('\n📋 Current Entries: None (all settled)');
      }

      // 4. Display old records
      if (oldRecords.length > 0) {
        console.log('\n📋 Old Records (Settled):');
        oldRecords.forEach((entry, index) => {
          console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
          console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
          console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
          console.log('');
        });
      }

      // 5. Check Monday Final entries
      const mondayFinals = partyEntries.filter(entry => 
        entry.remarks?.includes('Monday Final Settlement')
      );

      if (mondayFinals.length > 0) {
        console.log('\n📋 Monday Final Entries:');
        mondayFinals.forEach((mf, index) => {
          console.log(`  ${index + 1}. Date: ${mf.date}, Type: ${mf.tns_type}`);
          console.log(`     Remarks: ${mf.remarks}`);
          console.log(`     ID: ${mf.id}, Is Old Record: ${mf.is_old_record}`);
          console.log(`     Settlement ID: ${mf.settlement_monday_final_id || 'None'}`);
          
          // Find transactions settled by this Monday Final
          const settledTransactions = partyEntries.filter(entry => 
            entry.settlement_monday_final_id === mf.id
          );
          
          console.log(`     Settled ${settledTransactions.length} transactions`);
          console.log('');
        });
      }

      // 6. Calculate total summary
      console.log('\n📊 Summary for', party.party_name);
      console.log('─'.repeat(40));
      
      const totalCredit = partyEntries
        .filter(entry => entry.tns_type === 'CR')
        .reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0);
        
      const totalDebit = partyEntries
        .filter(entry => entry.tns_type === 'DR')
        .reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0);

      const netBalance = totalCredit - totalDebit;
      
      console.log(`   Total Credit: ₹${totalCredit.toFixed(2)}`);
      console.log(`   Total Debit: ₹${totalDebit.toFixed(2)}`);
      console.log(`   Net Balance: ₹${netBalance.toFixed(2)}`);
      console.log(`   Current Balance: ₹${currentEntries.length > 0 ? runningBalance.toFixed(2) : '0.00'}`);
      console.log(`   Settled Transactions: ${oldRecords.length}`);
      console.log(`   Unsettled Transactions: ${currentEntries.length}`);
      console.log(`   Monday Final Entries: ${mondayFinals.length}`);
    }

    // 7. Overall system summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎯 OVERALL SYSTEM SUMMARY');
    console.log(`${'='.repeat(60)}`);

    const { count: totalEntries, error: totalError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    const { data: allEntries, error: allError } = await supabase
      .from('ledger_entries')
      .select('*');

    if (allError) throw allError;

    const totalSystemCredit = allEntries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0);
      
    const totalSystemDebit = allEntries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0);

    const totalSystemBalance = totalSystemCredit - totalSystemDebit;

    console.log(`📊 Total System Entries: ${totalEntries}`);
    console.log(`💰 Total System Credit: ₹${totalSystemCredit.toFixed(2)}`);
    console.log(`💰 Total System Debit: ₹${totalSystemDebit.toFixed(2)}`);
    console.log(`💰 Total System Balance: ₹${totalSystemBalance.toFixed(2)}`);
    console.log(`📋 Total Parties: ${parties.length}`);

    console.log('\n✅ Complete system check completed!');

  } catch (error) {
    console.error('❌ Error checking system status:', error);
  }
}

checkAllPartiesStatus();
