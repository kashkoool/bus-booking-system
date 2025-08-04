const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  await createTestBookings();
});

// Syrian cities for realistic data
const syrianCities = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'دير الزور', 'الحسكة',
  'الرقة', 'إدلب', 'درعا', 'السويداء', 'القنيطرة', 'الرقة', 'دير الزور'
];

// Generate random passenger data
const generatePassengers = (count) => {
  const passengers = [];
  for (let i = 0; i < count; i++) {
    passengers.push({
      name: `مسافر ${i + 1}`,
      passportNumber: `PASS${Math.floor(Math.random() * 1000000)}`,
      seatNumber: Math.floor(Math.random() * 50) + 1
    });
  }
  return passengers;
};

// Generate random dates within the last year
const generateRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Create test bookings
async function createTestBookings() {
  try {
    console.log('Starting to create test bookings...');

    // Use the specific company ID provided
    const companyId = '6851b1f4eaef05c644f27810';
    const company = await Company.findById(companyId);
    if (!company) {
      console.error(`Company with ID ${companyId} not found.`);
      process.exit(1);
    }

    console.log(`Found company: ${company.companyName}`);

    // Get trips for this company
    const trips = await Trip.find({ companyID: companyId });
    if (trips.length === 0) {
      console.error('No trips found for this company. Please create trips first.');
      process.exit(1);
    }

    console.log(`Found ${trips.length} trips for the company`);

    // Get or create a test customer
    let customer = await Customer.findOne({ email: 'test@example.com' });
    if (!customer) {
      customer = new Customer({
        username: 'test_customer',
        email: 'test@example.com',
        password: 'password123',
        name: 'عميل تجريبي',
        phone: '0999123456',
        address: 'دمشق، سوريا'
      });
      await customer.save();
      console.log('Created test customer');
    }

    const bookings = [];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const endDate = new Date(); // Now

    console.log(`Creating 100 test bookings for company: ${company.companyName}`);

    for (let i = 0; i < 100; i++) {
      // Randomly select a trip
      const randomTrip = trips[Math.floor(Math.random() * trips.length)];
      
      // Generate random passenger count (1-4 passengers)
      const passengerCount = Math.floor(Math.random() * 4) + 1;
      
      // Generate random booking date
      const bookingDate = generateRandomDate(startDate, endDate);
      
      // Calculate total amount (base price * passenger count + some variation)
      const basePrice = randomTrip.price || 5000;
      const totalAmount = basePrice * passengerCount + Math.floor(Math.random() * 2000);

      const booking = new Booking({
        customerID: customer._id,
        tripID: randomTrip._id,
        passengers: generatePassengers(passengerCount),
        totalAmount: totalAmount,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: Math.random() > 0.5 ? 'credit_card' : 'cash',
        createdAt: bookingDate,
        updatedAt: bookingDate
      });

      bookings.push(booking);
    }

    // Insert all bookings
    await Booking.insertMany(bookings);
    
    console.log(`✅ Successfully created ${bookings.length} test bookings!`);
    console.log(`📊 Company: ${company.companyName}`);
    console.log(`👤 Customer: ${customer.name}`);
    console.log(`🚌 Trips used: ${trips.length}`);
    console.log(`💰 Total revenue generated: ${bookings.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()} ل.س`);
    
    // Show some statistics
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const avgBookingValue = totalRevenue / bookings.length;
    const totalPassengers = bookings.reduce((sum, b) => sum + b.passengers.length, 0);
    
    console.log('\n📈 Statistics:');
    console.log(`   Total Bookings: ${bookings.length}`);
    console.log(`   Total Revenue: ${totalRevenue.toLocaleString()} ل.س`);
    console.log(`   Average Booking Value: ${avgBookingValue.toLocaleString()} ل.س`);
    console.log(`   Total Passengers: ${totalPassengers}`);
    console.log(`   Average Passengers per Booking: ${(totalPassengers / bookings.length).toFixed(1)}`);

    // Show monthly distribution
    const monthlyStats = {};
    bookings.forEach(booking => {
      const month = booking.createdAt.getMonth() + 1;
      const year = booking.createdAt.getFullYear();
      const key = `${year}-${month}`;
      
      if (!monthlyStats[key]) {
        monthlyStats[key] = { count: 0, revenue: 0 };
      }
      monthlyStats[key].count++;
      monthlyStats[key].revenue += booking.totalAmount;
    });

    console.log('\n📅 Monthly Distribution (last 6 months):');
    const sortedMonths = Object.keys(monthlyStats).sort().slice(-6);
    sortedMonths.forEach(month => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      console.log(`   ${monthNames[parseInt(monthNum) - 1]} ${year}: ${monthlyStats[month].count} bookings, ${monthlyStats[month].revenue.toLocaleString()} ل.س`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating test bookings:', error);
    process.exit(1);
  }
} 