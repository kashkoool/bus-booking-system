const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const Company = require('../models/Company');

const MONGO_URI = 'mongodb://localhost:27017/bus_booking';

async function createDiverseTripsAndBookings() {
  await mongoose.connect(MONGO_URI);

  // Find a company and bus to use
  const company = await Company.findOne({ role: 'manager' });
  const bus = await Bus.findOne();
  
  if (!company || !bus) {
    console.log('Need at least one company and bus in the database');
    process.exit(1);
  }

  console.log(`Using company: ${company.companyName}`);
  console.log(`Using bus: ${bus.busNumber}`);

  // Create trips for Tuesdays and Fridays over several weeks
  const startDate = new Date('2025-07-01'); // Start from July 1st
  const trips = [];
  
  for (let week = 0; week < 8; week++) { // 8 weeks of data
    // Tuesday trips
    const tuesdayDate = new Date(startDate);
    tuesdayDate.setDate(startDate.getDate() + (week * 7) + 1); // Tuesday is day 2 (0=Sunday)
    const tuesdayArrival = new Date(tuesdayDate);
    tuesdayArrival.setHours(tuesdayDate.getHours() + 4); // 4 hours trip
    
    const tuesdayTrip = new Trip({
      companyID: company.companyID,
      addedBy: company._id,
      addedByType: 'Company',
      busNumber: bus.busNumber,
      bus: bus._id,
      origin: 'حمص',
      destination: 'حلب',
      departureDate: tuesdayDate,
      arrivalDate: tuesdayArrival,
      departureTime: '08:00',
      arrivalTime: '12:00',
      cost: 1500,
      status: 'scheduled'
    });
    
    // Friday trips
    const fridayDate = new Date(startDate);
    fridayDate.setDate(startDate.getDate() + (week * 7) + 4); // Friday is day 5
    const fridayArrival = new Date(fridayDate);
    fridayArrival.setHours(fridayDate.getHours() + 4);
    
    const fridayTrip = new Trip({
      companyID: company.companyID,
      addedBy: company._id,
      addedByType: 'Company',
      busNumber: bus.busNumber,
      bus: bus._id,
      origin: 'حمص',
      destination: 'حلب',
      departureDate: fridayDate,
      arrivalDate: fridayArrival,
      departureTime: '14:00',
      arrivalTime: '18:00',
      cost: 1800, // Higher price for weekend
      status: 'scheduled'
    });
    
    trips.push(tuesdayTrip, fridayTrip);
  }

  // Save all trips
  const savedTrips = await Trip.insertMany(trips);
  console.log(`Created ${savedTrips.length} trips`);

  // Create bookings for each trip with varying numbers
  const bookings = [];
  
  for (const trip of savedTrips) {
    const dayOfWeek = trip.departureDate.getDay();
    const isWeekend = dayOfWeek === 5; // Friday
    
    // More bookings for weekends, fewer for weekdays
    const numBookings = isWeekend ? 
      Math.floor(Math.random() * 15) + 20 : // 20-35 bookings for Fridays
      Math.floor(Math.random() * 10) + 10;  // 10-20 bookings for Tuesdays
    
    for (let i = 0; i < numBookings; i++) {
      // Random number of seats per booking (1-3)
      const seats = Math.floor(Math.random() * 3) + 1;
      const assignedSeats = [];
      const passengers = [];
      for (let s = 0; s < seats; s++) {
        const seatNum = i * 3 + s + 1; // Unique seat number for demo
        assignedSeats.push(seatNum);
        passengers.push({
          firstName: `Passenger${i + 1}_${s + 1}`,
          lastName: `Test`,
          gender: s % 2 === 0 ? 'male' : 'female',
          seatNumber: seatNum,
          phone: `09${Math.floor(Math.random() * 90000000) + 10000000}`
        });
      }
      const booking = new Booking({
        tripID: trip._id,
        passengers,
        noOfSeats: seats,
        assignedSeats,
        status: 'confirmed',
        paymentStatus: 'paid',
        totalAmount: trip.cost * seats
      });
      bookings.push(booking);
    }
  }

  // Save all bookings
  const savedBookings = await Booking.insertMany(bookings);
  console.log(`Created ${savedBookings.length} bookings`);

  // Print summary
  console.log('\nSummary:');
  console.log(`- Created ${savedTrips.length} trips (Tuesdays and Fridays)`);
  console.log(`- Created ${savedBookings.length} bookings`);
  console.log('- Trip dates range from July 1st to August 23rd, 2025');
  console.log('- Fridays have more bookings (20-35) than Tuesdays (10-20)');

  await mongoose.disconnect();
}

createDiverseTripsAndBookings().catch(console.error); 