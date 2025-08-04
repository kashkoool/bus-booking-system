// Load environment variables from .env file
require("dotenv").config();

const connectDB = require('./config/db');  // MongoDB connection
const express = require('express');
const path = require('path'); // Import the 'path' module
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const http = require('http'); // Add HTTP module for Socket.IO
const socketIo = require('socket.io'); // Add Socket.IO
const { authenticateSocket, getUserId } = require('./middleware/socketAuth');

const cron = require('node-cron');  // Import the new route file
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://172.20.10.3:3000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Track user connections and room memberships
const userConnections = new Map(); // userId -> { socketId, roomJoins, lastActivity }
const roomMembers = new Map(); // roomId -> Set of socketIds
const blockedUsers = new Map(); // userId -> { reason, blockedAt, expiresAt }
const connectionAttempts = new Map(); // userId -> { count, lastAttempt }
const connectionCounter = { total: 0, active: 0 }; // Track connection statistics
const ROOM_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
const MAX_ROOM_JOINS = 5; // Maximum room joins per user
const MAX_CONCURRENT_CONNECTIONS = 10; // Maximum concurrent connections per user
const BOOKING_BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CONNECTION_ATTEMPT_WINDOW = 10 * 1000; // 10 seconds window for connection attempts
const MAX_CONNECTION_ATTEMPTS = 10; // Maximum connection attempts per window

// Cleanup function for expired rooms
const cleanupExpiredRooms = () => {
  const now = Date.now();
  
  userConnections.forEach((userData, userId) => {
    if (now - userData.lastActivity > ROOM_TIMEOUT) {
      // Kick user out of all rooms
      if (userData.socketId && io.sockets.sockets.has(userData.socketId)) {
        const socket = io.sockets.sockets.get(userData.socketId);
        if (socket) {
          // Get all rooms the user is in
          const userRooms = Array.from(socket.rooms);
          userRooms.forEach(room => {
            if (room !== socket.id && room.startsWith('trip-')) {
              socket.leave(room);
              console.log(`⏰ Kicked user ${userId} out of room ${room} due to timeout`);
              
              // Update room members tracking
              if (roomMembers.has(room)) {
                roomMembers.get(room).delete(socket.id);
                if (roomMembers.get(room).size === 0) {
                  roomMembers.delete(room);
                }
              }
            }
          });
        }
      }
      
      // Reset user data
      userConnections.set(userId, {
        socketId: userData.socketId,
        roomJoins: 0,
        lastActivity: now
      });
    }
  });
  
  // Cleanup expired blocks
  blockedUsers.forEach((blockData, userId) => {
    if (now > blockData.expiresAt) {
      blockedUsers.delete(userId);
      console.log(`✅ User ${userId} booking block expired`);
    }
  });
  
  // Cleanup old connection attempts
  connectionAttempts.forEach((attemptData, userId) => {
    if (now - attemptData.lastAttempt > CONNECTION_ATTEMPT_WINDOW) {
      connectionAttempts.delete(userId);
    }
  });
};

// Function to check if user is blocked
const isUserBlocked = (userId) => {
  if (!userId) return false;
  
  const blockData = blockedUsers.get(userId);
  if (!blockData) return false;
  
  const now = Date.now();
  if (now > blockData.expiresAt) {
    blockedUsers.delete(userId);
    return false;
  }
  
  return {
    blocked: true,
    reason: blockData.reason,
    blockedAt: blockData.blockedAt,
    expiresAt: blockData.expiresAt,
    remainingTime: Math.ceil((blockData.expiresAt - now) / 1000) // seconds
  };
};

// Function to block a user
const blockUser = (userId, reason) => {
  const now = Date.now();
  const expiresAt = now + BOOKING_BLOCK_DURATION;
  
  blockedUsers.set(userId, {
    reason,
    blockedAt: now,
    expiresAt
  });
  
  console.log(`🚫 User ${userId} blocked for booking: ${reason} (expires at ${new Date(expiresAt).toLocaleTimeString()})`);
  
  return {
    blocked: true,
    reason,
    blockedAt: now,
    expiresAt,
    remainingTime: BOOKING_BLOCK_DURATION / 1000
  };
};

// Function to check connection limits
const checkConnectionLimits = (userId) => {
  if (!userId) return { allowed: true };
  
  const now = Date.now();
  const attemptData = connectionAttempts.get(userId);
  
  // Check if user is already blocked
  const blockCheck = isUserBlocked(userId);
  if (blockCheck.blocked) {
    return { allowed: false, reason: 'blocked', blockData: blockCheck };
  }
  
  // Rate limiting: Check if user is making too many connection attempts
  if (attemptData && now - attemptData.lastAttempt < CONNECTION_ATTEMPT_WINDOW) {
    if (attemptData.count >= MAX_CONNECTION_ATTEMPTS) {
      // Block user for excessive connection attempts
      const blockResult = blockUser(userId, `Too many connection attempts (${attemptData.count}/${MAX_CONNECTION_ATTEMPTS})`);
      return { allowed: false, reason: 'rate_limited', blockData: blockResult };
    }
  }
  
  // Count active connections for this user
  const activeConnections = Array.from(io.sockets.sockets.values())
    .filter(s => {
      const sUserId = getUserId(s);
      return sUserId && sUserId === userId;
    }).length;
  
  if (activeConnections >= MAX_CONCURRENT_CONNECTIONS) {
    // Track connection attempts to reduce logging
    if (!attemptData || now - attemptData.lastAttempt > CONNECTION_ATTEMPT_WINDOW) {
      connectionAttempts.set(userId, { count: 1, lastAttempt: now });
      console.log(`🚫 User ${userId} has too many connections (${activeConnections}/${MAX_CONCURRENT_CONNECTIONS})`);
      
      // Block user for 5 minutes
      const blockResult = blockUser(userId, `Too many connections (${activeConnections}/${MAX_CONCURRENT_CONNECTIONS})`);
      return { allowed: false, reason: 'too_many_connections', blockData: blockResult };
    } else {
      // Increment attempt counter but don't log again
      attemptData.count++;
      attemptData.lastAttempt = now;
      connectionAttempts.set(userId, attemptData);
      
      // Only log every 5th attempt to reduce spam
      if (attemptData.count % 5 === 0) {
        console.log(`🚫 User ${userId} still has too many connections (${activeConnections}/${MAX_CONCURRENT_CONNECTIONS}) - attempt #${attemptData.count}`);
      }
      
      return { allowed: false, reason: 'too_many_connections', silent: true };
    }
  }
  
  // Reset connection attempts on successful connection
  if (attemptData) {
    connectionAttempts.delete(userId);
  }
  
  return { allowed: true };
};

// Run cleanup every minute
setInterval(cleanupExpiredRooms, 60 * 1000);

// Socket authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  const userId = getUserId(socket);
  
  // Check connection limits before proceeding
  const limitCheck = checkConnectionLimits(userId);
  if (!limitCheck.allowed) {
    if (limitCheck.reason === 'blocked') {
      socket.emit('user-blocked', {
        message: `You have been blocked from booking. Please wait ${limitCheck.blockData.remainingTime} seconds before trying again.`,
        reason: limitCheck.blockData.reason,
        remainingTime: limitCheck.blockData.remainingTime
      });
    } else if (limitCheck.reason === 'rate_limited') {
      socket.emit('user-blocked', {
        message: `You have been blocked from booking for 5 minutes due to too many connection attempts. Please wait before trying again.`,
        reason: limitCheck.blockData.reason,
        remainingTime: limitCheck.blockData.remainingTime,
        maxAttempts: MAX_CONNECTION_ATTEMPTS
      });
    } else if (limitCheck.reason === 'too_many_connections') {
      if (!limitCheck.silent) {
        socket.emit('user-blocked', {
          message: `You have been blocked from booking for 5 minutes due to too many browser tabs. Please close some tabs and try again.`,
          reason: limitCheck.blockData.reason,
          remainingTime: limitCheck.blockData.remainingTime,
          maxConnections: MAX_CONCURRENT_CONNECTIONS
        });
      }
    }
    
    // Disconnect the user after a short delay
    setTimeout(() => {
      if (socket.connected) {
        socket.disconnect();
      }
    }, 2000);
    return;
  }
  
  // Only log successful connections
  connectionCounter.total++;
  connectionCounter.active++;
  console.log(`✅ User connected: ${socket.id} (User: ${userId}, Type: ${socket.userType}) - Total: ${connectionCounter.total}, Active: ${connectionCounter.active}`);
  
  // Track user connection (only for authenticated users)
  if (userId && socket.userType !== 'anonymous') {
    const existingUser = userConnections.get(userId);
    userConnections.set(userId, {
      socketId: socket.id,
      roomJoins: existingUser?.roomJoins || 0,
      lastActivity: Date.now()
    });
  }

  // Join a trip room for real-time updates
  socket.on('join-trip', (tripId) => {
    // Only apply room join limits to authenticated users
    const userData = userId && socket.userType !== 'anonymous' ? userConnections.get(userId) : null;
    
    // Check room join limits (only for authenticated users)
    if (userData && userData.roomJoins >= MAX_ROOM_JOINS) {
      console.log(`🚫 User ${userId} has too many room joins (${userData.roomJoins}/${MAX_ROOM_JOINS})`);
      
      // Block user for 5 minutes
      const blockResult = blockUser(userId, `Too many room joins (${userData.roomJoins}/${MAX_ROOM_JOINS})`);
      
      socket.emit('user-blocked', {
        message: `You have been blocked from booking for 5 minutes due to joining too many trip rooms. Please leave some rooms and try again.`,
        reason: blockResult.reason,
        remainingTime: blockResult.remainingTime,
        maxJoins: MAX_ROOM_JOINS,
        currentJoins: userData.roomJoins
      });
      
      // Disconnect the user
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect();
        }
      }, 2000);
      return;
    }
    
    const roomName = `trip-${tripId}`;
    
    // Check if user is already in this room
    if (socket.rooms.has(roomName)) {
      console.log(`⚠️ User ${userId || socket.id} already in room ${roomName}`);
      return;
    }
    
    // Join the room
    socket.join(roomName);
    
    // Track room membership
    if (!roomMembers.has(roomName)) {
      roomMembers.set(roomName, new Set());
    }
    roomMembers.get(roomName).add(socket.id);
    
    // Update user tracking (only for authenticated users)
    if (userData && userId && socket.userType !== 'anonymous') {
      userData.roomJoins++;
      userData.lastActivity = Date.now();
      userConnections.set(userId, userData);
    }
    
    console.log(`👥 User ${userId || socket.id} joined trip room: ${roomName} (${userData ? userData.roomJoins : 'N/A'}/${MAX_ROOM_JOINS})`);
    
    // Send room info to user
    socket.emit('room-joined', {
      tripId,
      roomName,
      joinCount: userData ? userData.roomJoins : 0,
      maxJoins: MAX_ROOM_JOINS,
      timeoutMinutes: ROOM_TIMEOUT / 60000
    });
  });

  // Leave a trip room
  socket.on('leave-trip', (tripId) => {
    const roomName = `trip-${tripId}`;
    socket.leave(roomName);
    
    // Update room members tracking
    if (roomMembers.has(roomName)) {
      roomMembers.get(roomName).delete(socket.id);
      if (roomMembers.get(roomName).size === 0) {
        roomMembers.delete(roomName);
      }
    }
    
    // Update user tracking (only for authenticated users)
    if (userId && socket.userType !== 'anonymous') {
      const userData = userConnections.get(userId);
      if (userData) {
        userData.lastActivity = Date.now();
        userConnections.set(userId, userData);
      }
    }
    
    console.log(`👋 User ${userId || socket.id} left trip room: ${roomName}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    connectionCounter.active = Math.max(0, connectionCounter.active - 1);
    console.log(`❌ User disconnected: ${socket.id} (Reason: ${reason}) - Active: ${connectionCounter.active}`);
    
    // Clean up room memberships
    const userRooms = Array.from(socket.rooms);
    userRooms.forEach(room => {
      if (room !== socket.id && room.startsWith('trip-')) {
        if (roomMembers.has(room)) {
          roomMembers.get(room).delete(socket.id);
          if (roomMembers.get(room).size === 0) {
            roomMembers.delete(room);
          }
        }
      }
    });
    
    // Remove user from tracking (only for authenticated users)
    if (userId && socket.userType !== 'anonymous') {
      userConnections.delete(userId);
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  // Handle test events from frontend
  socket.on('test-event', (data) => {
    console.log('🎯 Backend received test event:', data);
    // Echo back to the sender
    socket.emit('test-response', { message: 'Test response from backend', originalData: data });
  });
  
  // Handle ping to keep connection alive
  socket.on('ping', () => {
    if (userId && socket.userType !== 'anonymous') {
      const userData = userConnections.get(userId);
      if (userData) {
        userData.lastActivity = Date.now();
        userConnections.set(userId, userData);
      }
    }
    socket.emit('pong');
  });
});

// Make io available globally for use in routes
app.set('io', io);

// Make blockedUsers available globally
io.blockedUsers = blockedUsers;

// Request ID middleware - must be before CORS and other middleware
app.use((req, res, next) => {
    // Generate a unique request ID
    const requestId = uuidv4();
    
    // Add request ID to request object for use in other middleware
    req.requestId = requestId;
    
    // Add request ID to response headers for client-side tracking
    res.setHeader('X-Request-ID', requestId);
    
    next();
});

// Enable CORS with additional exposed headers
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://172.20.10.3:3000'
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-ID'] // Expose the request ID to the client
}));

require('./cronJobs'); // Import and run the cron job

// Middleware to parse JSON request bodies with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        JSON.parse(buf);
      }
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format in request body',
        error: e.message
      });
      throw new Error('Invalid JSON');
      throw new Error('Invalid JSON');
    }
  }
}));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'uploads' folder for company logos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize models
const models = require('./models');

// Make models available globally for easier access in routes
app.set('models', models);

// Routes
const routers = [
  { path: '/api/shared', router: require('./routes/Sharedrouter') },
  { path: '/api/admin', router: require('./routes/AdminRoute') },
  { path: '/api/company', router: require('./routes/MCompany') },
  { path: '/api/staff', router: require('./routes/StaffRoute') },
  { path: '/api/user', router: require('./routes/UserRoute') },
  { path: '/api/demand', router: require('./routes/demandRoutes') },
];

routers.forEach((route) => {
  app.use(route.path, route.router);
});

// MongoDB Connection
connectDB();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server is ready for real-time connections`);
});