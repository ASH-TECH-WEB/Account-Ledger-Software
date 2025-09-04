/**
 * Test Deployed API Script
 * 
 * Tests the deployed Vercel API to check if it's working correctly
 */

const fetch = require('node-fetch');

async function testDeployedAPI() {
  try {
    console.log('🔍 Testing Deployed Vercel API...\n');
    
    const apiUrl = 'https://account-ledger-software-oul4r93vr-aadarsh2021s-projects.vercel.app/api';
    
    // Test 1: Health check
    console.log('1️⃣ Testing Health Check...');
    try {
      const healthResponse = await fetch(`${apiUrl}/health`);
      const healthData = await healthResponse.json();
      console.log('   Health Status:', healthResponse.status);
      console.log('   Health Data:', healthData);
    } catch (error) {
      console.log('   ❌ Health check failed:', error.message);
    }
    
    // Test 2: Authentication status
    console.log('\n2️⃣ Testing Authentication Status...');
    try {
      const authResponse = await fetch(`${apiUrl}/authentication`);
      const authData = await authResponse.json();
      console.log('   Auth Status:', authResponse.status);
      console.log('   Auth Data:', authData);
    } catch (error) {
      console.log('   ❌ Auth status failed:', error.message);
    }
    
    // Test 3: Test login with correct password
    console.log('\n3️⃣ Testing Login with Aadarsh2002@...');
    try {
      const loginResponse = await fetch(`${apiUrl}/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'thakuraadarsh1@gmail.com',
          password: 'Aadarsh2002@'
        })
      });
      
      const loginData = await loginResponse.json();
      console.log('   Login Status:', loginResponse.status);
      console.log('   Login Data:', loginData);
      
      if (loginData.success) {
        console.log('   ✅ Login successful!');
      } else {
        console.log('   ❌ Login failed:', loginData.message);
      }
    } catch (error) {
      console.log('   ❌ Login test failed:', error.message);
    }
    
    // Test 4: Test login with old password
    console.log('\n4️⃣ Testing Login with Aadarsh9310@ (should fail)...');
    try {
      const oldLoginResponse = await fetch(`${apiUrl}/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'thakuraadarsh1@gmail.com',
          password: 'Aadarsh9310@'
        })
      });
      
      const oldLoginData = await oldLoginResponse.json();
      console.log('   Old Login Status:', oldLoginResponse.status);
      console.log('   Old Login Data:', oldLoginData);
      
      if (oldLoginData.success) {
        console.log('   ⚠️ Old password still works (unexpected)');
      } else {
        console.log('   ✅ Old password correctly rejected');
      }
    } catch (error) {
      console.log('   ❌ Old login test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run the test
testDeployedAPI().then(() => {
  console.log('\n✅ Deployed API test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
