/**
 * Simple Database Migration - Add Approval Columns
 * 
 * This script directly adds the approval system columns to the users table
 */

const { supabase } = require('../src/config/supabase');

async function addApprovalColumns() {
  try {
    console.log('🔄 Adding approval system columns to users table...');

    // First, let's check if the columns already exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('is_approved')
      .limit(1);

    if (testError && testError.code === '42703') {
      console.log('📝 Column is_approved does not exist, adding columns...');
      
      // Since we can't use ALTER TABLE directly, we'll need to use Supabase dashboard
      // or create a new table with the required columns
      console.log('⚠️ Direct ALTER TABLE not supported via API');
      console.log('📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('');
      console.log('-- Add approval system columns');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT \'email\';');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255);');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\';');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS company_account VARCHAR(255);');
      console.log('');
      console.log('-- Update existing users to be approved');
      console.log('UPDATE users SET is_approved = TRUE, approved_at = NOW() WHERE is_approved IS NULL OR is_approved = FALSE;');
      console.log('');
      console.log('✅ After running the above SQL, the approval system will work correctly.');
      
    } else if (testError) {
      console.error('❌ Error checking columns:', testError);
    } else {
      console.log('✅ Column is_approved already exists');
      
      // Check if we need to update existing users
      const { data: unapprovedUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, is_approved')
        .or('is_approved.is.null,is_approved.eq.false');

      if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
      }

      if (unapprovedUsers && unapprovedUsers.length > 0) {
        console.log(`👥 Found ${unapprovedUsers.length} users that need approval`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            is_approved: true, 
            approved_at: new Date().toISOString(),
            status: 'active'
          })
          .or('is_approved.is.null,is_approved.eq.false');

        if (updateError) {
          console.error('❌ Error updating users:', updateError);
        } else {
          console.log(`✅ Updated ${unapprovedUsers.length} users to be approved`);
        }
      } else {
        console.log('ℹ️ All users are already approved');
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  addApprovalColumns()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addApprovalColumns };
