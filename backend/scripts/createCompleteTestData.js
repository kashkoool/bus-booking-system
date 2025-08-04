const mongoose = require('mongoose');
const Company = require('../models/Company');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { Customer } = require('../models/Customer');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');
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
  await createCompleteTestData();
});

// Syrian cities for realistic data
const syrianCities = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'دير الزور', 'الحسكة',
  'الرقة', 'إدلب', 'درعا', 'السويداء', 'القنيطرة'
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

// Create complete test data
async function createCompleteTestData() {
  try {
    console.log('🚀 Starting to create complete test data...\n');

    // 1. Use existing admin
    const adminId = '681f9f0b5dc630c99c1a01c6';
    console.log(`👑 Using existing admin: Admin_anas (${adminId})\n`);

    // 2. Use existing company
    const companyId = '6855ee79645875b574052961';
    const companyNumId = 1001;
    const company = await Company.findById(companyId);
    if (!company) {
      console.error('Company not found!');
      process.exit(1);
    }
    console.log(`🏢 Using existing company: ${company.companyName} (ID: ${company._id})\n`);

    // 3. Create Staff/Manager if not exists
    let manager = await Staff.findOne({ username: 'Co_manager', companyID: companyNumId });
    if (!manager) {
      console.log('👤 Creating manager...');
      manager = new Staff({
        username: "Co_manager",
        name: "مدير شركة طروادة",
        email: "manager2@gmail.com",
        phone: "0111234567",
        password: "$2b$10$pUVz.qTRNvLa06gwM4Wr7uMKuARZMQYzVflUlW3YE1ZeBeJsV3WKK",
        address: "دمشق، سوريا",
        companyID: companyNumId, // Use the number, not ObjectId
        role: "manager",
        status: "active",
        staffType: "supervisor",
        gender: "male"
      });
      await manager.save();
      console.log(`✅ Manager created: ${manager.name}\n`);
    } else {
      console.log(`✅ Manager already exists: ${manager.name}\n`);
    }

    // 4. Create Buses
    console.log('🚌 Creating buses...');
    const buses = [];
    for (let i = 1; i <= 5; i++) {
      const busNumber = `BUS-${String(i).padStart(3, '0')}`;
      let bus = await Bus.findOne({ busNumber, companyID: companyNumId });
      if (!bus) {
        const capacity = Math.floor(Math.random() * 30) + 30; // 30-60 seats
        bus = new Bus({
          busNumber,
          capacity: capacity,
          seats: capacity,
          model: `موديل ${2020 + i}`,
          companyID: companyNumId,
          company: companyNumId,
          addedBy: companyId,
          busType: 'standard',
          status: 'active'
        });
        await bus.save();
        console.log(`   Created bus: ${bus.busNumber} (${bus.seats} seats)`);
      } else {
        console.log(`   Bus already exists: ${bus.busNumber}`);
      }
      buses.push(bus);
    }
    console.log(`✅ Buses ready (${buses.length})\n`);

    // 5. Create Trips
    console.log('🚗 Creating trips...');
    const trips = [];
    for (let i = 1; i <= 10; i++) {
      const origin = syrianCities[Math.floor(Math.random() * syrianCities.length)];
      let destination;
      do {
        destination = syrianCities[Math.floor(Math.random() * syrianCities.length)];
      } while (destination === origin);

      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days from now

      let trip = await Trip.findOne({ origin, destination, companyID: companyNumId });
      if (!trip) {
        const bus = buses[Math.floor(Math.random() * buses.length)];
        const price = Math.floor(Math.random() * 10000) + 5000;
        const departureDateCopy = new Date(departureDate);
        const arrivalDate = new Date(departureDateCopy.getTime() + 2 * 60 * 60 * 1000); // 2 hours after departure
        trip = new Trip({
          origin: origin,
          destination: destination,
          departureDate: departureDateCopy,
          arrivalDate: arrivalDate,
          departureTime: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}`,
          busNumber: bus.busNumber,
          bus: bus._id,
          companyID: companyNumId,
          addedBy: companyId,
          addedByType: 'Company',
          price: price,
          cost: price,
          availableSeats: bus.seats,
          seatsAvailable: bus.seats,
          seats: bus.seats,
          status: 'scheduled'
        });
        await trip.save();
        console.log(`   Created trip: ${origin} → ${destination} (${trip.price} ل.س)`);
      } else {
        console.log(`   Trip already exists: ${origin} → ${destination}`);
      }
      trips.push(trip);
    }
    console.log(`✅ Trips ready (${trips.length})\n`);

    // 6. Create Customer
    let customer = await Customer.findOne({ email: 'test@example.com' });
    if (!customer) {
      console.log('👤 Creating test customer...');
      customer = new Customer({
        firstName: 'عميل',
        lastName: 'تجريبي',
        username: 'test_customer',
        email: 'test@example.com',
        password: 'password123',
        name: 'عميل تجريبي',
        phone: '0999123456',
        address: 'دمشق، سوريا',
        age: 30,
        country: 'سوريا',
        gender: 'male'
      });
      await customer.save();
      console.log(`✅ Customer created: ${customer.firstName} ${customer.lastName}\n`);
    } else {
      console.log(`✅ Customer already exists: ${customer.firstName || customer.name}\n`);
    }

    // 7. Create Test Bookings
    console.log('📋 Creating 100 test bookings...');
    const bookings = [];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const endDate = new Date(); // Now

    for (let i = 0; i < 100; i++) {
      // Randomly select a trip
      const randomTrip = trips[Math.floor(Math.random() * trips.length)];
      
      // Generate random passenger count (1-4 passengers)
      const passengerCount = Math.floor(Math.random() * 4) + 1;
      
      // Generate random booking date
      const bookingDate = generateRandomDate(startDate, endDate);
      
      // Calculate total amount (base price * passenger count + some variation)
      const basePrice = randomTrip.price || randomTrip.cost || 5000;
      const totalAmount = basePrice * passengerCount + Math.floor(Math.random() * 2000);

      // Generate passengers with required fields
      const passengers = [];
      for (let j = 0; j < passengerCount; j++) {
        passengers.push({
          firstName: `مسافر`,
          lastName: `${i + 1}-${j + 1}`,
          gender: 'male',
          seatNumber: j + 1
        });
      }
      const assignedSeats = passengers.map(p => p.seatNumber);

      const booking = new Booking({
        userEmail: customer.email,
        tripID: randomTrip._id,
        passengers: passengers,
        noOfSeats: passengerCount,
        assignedSeats: assignedSeats,
        totalAmount: totalAmount,
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: bookingDate,
        updatedAt: bookingDate
      });

      bookings.push(booking);
    }

    // Insert all bookings
    await Booking.insertMany(bookings);
    
    console.log(`✅ Successfully created ${bookings.length} test bookings!`);
    console.log(`📊 Company: ${company.companyName}`);
    console.log(`👤 Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`🚌 Buses: ${buses.length}`);
    console.log(`🚗 Trips: ${trips.length}`);
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

    console.log('\n🎉 All test data created successfully!');
    console.log(`🔑 Company ID for dashboard: ${company._id}`);
    console.log(`👤 Manager login: manager2@gmail.com / password123`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
} 