const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

const MONGO_URI = 'mongodb://localhost:27017/bus_booking';

async function listBookingsForRoute() {
  await mongoose.connect(MONGO_URI);

  // Find all trips for حمص → حلب
  const trips = await Trip.find({ origin: 'حمص', destination: 'حلب' });
  const tripIds = trips.map(t => t._id);
  if (tripIds.length === 0) {
    console.log('No trips found for حمص → حلب');
    process.exit(0);
  }

  // Find all bookings for these trips
  const bookings = await Booking.find({ tripID: { $in: tripIds } }).sort({ createdAt: 1 });
  if (bookings.length === 0) {
    console.log('No bookings found for حمص → حلب');
    process.exit(0);
  }

  console.log(`Found ${bookings.length} bookings for حمص → حلب:`);
  for (const booking of bookings) {
    const trip = trips.find(t => t._id.equals(booking.tripID));
    console.log(`Booking ID: ${booking._id}`);
    console.log(`  Booking createdAt: ${booking.createdAt}`);
    if (trip) {
      console.log(`  TripID: ${trip._id}`);
      console.log(`  Trip departureDate: ${trip.departureDate}`);
      console.log(`  Trip origin: ${trip.origin}`);
      console.log(`  Trip destination: ${trip.destination}`);
    } else {
      console.log('  Trip not found!');
    }
    console.log('---');
  }

  await mongoose.disconnect();
}

listBookingsForRoute(); 