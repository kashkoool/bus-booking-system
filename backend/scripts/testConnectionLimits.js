const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcwNjMwODk3ZTYwNmNkNzA2N2Q5ZjciLCJ1c2VyVHlwZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzUwNDcyODAwLCJleHAiOjE3NTA1NTkyMDB9.test';

console.log('🧪 Testing Connection Limits and Rate Limiting...\n');

// Test 1: Normal connection
console.log('📋 Test 1: Normal connection');
const socket1 = io(BASE_URL, {
  auth: {
    token: TEST_USER_TOKEN
  }
});

socket1.on('connect', () => {
  console.log('✅ Socket 1 connected successfully');
});

socket1.on('user-blocked', (data) => {
  console.log('🚫 Socket 1 blocked:', data.message);
});

// Test 2: Multiple connections (should hit limit)
console.log('\n📋 Test 2: Multiple connections (should hit limit)');
const sockets = [];

for (let i = 0; i < 5; i++) {
  const socket = io(BASE_URL, {
    auth: {
      token: TEST_USER_TOKEN
    }
  });
  
  socket.on('connect', () => {
    console.log(`✅ Socket ${i + 2} connected`);
  });
  
  socket.on('user-blocked', (data) => {
    console.log(`🚫 Socket ${i + 2} blocked:`, data.message);
  });
  
  sockets.push(socket);
}

// Test 3: Rate limiting
console.log('\n📋 Test 3: Rate limiting (rapid connections)');
setTimeout(() => {
  console.log('Attempting rapid connections...');
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const rapidSocket = io(BASE_URL, {
        auth: {
          token: TEST_USER_TOKEN
        }
      });
      
      rapidSocket.on('connect', () => {
        console.log(`✅ Rapid socket ${i + 1} connected`);
      });
      
      rapidSocket.on('user-blocked', (data) => {
        console.log(`🚫 Rapid socket ${i + 1} blocked:`, data.message);
      });
    }, i * 100); // 100ms apart
  }
}, 2000);

// Test 4: Cleanup
setTimeout(() => {
  console.log('\n🧹 Cleaning up connections...');
  
  // Disconnect all sockets
  socket1.disconnect();
  sockets.forEach(socket => socket.disconnect());
  
  console.log('✅ All test connections cleaned up');
  process.exit(0);
}, 10000);

console.log('\n⏰ Tests will run for 10 seconds...'); 