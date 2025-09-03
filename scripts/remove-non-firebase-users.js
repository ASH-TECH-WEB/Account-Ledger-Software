/**
 * Remove Non-Firebase Users Script
 * 
 * This script removes users from database that are not in Firebase
 */

const { supabase } = require('../src/config/supabase');

async function removeNonFirebaseUsers() {
  try {
    console.log('🗑️ Removing users not in Firebase...\n');

    // Firebase users (from the console)
    const firebaseUsers = [
      'monishav364@gmail.com',
      'trendyzpay@gmail.com', 
      'devdasbharati25@gmail.com',
      'ankitbihar5678@gmail.com',
      'h@gmail.com'
    ];

    console.log('🔥 Firebase Users (5):');
    firebaseUsers.forEach((email, index) => {
      console.log(`${index + 1}. ${email}`);
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

    // Find users to remove (not in Firebase)
    const firebaseEmails = new Set(firebaseUsers);
    const usersToRemove = dbUsers.filter(u => !firebaseEmails.has(u.email));

    console.log('\n📋 Cleanup Plan:');
    console.log(`✅ Users to keep (${dbUsers.length - usersToRemove.length}):`);
    dbUsers.filter(u => firebaseEmails.has(u.email)).forEach(user => {
      console.log(`   - ${user.email}`);
    });

    console.log(`\n❌ Users to remove (${usersToRemove.length}):`);
    usersToRemove.forEach(user => {
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
    } else {
      console.log('\n✅ No users to remove - database already clean!');
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

    // Verify all users are in Firebase
    const allInFirebase = finalUsers.every(u => firebaseEmails.has(u.email));
    const allFirebaseInDb = firebaseUsers.every(email => finalUsers.some(u => u.email === email));

    console.log('\n🎯 Sync Status:');
    console.log(`✅ All database users in Firebase: ${allInFirebase ? 'Yes' : 'No'}`);
    console.log(`✅ All Firebase users in database: ${allFirebaseInDb ? 'Yes' : 'No'}`);

    if (allInFirebase && allFirebaseInDb) {
      console.log('\n🎉 Perfect! Database and Firebase are now perfectly synced!');
    } else {
      console.log('\n⚠️ Some sync issues remain');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Run the cleanup
removeNonFirebaseUsers().then(() => {
  console.log('\n✅ Database cleanup completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
