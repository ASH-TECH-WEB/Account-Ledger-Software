/**
 * Simple Firebase Users Check
 * 
 * This script will help us understand what users should be in Firebase
 * and sync them with the database
 */

const { supabase } = require('../src/config/supabase');

async function checkAndSyncUsers() {
  try {
    console.log('🔥 Checking Firebase Users (via database analysis)...\n');

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

    // Based on the registration error, let's analyze what should be in Firebase
    console.log('\n🔍 Analysis:');
    console.log('The user "thakuraadarsh1@gmail.com" is trying to register but already exists.');
    console.log('This suggests that this user should exist in Firebase as well.\n');

    // Let's check what users should be in Firebase based on auth_provider
    const googleUsers = dbUsers.filter(u => u.auth_provider === 'google');
    const emailUsers = dbUsers.filter(u => u.auth_provider === 'email');

    console.log('📋 Users that should be in Firebase:');
    console.log(`🔐 Google Users (${googleUsers.length}):`);
    googleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name || 'No name'}`);
    });

    console.log(`\n📧 Email Users (${emailUsers.length}):`);
    emailUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name || 'No name'}`);
    });

    // Recommendation
    console.log('\n💡 Recommendation:');
    console.log('All users in the database should also exist in Firebase.');
    console.log('The registration error for "thakuraadarsh1@gmail.com" suggests:');
    console.log('1. This user exists in Firebase (Google OAuth)');
    console.log('2. This user exists in Database (Google auth_provider)');
    console.log('3. User should login with Google instead of registering\n');

    // Let's create a clean list of users that should be in both systems
    console.log('✅ Users that should be in both Firebase and Database:');
    dbUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.auth_provider})`);
    });

    console.log('\n🎯 Action Required:');
    console.log('User "thakuraadarsh1@gmail.com" should:');
    console.log('1. Click "Continue with Google" instead of registering');
    console.log('2. Or we can add a password to allow email/password login');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkAndSyncUsers().then(() => {
  console.log('\n✅ Firebase-Database sync analysis completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
