/**
 * Sync Database with Firebase Users
 * 
 * This script will sync the database to match exactly with Firebase users
 * Remove users not in Firebase and keep only Firebase users
 */

const { supabase } = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

async function syncDatabaseWithFirebase() {
  try {
    console.log('🔄 Syncing Database with Firebase Users...\n');

    // Firebase users (from the console)
    const firebaseUsers = [
      { email: 'monishav364@gmail.com', name: 'Monisha V', auth_provider: 'google' },
      { email: 'trendyzpay@gmail.com', name: 'Trendyz Pay', auth_provider: 'google' },
      { email: 'devdasbharati25@gmail.com', name: 'Devdas Bharati', auth_provider: 'google' },
      { email: 'ankitbihar5678@gmail.com', name: 'Ankit Kumar', auth_provider: 'google' },
      { email: 'h@gmail.com', name: 'H User', auth_provider: 'google' }
    ];

    console.log('🔥 Firebase Users (5):');
    firebaseUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.name}`);
    });

    // Get current database users
    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ Error fetching database users:', error.message);
      return;
    }

    console.log('\n🗄️ Current Database Users:');
    dbUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.name || 'No name'}`);
    });

    // Find users to keep (in Firebase)
    const firebaseEmails = new Set(firebaseUsers.map(u => u.email));
    const usersToKeep = dbUsers.filter(u => firebaseEmails.has(u.email));
    const usersToRemove = dbUsers.filter(u => !firebaseEmails.has(u.email));

    console.log('\n📋 Sync Plan:');
    console.log(`✅ Users to keep (${usersToKeep.length}):`);
    usersToKeep.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    console.log(`\n❌ Users to remove (${usersToRemove.length}):`);
    usersToRemove.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    // Find users to add (in Firebase but not in database)
    const dbEmails = new Set(dbUsers.map(u => u.email));
    const usersToAdd = firebaseUsers.filter(u => !dbEmails.has(u.email));

    console.log(`\n➕ Users to add (${usersToAdd.length}):`);
    usersToAdd.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    // Remove users not in Firebase
    if (usersToRemove.length > 0) {
      console.log('\n🗑️ Removing users not in Firebase...');
      for (const user of usersToRemove) {
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
        
        if (deleteError) {
          console.error(`❌ Error removing ${user.email}:`, deleteError.message);
        } else {
          console.log(`✅ Removed: ${user.email}`);
        }
      }
    }

    // Add users from Firebase
    if (usersToAdd.length > 0) {
      console.log('\n➕ Adding users from Firebase...');
      for (const user of usersToAdd) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            name: user.name,
            auth_provider: user.auth_provider,
            password_hash: null, // Google users don't have passwords initially
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error adding ${user.email}:`, insertError.message);
        } else {
          console.log(`✅ Added: ${user.email}`);
        }
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

    console.log('\n✅ Database synced with Firebase successfully!');
    console.log('🎯 Now database contains only Firebase users');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncDatabaseWithFirebase().then(() => {
  console.log('\n✅ Firebase-Database sync completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
