/**
 * Clear All Transactions Script
 * 
 * This script will delete all ledger entries for the current user
 * to provide a clean slate for testing virtual parties
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { supabase } = require('./src/config/supabase');

// User ID from the logs
const USER_ID = '75a2b300-f990-4ae1-a79c-c2bbd639214d';

async function clearAllTransactions() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log(`🔍 User ID: ${USER_ID}`);
    
    // First, get count of existing transactions
    const { count: existingCount, error: countError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', USER_ID);
    
    if (countError) {
      console.error('❌ Error counting transactions:', countError);
      return;
    }
    
    console.log(`📊 Found ${existingCount} existing transactions`);
    
    if (existingCount === 0) {
      console.log('✅ Database is already clean!');
      return;
    }
    
    // Delete all transactions for the user
    const { error: deleteError } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('user_id', USER_ID);
    
    if (deleteError) {
      console.error('❌ Error deleting transactions:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${existingCount} transactions`);
    console.log('🧹 Database cleanup completed!');
    
    // Verify deletion
    const { count: newCount, error: verifyError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', USER_ID);
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
      return;
    }
    
    console.log(`🔍 Verification: ${newCount} transactions remaining`);
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the cleanup
clearAllTransactions();
