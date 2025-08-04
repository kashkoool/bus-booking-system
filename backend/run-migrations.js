const mongoose = require('mongoose');
require('dotenv').config();

// Import migrations
const migration1 = require('./migrations/003-add-staff-fields');
const migration2 = require('./migrations/004-update-staff-fields');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bus_booking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Connect to database
    await connectDB();
    
    // Define migrations to run in order
    const migrations = [
      {
        name: 'Add isActive and status fields to Staff collection',
        run: migration1
      },
      {
        name: 'Update staff fields with default values and new fields',
        run: migration2
      }
    ];
    
    // Run migrations in order
    for (const [index, migration] of migrations.entries()) {
      console.log(`\nRunning migration ${index + 1}: ${migration.name}`);
      try {
        await migration.run();
        console.log(`✅ Migration ${index + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${index + 1} failed:`, error);
        throw error; // Stop execution if any migration fails
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
