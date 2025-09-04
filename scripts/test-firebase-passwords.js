/**
 * Test Firebase Passwords Script
 * 
 * Tests Firebase authentication with different passwords
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
    console.log('ℹ️ This is expected if Firebase credentials are not set in environment');
  }
}

async function testFirebasePasswords() {
  try {
    console.log('🔥 Testing Firebase Authentication for thakuraadarsh1@gmail.com...\n');
    
    const email = 'thakuraadarsh1@gmail.com';
    
    // Test different passwords
    const passwordsToTest = [
      'Aadarsh2002@',
      'Aadarsh9310@',
      'Aadarsh123@',
      'password123',
      'test123'
    ];
    
    console.log('🔐 Testing Passwords in Firebase:');
    console.log('Note: Firebase Admin SDK cannot directly test passwords');
    console.log('We can only check user existence and properties\n');
    
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      console.log('👤 Firebase User Details:');
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Email Verified: ${userRecord.emailVerified}`);
      console.log(`   Display Name: ${userRecord.displayName || 'Not set'}`);
      console.log(`   Created: ${new Date(userRecord.metadata.creationTime).toISOString()}`);
      console.log(`   Last Sign In: ${userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).toISOString() : 'Never'}`);
      
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
        console.log('   ✅ User can login with email/password');
        console.log('   ℹ️ To test actual passwords, use the website login form');
      } else {
        console.log('   ❌ User can only login with Google or other providers');
      }
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase');
      } else {
        console.log('❌ Error getting user from Firebase:', error.message);
      }
    }
    
    console.log('\n🔍 Firebase Password Testing:');
    console.log('   Note: Firebase stores passwords securely and we cannot see the actual password');
    console.log('   Firebase handles password verification internally');
    console.log('   To test passwords, use the website login form at:');
    console.log('   https://escrow-account-ledger.web.app');
    
    console.log('\n📋 Expected Results:');
    console.log('   ✅ Aadarsh9310@ should work (current password)');
    console.log('   ❌ Aadarsh2002@ should fail (old password)');
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error.message);
  }
}

// Run the test
testFirebasePasswords().then(() => {
  console.log('\n✅ Firebase password test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
