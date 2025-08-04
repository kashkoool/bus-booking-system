// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.TEST_PORT || 5002;
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_COOKIE_EXPIRE = '30';

// Set up global test variables
global.__MONGO_URI__ = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/bus_booking_test';

// Configure mongoose to use native promises
mongoose.Promise = global.Promise;

// Mock console methods to keep test output clean
const originalConsole = { ...console };

beforeAll(async () => {
  // Start in-memory MongoDB server if TEST_MONGO_URI is not set
  if (!process.env.TEST_MONGO_URI) {
    const mongoServer = await MongoMemoryServer.create();
    process.env.TEST_MONGO_URI = mongoServer.getUri();
    global.__MONGOD = mongoServer;
  }

  // Connect to the test database
  await mongoose.connect(process.env.TEST_MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Suppress Mongoose deprecation warnings
  mongoose.set('useCreateIndex', true);
  mongoose.set('useFindAndModify', false);

  // Mock console methods
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(async () => {
  // Close the database connection and stop the in-memory server
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  if (global.__MONGOD) {
    await global.__MONGOD.stop();
  }
  
  // Restore original console methods
  global.console = originalConsole;
});

// Clean up database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Add global test utilities
global.setupTestDB = async () => {
  // Clear all test data
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Export test utilities
module.exports = {
  setupTestDB,
};
