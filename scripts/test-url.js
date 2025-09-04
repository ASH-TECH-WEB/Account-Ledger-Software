/**
 * Test URL Script
 * 
 * Tests what the API URL is actually returning
 */

const fetch = require('node-fetch');

async function testURL() {
  try {
    const url = 'https://account-ledger-software-oul4r93vr-aadarsh2021s-projects.vercel.app/api/health';
    console.log('🔍 Testing URL:', url);
    
    const response = await fetch(url);
    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('📄 Response (first 500 chars):', text.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testURL();
