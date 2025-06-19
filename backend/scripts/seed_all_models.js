const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import models
const { User } = require("../models/User");
const Admin = require("../models/Admin");
const Company = require("../models/Company");
const Staff = require("../models/Staff");
const Bus = require("../models/Bus");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const CreditCard = require("../models/CreditCard");
const Notification = require("../models/Notification");
const Token = require("../models/Token");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/bus_booking";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Clear collections
  await Promise.all([
    Admin.deleteMany({}),
    User.deleteMany({}),
    Company.deleteMany({}),
    Staff.deleteMany({}),
    Bus.deleteMany({}),
    Trip.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    CreditCard.deleteMany({}),
    Notification.deleteMany({}),
    Token.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // 1. Admin
  const admin = await Admin.create({
    email: "admin@example.com",
    password: await bcrypt.hash("adminpass", 10),
    username: "adminuser",
    role: "admin",
  });
  console.log("Seeded Admin");

  // 2. User
  const user = await User.create({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: await bcrypt.hash("userpass", 10),
    age: 30,
    phone: "0999999999",
    country: "Syria",
    gender: "male",
    role: "user",
  });
  console.log("Seeded User");

  // 3. Company
  const company = await Company.create({
    companyID: 1,
    companyName: "Trojan Transport",
    username: "trojan",
    logo: "",
    admin: admin._id,
    phone: "0111234567",
    password: await bcrypt.hash("companypass", 10),
    email: "company@example.com",
    address: "Damascus, Syria",
    role: "manager",
    status: "active",
  });
  console.log("Seeded Company");

  // 4. Staff
  const staff = await Staff.create({
    companyID: company.companyID,
    username: "staff1",
    age: 28,
    gender: "male",
    phone: "0988888888",
    email: "staff1@example.com",
    password: await bcrypt.hash("staffpass", 10),
    address: "Aleppo, Syria",
    role: "staff",
    staffType: "driver",
  });
  console.log("Seeded Staff");

  // 5. Bus
  const bus = await Bus.create({
    companyID: company.companyID,
    addedBy: company._id,
    busNumber: "BUS123",
    seats: 30,
    busType: "standard",
    model: "Mercedes",
    driver: staff._id,
  });
  console.log("Seeded Bus");

  // 6. Trip
  const trip = await Trip.create({
    companyID: company.companyID,
    addedBy: company._id,
    addedByType: "Company",
    busNumber: bus.busNumber,
    bus: bus._id,
    origin: "Damascus",
    destination: "Aleppo",
    departureDate: new Date(Date.now() + 86400000),
    arrivalDate: new Date(Date.now() + 90000000),
    departureTime: "08:00",
    arrivalTime: "14:00",
    cost: 50000,
    seatsAvailable: 28,
    seats: 30,
    status: "scheduled",
    ratings: 0,
  });
  console.log("Seeded Trip");

  // 7. CreditCard
  const creditCard = await CreditCard.create({
    user: user._id,
    cardNumber: "4111111111111111",
    cardNumberLast4: "1111",
    cardHolderName: "JOHN DOE",
    expiryMonth: "12",
    expiryYear: "30",
    cvv: "123",
    isDefault: true,
    iv: "iviviviviviviviv",
    brand: "visa",
    balance: 100000,
  });
  console.log("Seeded CreditCard");

  // 8. Booking
  const booking = await Booking.create({
    userEmail: user.email,
    tripID: trip._id,
    passengers: [
      {
        firstName: "John",
        lastName: "Doe",
        gender: "male",
        phone: "0999999999",
        seatNumber: 1,
      },
    ],
    noOfSeats: 1,
    assignedSeats: [1],
    status: "confirmed",
    bookingType: "online",
    staffID: null,
    paymentStatus: "paid",
    paymentID: null,
    totalAmount: 50000,
  });
  console.log("Seeded Booking");

  // 9. Payment
  const payment = await Payment.create({
    bookingID: booking._id,
    user: user._id,
    userEmail: user.email,
    amount: 50000,
    currency: "SYP",
    status: "completed",
    paymentMethod: "credit_card",
    creditCard: creditCard._id,
    cardDetails: { brand: "visa", last4: "1111" },
    transactionId: `TXN-${Date.now()}`,
    paymentDate: new Date(),
    billingDetails: { name: "John Doe", email: user.email, phone: user.phone },
  });
  console.log("Seeded Payment");

  // 10. Notification
  const notification = await Notification.create({
    sender: admin._id,
    companyID: company.companyID,
    title: "Welcome",
    message: "Welcome to the system!",
    isRead: false,
    type: "info",
    action: "none",
    metadata: {},
  });
  console.log("Seeded Notification");

  // 11. Token
  const token = await Token.create({
    userType: "User",
    userId: user._id,
    token: "sampletoken",
    refreshToken: "samplerefresh",
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000),
    lastUsedAt: new Date(),
    userData: { id: user._id, email: user.email },
  });
  console.log("Seeded Token");

  console.log("All seed data inserted successfully!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
