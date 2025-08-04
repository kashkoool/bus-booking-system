const mongoose = require('mongoose');
const Staff = require('../models/Staff');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_booking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Migration function
const updateStaffFields = async () => {
  try {
    await connectDB();

    // Update all staff documents that don't have the new fields
    const result = await Staff.updateMany(
      {
        $or: [
          { isActive: { $exists: false } },
          { status: { $exists: false } }
        ]
      },
      {
        $set: {
          isActive: true,
          status: 'active',
          lastLogin: null,
          profilePicture: '',
          notes: ''
        }
      },
      { multi: true }
    );

    console.log('Migration completed successfully:');
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents modified: ${result.modifiedCount}`);

    // Create indexes
    await Staff.syncIndexes();
    console.log('Indexes synchronized');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
updateStaffFields();
