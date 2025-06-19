const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// Create a new trip
const createTrip = async () => {
  const newTrip = new Trip({
    companyID: 1001,
    addedBy: '685139bc11a6086233038a7a',  // Trojan company manager ID
    addedByType: 'Company',
    busNumber: '1001-1',  // Using the first bus
    bus: '685139bc11a6086233038a84',  // First bus ID
    origin: 'دمشق',
    destination: 'حلب',
    departureDate: new Date('2025-06-20T08:00:00.000Z'),
    arrivalDate: new Date('2025-06-20T12:00:00.000Z'),
    departureTime: '10:00',
    arrivalTime: '14:00',
    cost: 30000,
    seatsAvailable: 40,
    seats: 40,
    status: 'scheduled'
  });

  try {
    const savedTrip = await newTrip.save();
    console.log('Trip created successfully:', {
      id: savedTrip._id,
      origin: savedTrip.origin,
      destination: savedTrip.destination,
      date: savedTrip.departureDate,
      seatsAvailable: savedTrip.seatsAvailable,
      cost: savedTrip.cost
    });
  } catch (error) {
    console.error('Error creating trip:', error.message);
  }
};

// Run the script
const runScript = async () => {
  await connectDB();
  await createTrip();
  process.exit(0);
};

runScript();
