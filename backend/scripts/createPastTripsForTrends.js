const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const Company = require('../models/Company');

const MONGO_URI = 'mongodb://localhost:27017/bus_booking';

async function createPastTripsForTrends() {
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

  // Create trips for the past 30 days (Tuesdays and Fridays)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const trips = [];
  
  // Generate dates for the past 30 days
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    
    // Only create trips for Tuesdays (2) and Fridays (5)
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      const tripDate = new Date(d);
      const arrivalDate = new Date(tripDate);
      arrivalDate.setHours(tripDate.getHours() + 4);
      
      const trip = new Trip({
        companyID: company.companyID,
        addedBy: company._id,
        addedByType: 'Company',
        busNumber: bus.busNumber,
        bus: bus._id,
        origin: 'حمص',
        destination: 'حلب',
        departureDate: tripDate,
        arrivalDate: arrivalDate,
        departureTime: dayOfWeek === 2 ? '08:00' : '14:00',
        arrivalTime: dayOfWeek === 2 ? '12:00' : '18:00',
        cost: dayOfWeek === 2 ? 1500 : 1800, // Higher price for Fridays
        status: 'scheduled'
      });
      
      trips.push(trip);
    }
  }

  // Save all trips
  const savedTrips = await Trip.insertMany(trips);
  console.log(`Created ${savedTrips.length} trips for the past 30 days`);

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
  console.log(`Created ${savedBookings.length} bookings for past trips`);

  // Print summary
  console.log('\nSummary:');
  console.log(`- Created ${savedTrips.length} trips for the past 30 days`);
  console.log(`- Created ${savedBookings.length} bookings`);
  console.log('- Trip dates range from', startDate.toDateString(), 'to', endDate.toDateString());
  console.log('- Fridays have more bookings (20-35) than Tuesdays (10-20)');

  await mongoose.disconnect();
}

createPastTripsForTrends().catch(console.error); 