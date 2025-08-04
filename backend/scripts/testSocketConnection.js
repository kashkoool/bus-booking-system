const io = require('socket.io-client');

console.log('🧪 Testing Socket Connection with Fixed Authentication...\n');

// Test 1: Anonymous connection (no token)
async function testAnonymousConnection() {
  console.log('1️⃣ Testing Anonymous Connection...');
  
  const socket = io('http://localhost:5001', {
    auth: {
      userId: null,
      token: null
    }
  });
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Anonymous connection successful');
      console.log('Socket ID:', socket.id);
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Anonymous connection failed:', error);
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.error('❌ Anonymous connection timeout');
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

// Test 2: Connection with invalid token
async function testInvalidTokenConnection() {
  console.log('\n2️⃣ Testing Connection with Invalid Token...');
  
  const socket = io('http://localhost:5001', {
    auth: {
      userId: 'test-user',
      token: 'invalid-token'
    }
  });
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Invalid token connection successful (should be anonymous)');
      console.log('Socket ID:', socket.id);
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Invalid token connection failed:', error);
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.error('❌ Invalid token connection timeout');
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

// Test 3: Connection with null token string
async function testNullTokenConnection() {
  console.log('\n3️⃣ Testing Connection with Null Token String...');
  
  const socket = io('http://localhost:5001', {
    auth: {
      userId: 'test-user',
      token: 'null'
    }
  });
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Null token string connection successful (should be anonymous)');
      console.log('Socket ID:', socket.id);
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Null token string connection failed:', error);
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.error('❌ Null token string connection timeout');
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

// Test 4: Connection with empty token
async function testEmptyTokenConnection() {
  console.log('\n4️⃣ Testing Connection with Empty Token...');
  
  const socket = io('http://localhost:5001', {
    auth: {
      userId: 'test-user',
      token: ''
    }
  });
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Empty token connection successful (should be anonymous)');
      console.log('Socket ID:', socket.id);
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Empty token connection failed:', error);
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.error('❌ Empty token connection timeout');
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

// Run all tests
async function runTests() {
  try {
    await testAnonymousConnection();
    await testInvalidTokenConnection();
    await testNullTokenConnection();
    await testEmptyTokenConnection();
    
    console.log('\n🎉 All socket connection tests completed!');
    console.log('✅ Socket authentication should now handle malformed tokens gracefully');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests
runTests(); 