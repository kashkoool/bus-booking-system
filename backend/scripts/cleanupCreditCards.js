const mongoose = require('mongoose');
require('dotenv').config();
const CreditCard = require('../models/CreditCard');

async function cleanupCreditCards() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find and remove all credit cards with null cardNumberHash
    const result = await CreditCard.deleteMany({
      $or: [
        { cardNumberHash: null },
        { cardNumberHash: { $exists: false } }
      ]
    });

    console.log(`Successfully removed ${result.deletedCount} documents with null or missing cardNumberHash`);
    
    // Recreate the index to ensure it's properly set up
    await CreditCard.init();
    console.log('CreditCard indexes recreated successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupCreditCards();
