/**
 * Firebase Users Check Script
 * 
 * This script checks Firebase Authentication users
 * and compares them with database users
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function checkFirebaseUsers() {
  try {
    console.log('🔥 Checking Firebase Users...\n');

    // List all Firebase users
    const listUsersResult = await admin.auth().listUsers();
    const firebaseUsers = listUsersResult.users;

    console.log(`📊 Total Firebase Users: ${firebaseUsers.length}\n`);

    if (firebaseUsers.length > 0) {
      console.log('👥 Firebase Users:');
      firebaseUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Display Name: ${user.displayName || 'N/A'}`);
        console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
        console.log(`   Email Verified: ${user.emailVerified}`);
        console.log(`   Created: ${new Date(user.metadata.creationTime).toISOString()}`);
        console.log(`   Last Sign In: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : 'Never'}`);
        console.log(`   Providers: ${user.providerData.map(p => p.providerId).join(', ')}`);
        console.log('   ---');
      });
    } else {
      console.log('📭 No Firebase users found');
    }

    return firebaseUsers;

  } catch (error) {
    console.error('❌ Firebase check failed:', error.message);
    return [];
  }
}

async function compareUsers() {
  try {
    console.log('\n🔄 Comparing Firebase and Database Users...\n');

    // Get Firebase users
    const firebaseUsers = await checkFirebaseUsers();
    
    // Get Database users
    const { supabase } = require('../src/config/supabase');
    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ Error fetching database users:', error.message);
      return;
    }

    console.log(`📊 Database Users: ${dbUsers?.length || 0}\n`);

    // Create email sets for comparison
    const firebaseEmails = new Set(firebaseUsers.map(u => u.email));
    const dbEmails = new Set(dbUsers.map(u => u.email));

    // Find users only in Firebase
    const onlyInFirebase = firebaseUsers.filter(u => !dbEmails.has(u.email));
    
    // Find users only in Database
    const onlyInDatabase = dbUsers.filter(u => !firebaseEmails.has(u.email));
    
    // Find common users
    const commonUsers = firebaseUsers.filter(u => dbEmails.has(u.email));

    console.log('📋 Comparison Results:');
    console.log(`✅ Common Users (in both): ${commonUsers.length}`);
    console.log(`🔥 Only in Firebase: ${onlyInFirebase.length}`);
    console.log(`🗄️ Only in Database: ${onlyInDatabase.length}\n`);

    if (onlyInFirebase.length > 0) {
      console.log('🔥 Users only in Firebase:');
      onlyInFirebase.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.displayName || 'No name'})`);
      });
      console.log('');
    }

    if (onlyInDatabase.length > 0) {
      console.log('🗄️ Users only in Database:');
      onlyInDatabase.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.name || 'No name'})`);
      });
      console.log('');
    }

    if (commonUsers.length > 0) {
      console.log('✅ Users in both systems:');
      commonUsers.forEach((user, index) => {
        const dbUser = dbUsers.find(u => u.email === user.email);
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Firebase: ${user.displayName || 'No name'}`);
        console.log(`   Database: ${dbUser.name || 'No name'}`);
        console.log(`   Auth Provider: ${dbUser.auth_provider || 'unknown'}`);
        console.log('   ---');
      });
    }

  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
  }
}

// Run the comparison
compareUsers().then(() => {
  console.log('\n✅ Firebase and Database comparison completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
