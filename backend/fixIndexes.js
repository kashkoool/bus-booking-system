const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('staffs');

    // Drop all existing indexes except _id_
    const indexes = await collection.indexes();
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (err) {
          console.log(`Error dropping index ${index.name}:`, err.message);
        }
      }
    }

    // Create indexes with explicit names
    await collection.createIndex(
      { username: 1 },
      {
        name: 'username_unique',
        unique: true
      }
    );
    console.log('Created unique index on username');

    await collection.createIndex(
      { phone: 1 },
      {
        name: 'phone_unique',
        unique: true
      }
    );
    console.log('Created unique index on phone');

    await collection.createIndex(
      { email: 1 },
      {
        name: 'email_unique',
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } }
      }
    );
    console.log('Created partial unique index on email');

    console.log('All indexes have been recreated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  fixIndexes();
}
