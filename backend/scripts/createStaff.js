const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');
const bcrypt = require('bcryptjs'); // Added bcryptjs import

async function createStaff() {
  try {
    await connectDB();

    const staffData = {
      companyID: '123456', // Must match an existing company
      username: 'Em_teststaff',
      email: 'staff@gmail.com',
      password: await bcrypt.hash('12345678', 10), // Hashed password
      age: 30,
      gender: 'male', // Must match enum values (likely lowercase)
      phone: '1234567890',
      address: '123 Main St',
      staffType: 'employee',
      role: 'staff',
      // Add other required fields from Staff model
    };

    // Create staff
    const staff = new Staff(staffData);
    await staff.save();

    console.log('Staff account created successfully:', staff);
    process.exit(0);
  } catch (error) {
    console.error('Error creating staff account:', error);
    process.exit(1);
  }
}

createStaff();


// node scripts/createStaff.js
