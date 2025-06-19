const mongoose = require('mongoose');
require('dotenv').config();

async function listIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get the CreditCard model
    const CreditCard = require('../models/CreditCard');
    
    // List all indexes
    const indexes = await CreditCard.collection.indexes();
    console.log('Current indexes on CreditCard collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Check if our unique index exists
    const hasUniqueIndex = indexes.some(
      idx => idx.name === 'unique_card_per_user' && 
            idx.unique === true &&
            JSON.stringify(idx.key) === JSON.stringify({ user: 1, cardNumberHash: 1 })
    );
    
    if (hasUniqueIndex) {
      console.log('✅ Unique index on (user, cardNumberHash) exists');
    } else {
      console.log('❌ Unique index on (user, cardNumberHash) is missing');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error listing indexes:', error);
    process.exit(1);
  }
}

listIndexes();
