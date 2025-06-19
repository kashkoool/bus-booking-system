require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import the CreditCard model
require('../models/CreditCard'); // This will register the model with Mongoose
const CreditCard = mongoose.model('CreditCard');

// Configuration
const CONNECTION_OPTIONS = {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 30000
};

// Expected index definition
const EXPECTED_INDEX = {
  name: 'unique_card_per_user',
  key: { user: 1, cardNumberHash: 1 },
  unique: true,
  partialFilterExpression: { cardNumberHash: { $exists: true } }
};

async function verifyIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, CONNECTION_OPTIONS);
    console.log('Connected to MongoDB');

    // Ensure the model is compiled and connected
    const collection = mongoose.connection.db.collection('creditcards');
    console.log('Connected to collection:', collection.collectionName);
    
    try {
      // Get current indexes
      const indexes = await collection.indexes();
      console.log('Successfully retrieved indexes');
      
      // Check if our expected index exists
      const indexExists = indexes.some(index => {
        const keyMatch = JSON.stringify(index.key) === JSON.stringify(EXPECTED_INDEX.key);
        const nameMatch = index.name === EXPECTED_INDEX.name;
        const uniqueMatch = index.unique === true;
        
        console.log(`Checking index: ${index.name || 'unnamed'}`);
        console.log(`- Key match: ${keyMatch}`);
        console.log(`- Name match: ${nameMatch}`);
        console.log(`- Unique match: ${uniqueMatch}`);
        
        return keyMatch && nameMatch && uniqueMatch;
      });
      
      console.log('Index check complete');

    // Print index verification result
    console.log('\n' + '='.repeat(60));
    console.log('CARD INDEX VERIFICATION');
    console.log('='.repeat(60));
    
    if (indexExists) {
      console.log('✅ Found required unique index on (user, cardNumberHash)');
    } else {
      console.log('❌ Required unique index on (user, cardNumberHash) is MISSING');
      console.log('\nTo create the required index, run the following in your MongoDB shell:');
      console.log(`\ndb.creditcards.createIndex(
  { user: 1, cardNumberHash: 1 },
  {
    unique: true,
    name: 'unique_card_per_user',
    partialFilterExpression: { cardNumberHash: { $exists: true } }
  }
);`);
    }

    // Print all indexes for reference
    console.log('\nCurrent indexes on creditcards collection:');
    console.log('-' .repeat(60));
    indexes.forEach((index, i) => {
      console.log(`Index #${i}: ${index.name || 'unnamed'}`);
      console.log(`  Key: ${JSON.stringify(index.key)}`);
      console.log(`  Unique: ${!!index.unique}`);
      if (index.partialFilterExpression) {
        console.log(`  Partial: ${JSON.stringify(index.partialFilterExpression)}`);
      }
      console.log('-' .repeat(60));
    });

    // Check for potential duplicate card hashes per user
    if (indexExists) {
      console.log('\nChecking for existing duplicate card hashes...');
      
      const duplicates = await CreditCard.aggregate([
        {
          $match: {
            cardNumberHash: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: { user: '$user', cardNumberHash: '$cardNumberHash' },
            count: { $sum: 1 },
            cardIds: { $push: '$_id' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        },
        {
          $project: {
            userId: '$_id.user',
            cardNumberHash: '$_id.cardNumberHash',
            count: 1,
            cardIds: 1
          }
        },
        { $sort: { count: -1 } }
      ]);

      if (duplicates.length > 0) {
        console.log(`\n⚠️  Found ${duplicates.length} sets of duplicate card hashes:`);
        duplicates.forEach((dup, i) => {
          console.log(`\nDuplicate set #${i + 1}:`);
          console.log(`- User ID: ${dup.userId}`);
          console.log(`- Card Hash: ${dup.cardNumberHash.substring(0, 12)}...`);
          console.log(`- Number of duplicates: ${dup.count}`);
          console.log(`- Card IDs: ${dup.cardIds.slice(0, 3).join(', ')}${dup.cardIds.length > 3 ? `... (${dup.cardIds.length - 3} more)` : ''}`);
        });
        
        console.log('\nWARNING: These duplicates should be investigated and resolved.');
      } else {
        console.log('✅ No duplicate card hashes found.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error verifying indexes:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    // Log MongoDB connection state
    console.log('\nMongoDB connection state:', mongoose.connection.readyState);
    console.log('MongoDB connection config:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
    });
    
    process.exit(1);
  } finally {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
    } catch (closeError) {
      console.error('Error closing connection:', closeError.message);
    }
  }
}

// Run the verification
verifyIndexes();
