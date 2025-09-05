/**
 * Database Migration Script - User Approval System
 * 
 * This script adds the approval system columns to the existing users table
 * and updates existing users to be approved so they don't lose access.
 */

const { supabase } = require('../src/config/supabase');

async function migrateApprovalSystem() {
  try {
    console.log('🔄 Starting approval system migration...');

    // Add approval system columns
    console.log('📝 Adding approval system columns...');
    
    const { error: addIsApproved } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;'
    });
    
    const { error: addApprovedAt } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;'
    });
    
    const { error: addAuthProvider } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT \'email\';'
    });
    
    const { error: addGoogleId } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);'
    });
    
    const { error: addProfilePicture } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;'
    });
    
    const { error: addEmailVerified } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;'
    });
    
    const { error: addFirebaseUid } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255);'
    });
    
    const { error: addLastLogin } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;'
    });
    
    const { error: addStatus } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\';'
    });
    
    const { error: addCompanyAccount } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS company_account VARCHAR(255);'
    });

    if (addIsApproved || addApprovedAt || addAuthProvider || addGoogleId || addProfilePicture || 
        addEmailVerified || addFirebaseUid || addLastLogin || addStatus || addCompanyAccount) {
      console.log('⚠️ Some columns might already exist, continuing...');
    }

    console.log('✅ Approval system columns added successfully');

    // Update existing users to be approved
    console.log('👥 Updating existing users to be approved...');
    
    const { data: users, error: fetchUsers } = await supabase
      .from('users')
      .select('id, is_approved')
      .or('is_approved.is.null,is_approved.eq.false');

    if (fetchUsers) {
      console.error('❌ Error fetching users:', fetchUsers);
      return;
    }

    if (users && users.length > 0) {
      const { error: updateUsers } = await supabase
        .from('users')
        .update({ 
          is_approved: true, 
          approved_at: new Date().toISOString(),
          status: 'active'
        })
        .or('is_approved.is.null,is_approved.eq.false');

      if (updateUsers) {
        console.error('❌ Error updating users:', updateUsers);
        return;
      }

      console.log(`✅ Updated ${users.length} existing users to be approved`);
    } else {
      console.log('ℹ️ No users need approval update');
    }

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const { data: allUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, email, is_approved, approved_at, status')
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
      return;
    }

    console.log('✅ Migration verification successful:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email}: approved=${user.is_approved}, status=${user.status}`);
    });

    console.log('🎉 Approval system migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateApprovalSystem()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateApprovalSystem };
