const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

const MONGO_URI = 'mongodb://localhost:27017/bus_booking';

// CONFIGURABLE
const ORIGIN = 'حمص';
const DESTINATION = 'حلب';
const NUM_WEEKS = 12; // How many weeks back
const DAYS_OF_WEEK = [2, 5]; // 2=Tuesday, 5=Friday

function getDatesForDaysOfWeek(daysOfWeek, numWeeks) {
  const dates = [];
  const now = new Date();
  for (const dayOfWeek of daysOfWeek) {
    let d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() - dayOfWeek + 7) % 7));
    for (let i = 0; i < numWeeks; i++) {
      dates.push(new Date(d));
      d.setDate(d.getDate() - 7);
    }
  }
  return dates;
}

async function seedBookings() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  // Find a trip for the route
  const trip = await Trip.findOne({ origin: ORIGIN, destination: DESTINATION });
  if (!trip) {
    console.error(`No trip found for ${ORIGIN} → ${DESTINATION}`);
    process.exit(1);
  }
  console.log(`Using trip: ${trip._id} (${ORIGIN} → ${DESTINATION})`);

  const dates = getDatesForDaysOfWeek(DAYS_OF_WEEK, NUM_WEEKS);
  for (const date of dates) {
    const numBookings = Math.floor(Math.random() * 5) + 1; // 1-5 bookings per day
    for (let i = 0; i < numBookings; i++) {
      const noOfSeats = Math.floor(Math.random() * 4) + 1;
      const totalAmount = noOfSeats * (trip.cost || 10000);
      const passengers = Array.from({ length: noOfSeats }, (_, idx) => ({
        firstName: `Test${i}`,
        lastName: `User${i}`,
        gender: idx % 2 === 0 ? 'male' : 'female',
        seatNumber: idx + 1,
        age: 30
      }));
      const assignedSeats = passengers.map(p => p.seatNumber);
      const booking = new Booking({
        userEmail: `test${i}@example.com`,
        tripID: trip._id,
        passengers,
        noOfSeats,
        assignedSeats,
        status: 'confirmed',
        bookingType: 'online',
        staffID: null,
        paymentStatus: 'paid',
        totalAmount,
        refundStatus: null,
        createdAt: date,
        updatedAt: date,
      });
      await booking.save();
      console.log(`Created booking for ${ORIGIN} → ${DESTINATION} on ${date.toISOString().split('T')[0]}`);
    }
  }

  await mongoose.disconnect();
  console.log('Done!');
}

seedBookings().catch(e => { console.error(e); process.exit(1); }); 