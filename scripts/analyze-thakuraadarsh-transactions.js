const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function analyzeThakuraadarshTransactions() {
  try {
    console.log('🔍 Analyzing thakuraadarsh1@gmail.com transactions...');
    
    // Get user ID for thakuraadarsh1@gmail.com
    const { data: user, error: userError } = await supabase
      .from('user_settings')
      .select('user_id, company_account')
      .eq('email', 'thakuraadarsh1@gmail.com')
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }
    
    const userId = user.user_id;
    const companyName = user.company_account;
    console.log(`👤 User ID: ${userId}`);
    console.log(`🏢 Company Name: ${companyName}`);
    
    // Get all ledger entries for this user
    const { data: allEntries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (entriesError) {
      console.error('❌ Error fetching entries:', entriesError);
      return;
    }
    
    console.log(`\n📋 Total entries: ${allEntries.length}`);
    console.log('\n📊 All Transactions:');
    console.log('='.repeat(80));
    
    allEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.created_at?.split('T')[0] || 'N/A'} | ${entry.party_name} | ${entry.tns_type} | Credit: ₹${entry.credit || 0} | Debit: ₹${entry.debit || 0} | Remarks: ${entry.remarks || 'N/A'} | Balance: ₹${entry.balance || 0}`);
    });
    
    // Analyze by party
    console.log('\n📊 Analysis by Party:');
    console.log('='.repeat(80));
    
    const partyAnalysis = new Map();
    
    allEntries.forEach(entry => {
      const partyName = entry.party_name;
      const remarks = entry.remarks || '';
      
      if (!partyAnalysis.has(partyName)) {
        partyAnalysis.set(partyName, {
          name: partyName,
          entries: [],
          creditTotal: 0,
          debitTotal: 0,
          closingBalance: 0,
          isCompanyParty: remarks === companyName,
          isCommissionParty: partyName === 'Commission',
          isMondayFinal: remarks.includes('Monday Final Settlement') || remarks.includes('Monday Settlement')
        });
      }
      
      const party = partyAnalysis.get(partyName);
      party.entries.push(entry);
      
      if (entry.tns_type === 'CR') {
        party.creditTotal += parseFloat(entry.credit || 0);
      } else if (entry.tns_type === 'DR') {
        party.debitTotal += parseFloat(entry.debit || 0);
      }
      
      party.closingBalance = party.creditTotal - party.debitTotal;
    });
    
    // Display party analysis
    partyAnalysis.forEach((party, partyName) => {
      console.log(`\n🏷️ Party: ${partyName}`);
      console.log(`   Type: ${party.isCompanyParty ? 'Company Party' : party.isCommissionParty ? 'Commission Party' : 'Regular Party'}`);
      console.log(`   Entries: ${party.entries.length}`);
      console.log(`   Credit Total: ₹${party.creditTotal.toLocaleString()}`);
      console.log(`   Debit Total: ₹${party.debitTotal.toLocaleString()}`);
      console.log(`   Closing Balance: ₹${party.closingBalance.toLocaleString()}`);
      console.log(`   Is Monday Final: ${party.isMondayFinal ? 'Yes' : 'No'}`);
      
      // Show individual entries for this party
      party.entries.forEach((entry, index) => {
        console.log(`     ${index + 1}. ${entry.created_at?.split('T')[0] || 'N/A'} | ${entry.tns_type} | ₹${entry.credit || 0} | ₹${entry.debit || 0} | ${entry.remarks || 'N/A'}`);
      });
    });
    
    // Calculate what should be in Final Trial Balance
    console.log('\n📊 Final Trial Balance Analysis:');
    console.log('='.repeat(80));
    
    const finalTrialBalanceParties = [];
    let totalCredit = 0;
    let totalDebit = 0;
    
    partyAnalysis.forEach((party, partyName) => {
      // Skip Monday Final Settlement entries
      if (party.isMondayFinal) {
        console.log(`❌ Skipping ${partyName} (Monday Final Settlement)`);
        return;
      }
      
      // Include all other parties (including Company and Commission)
      if (party.closingBalance !== 0) {
        finalTrialBalanceParties.push(party);
        
        if (party.closingBalance > 0) {
          totalCredit += party.closingBalance;
          console.log(`✅ ${partyName}: Credit ₹${party.closingBalance.toLocaleString()}`);
        } else {
          totalDebit += Math.abs(party.closingBalance);
          console.log(`✅ ${partyName}: Debit ₹${Math.abs(party.closingBalance).toLocaleString()}`);
        }
      }
    });
    
    const balanceDifference = totalCredit - totalDebit;
    
    console.log(`\n📊 Final Trial Balance Summary:`);
    console.log(`   Total Credit: ₹${totalCredit.toLocaleString()}`);
    console.log(`   Total Debit: ₹${totalDebit.toLocaleString()}`);
    console.log(`   Balance Difference: ₹${balanceDifference.toLocaleString()}`);
    
    if (balanceDifference === 0) {
      console.log(`   ✅ Balanced!`);
    } else {
      console.log(`   ⚠️ Not Balanced - Difference: ₹${balanceDifference.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
analyzeThakuraadarshTransactions();
