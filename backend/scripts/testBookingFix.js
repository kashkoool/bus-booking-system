const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcwNjMwODk3ZTYwNmNkNzA2N2Q5ZjciLCJ1c2VyVHlwZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzUwNDcyODAwLCJleHAiOjE3NTA1NTkyMDB9.test';

console.log('🧪 Testing Booking After ObjectId Fix...\n');

// Test booking data
const bookingData = {
  tripID: '686a988bc6ef8e8c57e7845a',
  noOfSeats: 1,
  passengers: [
    {
      name: 'Test User',
      gender: 'male',
      phone: '1234567890'
    }
  ]
};

async function testBooking() {
  try {
    console.log('📋 Test: Booking with fixed ObjectId and session handling');
    console.log('📊 Booking data:', bookingData);
    
    const response = await axios.post(`${BASE_URL}/api/user/book-trip`, bookingData, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Booking successful!');
    console.log('📊 Response:', response.data);
    
  } catch (error) {
    console.log('❌ Booking failed');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    } else {
      console.log('📊 Error:', error.message);
    }
  }
}

// Test available seats endpoint
async function testAvailableSeats() {
  try {
    console.log('\n📋 Test: Available seats endpoint');
    
    const response = await axios.get(`${BASE_URL}/api/user/trips/686a988bc6ef8e8c57e7845a/available-seats`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });
    
    console.log('✅ Available seats retrieved!');
    console.log('📊 Response:', response.data);
    
  } catch (error) {
    console.log('❌ Available seats failed');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    } else {
      console.log('📊 Error:', error.message);
    }
  }
}

// Run the tests
async function runTests() {
  await testAvailableSeats();
  await testBooking();
}

runTests(); 