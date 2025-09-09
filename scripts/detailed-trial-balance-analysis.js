const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function detailedTrialBalanceAnalysis() {
  try {
    console.log('🔍 Detailed Final Trial Balance Analysis for thakuraadarsh1@gmail.com...');
    
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
    
    // Simulate the Final Trial Balance logic
    console.log('\n📊 Final Trial Balance Logic Simulation:');
    console.log('='.repeat(80));
    
    const partyBalances = new Map();
    let totalCredit = 0;
    let totalDebit = 0;
    
    allEntries.forEach((entry, index) => {
      const partyName = entry.party_name;
      const credit = parseFloat(entry.credit || 0);
      const debit = parseFloat(entry.debit || 0);
      const remarks = entry.remarks || '';
      
      console.log(`\n${index + 1}. Processing: ${partyName} | ${entry.tns_type} | ₹${credit} | ₹${debit} | ${remarks}`);
      
      // Skip Monday Final Settlement entries for trial balance
      if (remarks.includes('Monday Final Settlement') || remarks.includes('Monday Settlement')) {
        console.log(`   ❌ SKIPPED: Monday Final Settlement entry`);
        return;
      }
      
      // Skip company name transactions (same as Account Ledger logic)
      if (remarks === companyName || remarks === 'Commission') {
        console.log(`   ❌ SKIPPED: Company name transaction (remarks: ${remarks})`);
        return;
      }
      
      // Skip entries where party_name is the company name (virtual company transactions)
      if (partyName === companyName) {
        console.log(`   ❌ SKIPPED: Virtual company transaction (party_name: ${partyName})`);
        return;
      }
      
      console.log(`   ✅ INCLUDED: Regular transaction`);
      
      // Initialize party balance if not exists
      if (!partyBalances.has(partyName)) {
        partyBalances.set(partyName, {
          name: partyName,
          creditTotal: 0,
          debitTotal: 0,
          closingBalance: 0,
          entryCount: 0
        });
      }
      
      const partyEntry = partyBalances.get(partyName);
      partyEntry.entryCount++;
      
      // Add to party totals
      if (entry.tns_type === 'CR') {
        partyEntry.creditTotal += credit;
        totalCredit += credit;
        console.log(`   📈 Added to credit: ₹${credit} (Total: ₹${partyEntry.creditTotal})`);
      } else if (entry.tns_type === 'DR') {
        partyEntry.debitTotal += debit;
        totalDebit += debit;
        console.log(`   📉 Added to debit: ₹${debit} (Total: ₹${partyEntry.debitTotal})`);
      }
      
      // Calculate closing balance
      partyEntry.closingBalance = partyEntry.creditTotal - partyEntry.debitTotal;
      console.log(`   💰 Party closing balance: ₹${partyEntry.closingBalance}`);
    });
    
    // Display final results
    console.log('\n📊 Final Trial Balance Results:');
    console.log('='.repeat(80));
    
    const creditEntries = [];
    const debitEntries = [];
    
    partyBalances.forEach((balance, partyName) => {
      if (balance.closingBalance !== 0) {
        if (balance.closingBalance > 0) {
          creditEntries.push(balance);
          console.log(`✅ ${partyName}: Credit ₹${balance.closingBalance.toLocaleString()} (${balance.entryCount} entries)`);
        } else {
          debitEntries.push(balance);
          console.log(`✅ ${partyName}: Debit ₹${Math.abs(balance.closingBalance).toLocaleString()} (${balance.entryCount} entries)`);
        }
      }
    });
    
    // Calculate totals
    const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.closingBalance, 0);
    const debitTotal = Math.abs(debitEntries.reduce((sum, entry) => sum + entry.closingBalance, 0));
    const balanceDifference = creditTotal - debitTotal;
    
    console.log(`\n📊 Final Trial Balance Summary:`);
    console.log(`   Total Credit: ₹${creditTotal.toLocaleString()}`);
    console.log(`   Total Debit: ₹${debitTotal.toLocaleString()}`);
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
detailedTrialBalanceAnalysis();
