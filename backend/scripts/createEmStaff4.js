const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');
const bcrypt = require('bcrypt');

async function createEmStaff4() {
  try {
    await connectDB();

    // Always update password for Em_staff4
    const staff = await Staff.findOne({ username: 'Em_staff4' });
    const hashedPassword = await bcrypt.hash('12345678', 10);
    console.log('New hash for 12345678:', hashedPassword);
    if (staff) {
      staff.password = hashedPassword;
      await staff.save();
      console.log('Password forcibly updated for Em_staff4');
      process.exit(0);
    } else {
      // Create if not exists
      const staffData = {
        companyID: 1001,
        username: 'Em_staff4',
        email: 'staff0@gmail.com',
        password: hashedPassword,
        age: 44,
        gender: 'male',
        phone: '0966156649',
        address: 'damascus',
        staffType: 'employee',
        role: 'staff',
        status: 'active'
      };
      const newStaff = new Staff(staffData);
      await newStaff.save();
      console.log('Em_staff4 created with password 12345678');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error creating/updating Em_staff4:', error);
    process.exit(1);
  }
}

createEmStaff4(); 