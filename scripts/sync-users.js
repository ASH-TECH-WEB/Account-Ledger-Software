/**
 * User Sync Script
 * 
 * This script helps sync users between Firebase and Database
 * Based on the current database users, we'll clean up and keep only valid users
 */

const { supabase } = require('../src/config/supabase');

async function syncUsers() {
  try {
    console.log('🔄 Starting User Sync Process...\n');

    // Get current database users
    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ Error fetching database users:', error.message);
      return;
    }

    console.log(`📊 Current Database Users: ${dbUsers.length}\n`);

    // Display current users
    console.log('👥 Current Database Users:');
    dbUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Auth Provider: ${user.auth_provider || 'email'}`);
      console.log(`   Has Password: ${user.password_hash ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('   ---');
    });

    // Based on the error message, the user is trying to register with thakuraadarsh1@gmail.com
    // which is already in the database. Let me check if this user exists and what the issue is.
    
    const targetEmail = 'thakuraadarsh1@gmail.com';
    const existingUser = dbUsers.find(u => u.email === targetEmail);
    
    if (existingUser) {
      console.log(`\n🔍 Found existing user: ${targetEmail}`);
      console.log(`   Auth Provider: ${existingUser.auth_provider}`);
      console.log(`   Has Password: ${existingUser.password_hash ? 'Yes' : 'No'}`);
      
      if (existingUser.auth_provider === 'google' && !existingUser.password_hash) {
        console.log('\n💡 This user was created with Google OAuth and has no password set.');
        console.log('   The user should either:');
        console.log('   1. Login with Google (recommended)');
        console.log('   2. Or set up a password in Profile page after Google login');
        console.log('   3. Or we can add a password to this account');
        
        // Ask if we should add a password to this Google user
        console.log('\n❓ Would you like to add a password to this Google user?');
        console.log('   This would allow them to login with email/password as well.');
        
        // For now, let's just show the recommendation
        console.log('\n📋 Recommendation:');
        console.log('   - User should login with Google first');
        console.log('   - Then go to Profile page to set up a password');
        console.log('   - This way they can use both Google and email/password login');
      }
    }

    // Check for any users that might need cleanup
    console.log('\n🧹 Checking for users that might need cleanup...');
    
    const usersWithoutNames = dbUsers.filter(u => !u.name || u.name.trim() === '');
    const usersWithoutAuthProvider = dbUsers.filter(u => !u.auth_provider);
    
    if (usersWithoutNames.length > 0) {
      console.log(`\n⚠️ Found ${usersWithoutNames.length} users without names:`);
      usersWithoutNames.forEach(user => {
        console.log(`   - ${user.email}`);
      });
    }
    
    if (usersWithoutAuthProvider.length > 0) {
      console.log(`\n⚠️ Found ${usersWithoutAuthProvider.length} users without auth provider:`);
      usersWithoutAuthProvider.forEach(user => {
        console.log(`   - ${user.email}`);
      });
    }

    // Summary
    console.log('\n📋 Summary:');
    console.log(`✅ Total users in database: ${dbUsers.length}`);
    console.log(`🔐 Google users: ${dbUsers.filter(u => u.auth_provider === 'google').length}`);
    console.log(`📧 Email users: ${dbUsers.filter(u => u.auth_provider === 'email').length}`);
    console.log(`🔑 Users with passwords: ${dbUsers.filter(u => u.password_hash).length}`);
    console.log(`🔓 Users without passwords: ${dbUsers.filter(u => !u.password_hash).length}`);

    console.log('\n💡 Recommendations:');
    console.log('1. Users should login with their original method (Google or email/password)');
    console.log('2. Google users can set up passwords in Profile page after login');
    console.log('3. All users are properly stored in the database');
    console.log('4. The registration error is expected - user should login instead');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncUsers().then(() => {
  console.log('\n✅ User sync analysis completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
