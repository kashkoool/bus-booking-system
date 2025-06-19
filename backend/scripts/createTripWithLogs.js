const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Connecting to MongoDB...');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Found' : 'Missing');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
};

const createTrip = async () => {
  console.log('\n🔍 Loading Trip model...');
  const Trip = require('../models/Trip');
  
  const tripData = {
    companyID: 1001,
    addedBy: '685139bc11a6086233038a7a',
    addedByType: 'Company',
    busNumber: '1001-1',
    bus: '685139bc11a6086233038a84',
    origin: 'دمشق',
    destination: 'حلب',
    departureDate: new Date('2025-06-20T08:00:00.000Z'),
    arrivalDate: new Date('2025-06-20T12:00:00.000Z'),
    departureTime: '10:00',
    arrivalTime: '14:00',
    cost: 30000,
    seatsAvailable: 40,
    seats: 40,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('\n🚌 Creating trip with data:', JSON.stringify(tripData, null, 2));

  try {
    const newTrip = new Trip(tripData);
    const savedTrip = await newTrip.save();
    console.log('\n✅ Trip created successfully!');
    console.log('Trip ID:', savedTrip._id);
    console.log('Origin:', savedTrip.origin);
    console.log('Destination:', savedTrip.destination);
    console.log('Date:', savedTrip.departureDate);
    console.log('Seats Available:', savedTrip.seatsAvailable);
    console.log('Cost:', savedTrip.cost);
    return savedTrip;
  } catch (error) {
    console.error('\n❌ Error creating trip:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }
};

const main = async () => {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      console.log('❌ Could not connect to database');
      process.exit(1);
    }
    
    await createTrip();
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
};

main();
