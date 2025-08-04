const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const app = require('../app');

/**
 * Create a test user in the database
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} Created user document
 */
async function createTestUser(userData) {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
    ...userData
  };

  // Hash password if provided
  if (defaultUser.password) {
    const salt = await bcrypt.genSalt(10);
    defaultUser.password = await bcrypt.hash(defaultUser.password, salt);
  }

  return await User.create(defaultUser);
}

/**
 * Get authentication token for a test user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} JWT token
 */
async function getAuthToken(email, password) {
  const res = await request(app)
    .post('/api/user/login')
    .send({ email, password });
    
  return res.body.token;
}

/**
 * Generate a JWT token for testing
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateTestToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' }
  );
}

module.exports = {
  createTestUser,
  getAuthToken,
  generateTestToken
};
