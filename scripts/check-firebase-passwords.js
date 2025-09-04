/**
 * Check Firebase Passwords Script
 * 
 * Checks Firebase authentication for the user
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
  }
}

async function checkFirebasePasswords() {
  try {
    console.log('🔍 Checking Firebase Authentication for thakuraadarsh1@gmail.com...\n');
    
    const email = 'thakuraadarsh1@gmail.com';
    
    // Get user from Firebase
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      console.log('👤 Firebase User Details:');
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Email Verified: ${userRecord.emailVerified}`);
      console.log(`   Display Name: ${userRecord.displayName || 'Not set'}`);
      console.log(`   Phone Number: ${userRecord.phoneNumber || 'Not set'}`);
      console.log(`   Created: ${new Date(userRecord.metadata.creationTime).toISOString()}`);
      console.log(`   Last Sign In: ${userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).toISOString() : 'Never'}`);
      console.log(`   Provider Data: ${userRecord.providerData.length} providers`);
      
      // Check providers
      console.log('\n🔐 Authentication Providers:');
      userRecord.providerData.forEach((provider, index) => {
        console.log(`   ${index + 1}. ${provider.providerId} (${provider.uid})`);
      });
      
      // Check if user has password authentication enabled
      const hasPasswordProvider = userRecord.providerData.some(provider => 
        provider.providerId === 'password'
      );
      
      console.log(`\n🔑 Password Authentication: ${hasPasswordProvider ? '✅ Enabled' : '❌ Disabled'}`);
      
      if (hasPasswordProvider) {
        console.log('   Note: User can login with email/password');
      } else {
        console.log('   Note: User can only login with Google or other providers');
      }
      
      // Check user metadata
      console.log('\n📊 User Metadata:');
      console.log(`   Creation Time: ${userRecord.metadata.creationTime}`);
      console.log(`   Last Sign In: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      console.log(`   Last Refresh: ${userRecord.metadata.lastRefreshTime || 'Never'}`);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase');
      } else {
        console.log('❌ Error getting user from Firebase:', error.message);
      }
    }
    
    console.log('\n🔍 Firebase Password Info:');
    console.log('   Note: Firebase stores passwords securely and we cannot see the actual password');
    console.log('   Firebase handles password verification internally');
    console.log('   When user resets password via Firebase, the old password becomes invalid');
    console.log('   We sync the new password to our database for our own authentication');
    
  } catch (error) {
    console.error('❌ Firebase check failed:', error.message);
  }
}

// Run the check
checkFirebasePasswords().then(() => {
  console.log('\n✅ Firebase password check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check error:', error);
  process.exit(1);
});
