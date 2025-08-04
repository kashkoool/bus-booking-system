const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');
const bcrypt = require('bcrypt');

async function fixEmStaff4Password() {
  try {
    await connectDB();

    // Find the user first to get the ID
    const staff = await Staff.findOne({ username: 'Em_staff4' });
    
    if (!staff) {
      console.log('User Em_staff4 not found');
      return;
    }

    console.log('Found user:', staff.username, 'ID:', staff._id);

    // Generate the correct hash for '12345678'
    const correctHash = await bcrypt.hash('12345678', 10);
    console.log('Correct hash for "12345678":', correctHash);

    // Use findByIdAndUpdate to bypass the pre-save hook
    const updatedStaff = await Staff.findByIdAndUpdate(
      staff._id,
      { password: correctHash },
      { new: true, runValidators: false }
    ).select('+password');

    console.log('Password updated using findByIdAndUpdate');
    console.log('New hash in database:', updatedStaff.password);

    // Verify the password works
    const isMatch = await bcrypt.compare('12345678', updatedStaff.password);
    console.log('Password verification result:', isMatch);

    if (isMatch) {
      console.log('✅ SUCCESS: Em_staff4 can now login with password "12345678"');
    } else {
      console.log('❌ FAILED: Password still not working');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixEmStaff4Password(); 