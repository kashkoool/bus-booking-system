const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Staff = require('../models/Staff');
const Company = require('../models/Company');

const MONGO_URI = 'mongodb://localhost:27017/bus_booking';

function getTuesdaysInRange(startDate, endDate) {
  const dates = [];
  let d = new Date(startDate);
  d.setHours(10, 0, 0, 0); // 10:00 AM
  // Go to the first Tuesday
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  while (d <= endDate) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

async function createTrips() {
  await mongoose.connect(MONGO_URI);

  // Use the provided bus
  const bus = await Bus.findOne({ _id: '685f44a71a37a3c9738c84f9' });
  if (!bus) {
    console.error('No bus found with _id 685f44a71a37a3c9738c84f9');
    process.exit(1);
  }

  // Create trips for every Tuesday in July and August 2025
  const start = new Date('2025-07-01');
  const end = new Date('2025-08-31');
  const tuesdays = getTuesdaysInRange(start, end);

  for (const depDate of tuesdays) {
    const arrDate = new Date(depDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours later
    try {
      const trip = await Trip.create({
        companyID: 1001,
        addedBy: '6855ee79645875b574052961',
        addedByType: 'Company',
        busNumber: bus.busNumber,
        bus: bus._id,
        origin: 'حمص',
        destination: 'حلب',
        departureDate: depDate,
        arrivalDate: arrDate,
        departureTime: '10:00',
        arrivalTime: '14:00',
        cost: 12000,
        seatsAvailable: bus.seats,
        seats: bus.seats,
        status: 'scheduled',
        ratings: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Created trip:', trip.departureDate);
    } catch (err) {
      console.error('Failed to create trip for', depDate, err.message);
    }
  }
  await mongoose.disconnect();
}

createTrips(); 