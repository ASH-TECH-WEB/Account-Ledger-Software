/**
 * Add Password to Google User Script
 * 
 * This script adds a password to the Google user so they can login with email/password
 */

const { supabase } = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

async function addPasswordToGoogleUser() {
  try {
    console.log('🔐 Adding Password to Google User...\n');

    const targetEmail = 'thakuraadarsh1@gmail.com';
    const newPassword = 'Aadarsh2002@'; // Same password user is trying to register with

    // Find the user
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', targetEmail);

    if (findError) {
      console.error('❌ Error finding user:', findError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ User not found:', targetEmail);
      return;
    }

    const user = users[0];
    console.log(`👤 Found user: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Auth Provider: ${user.auth_provider}`);
    console.log(`   Current Password: ${user.password_hash ? 'Yes' : 'No'}`);

    if (user.password_hash) {
      console.log('⚠️ User already has a password. Skipping...');
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user with password
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      return;
    }

    console.log('\n✅ Password added successfully!');
    console.log(`📧 Email: ${targetEmail}`);
    console.log(`🔐 Password: ${newPassword}`);
    console.log(`🔄 Updated at: ${new Date().toISOString()}`);

    console.log('\n🎉 User can now login with:');
    console.log('1. Google OAuth (existing)');
    console.log('2. Email/Password (new)');

  } catch (error) {
    console.error('❌ Failed to add password:', error.message);
  }
}

// Run the script
addPasswordToGoogleUser().then(() => {
  console.log('\n✅ Password addition completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
