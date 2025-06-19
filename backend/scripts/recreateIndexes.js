const mongoose = require('mongoose');
require('dotenv').config();

async function recreateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    
    // Get the CreditCard model to ensure it's loaded and registered
    require('../models/CreditCard');
    
    // Get the collection
    const collection = mongoose.connection.db.collection('creditcards');
    
    // Drop the existing index if it exists
    try {
      await collection.dropIndex('user_1_cardNumberHash_1');
      console.log('Dropped existing index');
    } catch (err) {
      if (err.codeName !== 'IndexNotFound') {
        throw err;
      }
      console.log('No existing index to drop');
    }
    
    // Recreate the index with proper configuration
    await collection.createIndex(
      { user: 1, cardNumberHash: 1 },
      {
        name: 'user_1_cardNumberHash_1',
        unique: true,
        partialFilterExpression: { cardNumberHash: { $exists: true, $ne: null } }
      }
    );
    
    console.log('Successfully recreated index with proper configuration');
    
    // Verify the index
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error recreating indexes:', error);
    process.exit(1);
  }
}

recreateIndexes();
