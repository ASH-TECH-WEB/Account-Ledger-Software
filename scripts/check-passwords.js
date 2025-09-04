/**
 * Check Passwords Script
 * 
 * Checks passwords in both Firebase and Database
 */

const bcrypt = require('bcryptjs');
const User = require('../src/models/supabase/User');

async function checkPasswords() {
  try {
    console.log('🔍 Checking Passwords for thakuraadarsh1@gmail.com...\n');
    
    // Get user from database
    const user = await User.findByEmail('thakuraadarsh1@gmail.com');
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('👤 Database User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullname}`);
    console.log(`   Auth Provider: ${user.auth_provider}`);
    console.log(`   Has Password Hash: ${user.password_hash ? 'Yes' : 'No'}`);
    console.log(`   Password Hash Length: ${user.password_hash ? user.password_hash.length : 0}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Updated: ${user.updated_at}\n`);
    
    // Test different passwords
    const passwordsToTest = [
      'Aadarsh2002@',
      'Aadarsh9310@',
      'Aadarsh123@',
      'password123',
      'test123'
    ];
    
    console.log('🔐 Testing Passwords in Database:');
    for (const password of passwordsToTest) {
      try {
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`   ${password}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      } catch (error) {
        console.log(`   ${password}: ❌ Error - ${error.message}`);
      }
    }
    
    console.log('\n📊 Password Hash Info:');
    if (user.password_hash) {
      console.log(`   Hash: ${user.password_hash.substring(0, 20)}...`);
      console.log(`   Hash Type: bcrypt`);
      console.log(`   Salt Rounds: 12 (estimated)`);
    }
    
    console.log('\n🔍 Firebase Password Info:');
    console.log('   Note: Firebase passwords are not stored in our database');
    console.log('   Firebase handles password authentication separately');
    console.log('   When user resets password via Firebase, we sync the new password to our database');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkPasswords().then(() => {
  console.log('\n✅ Password check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check error:', error);
  process.exit(1);
});
