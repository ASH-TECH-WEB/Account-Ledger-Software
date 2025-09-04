/**
 * Sync New Password Aadarsh9310@ Script
 * 
 * Syncs the new password Aadarsh9310@ to database
 */

const bcrypt = require('bcryptjs');
const User = require('../src/models/supabase/User');

async function syncNewPassword() {
  try {
    console.log('🔍 Syncing New Password Aadarsh9310@ to Database...\n');
    
    // Get user from database
    const user = await User.findByEmail('thakuraadarsh1@gmail.com');
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('👤 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullname}`);
    console.log(`   Auth Provider: ${user.auth_provider}\n`);
    
    // Test current passwords
    console.log('🔐 Testing Current Passwords:');
    const oldPassword = 'Aadarsh2002@';
    const newPassword = 'Aadarsh9310@';
    
    const oldValid = await bcrypt.compare(oldPassword, user.password_hash);
    const newValid = await bcrypt.compare(newPassword, user.password_hash);
    
    console.log(`   Aadarsh2002@ (old): ${oldValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Aadarsh9310@ (new): ${newValid ? '✅ Valid' : '❌ Invalid'}\n`);
    
    // Sync new password
    console.log('🔄 Syncing New Password Aadarsh9310@:');
    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('   Generated new hash for Aadarsh9310@');
    console.log(`   New Hash Length: ${hashedNewPassword.length}`);
    
    // Update password in database
    await User.update(user.id, { 
      password_hash: hashedNewPassword,
      updated_at: new Date().toISOString()
    });
    
    console.log('   ✅ Password updated in database');
    
    // Verify the update
    const updatedUser = await User.findByEmail('thakuraadarsh1@gmail.com');
    const verifyNewPassword = await bcrypt.compare(newPassword, updatedUser.password_hash);
    const verifyOldPassword = await bcrypt.compare(oldPassword, updatedUser.password_hash);
    
    console.log('\n🔐 Verification After Update:');
    console.log(`   Aadarsh9310@ (new): ${verifyNewPassword ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Aadarsh2002@ (old): ${verifyOldPassword ? '✅ Valid' : '❌ Invalid'}`);
    
    if (verifyNewPassword) {
      console.log('\n🎉 SUCCESS! You can now login with Aadarsh9310@');
    } else {
      console.log('\n❌ FAILED! Password sync did not work');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncNewPassword().then(() => {
  console.log('\n✅ Password sync completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Sync error:', error);
  process.exit(1);
});
