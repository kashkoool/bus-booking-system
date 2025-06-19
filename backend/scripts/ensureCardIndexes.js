const mongoose = require('mongoose');
require('dotenv').config();

async function ensureIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get the CreditCard model
    const CreditCard = require('../models/CreditCard');
    
    // Create the compound unique index
    console.log('Ensuring compound unique index exists...');
    await CreditCard.collection.createIndex(
      { user: 1, cardNumberHash: 1 },
      { 
        unique: true,
        name: 'unique_card_per_user',
        partialFilterExpression: { cardNumberHash: { $exists: true } }
      }
    );
    
    console.log('Indexes verified/created successfully');
    
    // List all indexes to verify
    const indexes = await CreditCard.collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error ensuring indexes:', error);
    process.exit(1);
  }
}

ensureIndexes();
