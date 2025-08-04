const jwt = require('jsonwebtoken');

// Track authentication attempts to reduce logging
const authAttempts = new Map();
const AUTH_LOG_THROTTLE = 10000; // 10 seconds

const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    
    // Check for null, undefined, or empty token
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      // Only log occasionally for missing tokens
      const now = Date.now();
      const key = 'no-token';
      const lastLog = authAttempts.get(key) || 0;
      
      if (now - lastLog > AUTH_LOG_THROTTLE) {
        console.log('🔐 Socket authentication: No token provided');
        authAttempts.set(key, now);
      }
      
      socket.userType = 'anonymous';
      socket.userId = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Extract user information from token payload
    // Token payload uses 'id' instead of 'userId' and includes 'userType'
    socket.userId = decoded.id || decoded.userId;
    socket.userType = decoded.userType || decoded.role || 'anonymous';

    // Only allow customers
    if (socket.userType !== 'customer') {
      return next(new Error('Socket.IO connections are only allowed for customers.'));
    }
    
    // Only log successful authentications occasionally
    const now = Date.now();
    const key = `auth-${socket.userId}`;
    const lastLog = authAttempts.get(key) || 0;
    
    if (now - lastLog > AUTH_LOG_THROTTLE) {
      console.log(`🔐 Socket authenticated: ${socket.userType} ${socket.userId}`);
      authAttempts.set(key, now);
    }
    
    next();
  } catch (error) {
    // Only log authentication errors occasionally
    const now = Date.now();
    const key = 'auth-error';
    const lastLog = authAttempts.get(key) || 0;
    
    if (now - lastLog > AUTH_LOG_THROTTLE) {
      console.error('❌ Socket authentication error:', error.message);
      authAttempts.set(key, now);
    }
    
    socket.userType = 'anonymous';
    socket.userId = null;
    next();
  }
};

const getUserId = (socket) => {
  return socket.userId;
};

module.exports = {
  authenticateSocket,
  getUserId
}; 