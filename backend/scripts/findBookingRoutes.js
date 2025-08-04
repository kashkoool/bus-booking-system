const mongoose = require('mongoose');
const Trip = require('../models/Trip');

// Connect to database
mongoose.connect('mongodb://localhost:27017/bus_booking')
  .then(async () => {
    console.log('Connected to database');
    
    // The trip IDs from your bookings
    const tripIds = [
      '6855f0a623ee9764888c1865',
      '6855f0a723ee9764888c1871', 
      '6855f0a723ee9764888c1883',
      '6855f0a723ee9764888c187d'
    ];
    
    try {
      const trips = await Trip.find({
        _id: { $in: tripIds }
      }).select('origin destination departureDate departureTime cost');
      
      console.log('\n=== Your Booking Routes ===');
      trips.forEach((trip, index) => {
        console.log(`${index + 1}. ${trip.origin} → ${trip.destination}`);
        console.log(`   Date: ${trip.departureDate}`);
        console.log(`   Time: ${trip.departureTime}`);
        console.log(`   Cost: ${trip.cost} ل.س`);
        console.log('');
      });
      
      // Get all unique routes in your system
      const allRoutes = await Trip.aggregate([
        {
          $group: {
            _id: { origin: '$origin', destination: '$destination' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      console.log('=== All Available Routes (by popularity) ===');
      allRoutes.forEach((route, index) => {
        console.log(`${index + 1}. ${route._id.origin} → ${route._id.destination} (${route.count} trips)`);
      });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
  }); 