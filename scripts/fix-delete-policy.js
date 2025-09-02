/**
 * Fix Delete Policy Script
 * 
 * Adds the missing DELETE policy for users table in Supabase
 * This fixes the 500 error when trying to delete user accounts
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDeletePolicy() {
  try {
    console.log('🔧 Adding DELETE policy for users table...');
    
    // Add the DELETE policy for users table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete own profile" ON users
        FOR DELETE USING (true);
      `
    });

    if (error) {
      console.error('❌ Error adding DELETE policy:', error);
      return false;
    }

    console.log('✅ DELETE policy added successfully!');
    console.log('🎉 Users can now delete their own accounts');
    
    return true;
  } catch (error) {
    console.error('💥 Script error:', error);
    return false;
  }
}

// Run the script
fixDeletePolicy()
  .then((success) => {
    if (success) {
      console.log('\n🎯 Delete account functionality should now work!');
      process.exit(0);
    } else {
      console.log('\n❌ Failed to fix delete policy');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
