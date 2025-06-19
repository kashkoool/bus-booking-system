require('dotenv').config();
const mongoose = require('mongoose');

// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection options
const connectionOptions = {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 30000
};

async function createLast4Index() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    console.log('Connected to MongoDB');

    // Get the database instance
    const db = mongoose.connection.db;
    
    // Create the index
    console.log('Creating index on (user, cardNumberLast4)...');
    await db.collection('creditcards').createIndex(
      { user: 1, cardNumberLast4: 1 },
      {
        unique: true,
        name: 'unique_last4_per_user',
        partialFilterExpression: { cardNumberLast4: { $exists: true } }
      }
    );
    
    console.log('✅ Successfully created index on (user, cardNumberLast4)');
    
    // Verify the index was created
    const indexes = await db.collection('creditcards').indexes();
    const indexExists = indexes.some(index => 
      index.name === 'unique_last4_per_user'
    );
    
    if (indexExists) {
      console.log('✅ Verified index exists in the database');
    } else {
      console.log('⚠️  Index was not created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error creating index:', error.message);
    if (error.code === 85) {
      console.log('Note: If you\'re getting a duplicate key error, the index already exists with different options.');
      console.log('You may need to drop the existing index first using MongoDB shell:');
      console.log('db.creditcards.dropIndex("unique_last4_per_user")');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the function
createLast4Index();
