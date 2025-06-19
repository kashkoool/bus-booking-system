// Load environment variables from .env file
require("dotenv").config();

const connectDB = require('./config/db');  // MongoDB connection
const express = require('express');
const path = require('path'); // Import the 'path' module
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');

const cron = require('node-cron');  // Import the new route file
const app = express();

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
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    allowedHeaders: ['Content-Type', 'Authorization'],
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});