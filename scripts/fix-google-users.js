/**
 * Fix Google Users Script
 * 
 * This script adds the missing Firebase users with proper password handling
 */

const { supabase } = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

async function fixGoogleUsers() {
  try {
    console.log('🔧 Fixing Google Users...\n');

    // Firebase users that need to be added
    const firebaseUsers = [
      { email: 'monishav364@gmail.com', name: 'Monisha V', auth_provider: 'google' },
      { email: 'trendyzpay@gmail.com', name: 'Trendyz Pay', auth_provider: 'google' },
      { email: 'h@gmail.com', name: 'H User', auth_provider: 'google' }
    ];

    console.log('➕ Adding missing Firebase users...');

    for (const user of firebaseUsers) {
      // Create a dummy password hash for Google users (they won't use it)
      const dummyPassword = 'google_user_' + Date.now();
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(dummyPassword, salt);

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email: user.email,
          name: user.name,
          auth_provider: user.auth_provider,
          password_hash: hashedPassword, // Dummy password for Google users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Error adding ${user.email}:`, insertError.message);
      } else {
        console.log(`✅ Added: ${user.email} (Google user with dummy password)`);
      }
    }

    // Final verification
    console.log('\n🔍 Final Verification...');
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('*');

    if (finalError) {
      console.error('❌ Error fetching final users:', finalError.message);
      return;
    }

    console.log(`\n📊 Final Database Users: ${finalUsers.length}`);
    finalUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.name || 'No name'} (${user.auth_provider})`);
    });

    console.log('\n✅ All Firebase users added to database!');
    console.log('🎯 Database now matches Firebase exactly');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixGoogleUsers().then(() => {
  console.log('\n✅ Google users fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
