const mongoose = require('mongoose');

// Enable debug logging for all queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
});

// Set strictPopulate to false globally
mongoose.set('strictPopulate', false);

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/travels2', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Add connection event listeners
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    
    console.log('MongoDB Connected...');
    
    // Log all registered models and their schemas
    console.log('Registered Models:', Object.keys(mongoose.models));
    
    // Log the schemas for debugging
    Object.entries(mongoose.models).forEach(([name, model]) => {
      console.log(`\nModel: ${name}`);
      console.log('Schema Paths:', Object.keys(model.schema.paths));
      console.log('Virtuals:', Object.keys(model.schema.virtuals));
    });
    
    return mongoose.connection;
  } catch (err) {
    console.error('MongoDB connection error:', {
      message: err.message,
      name: err.name,
      code: err.code,
      codeName: err.codeName,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

module.exports = connectDB;
