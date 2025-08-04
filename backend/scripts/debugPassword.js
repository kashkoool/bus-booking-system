const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');
const bcrypt = require('bcrypt');

async function debugPassword() {
  try {
    await connectDB();

    // Find the user
    const staff = await Staff.findOne({ username: 'Em_staff4' }).select('+password');
    
    if (!staff) {
      console.log('User Em_staff4 not found');
      return;
    }

    console.log('Current user details:');
    console.log('- Username:', staff.username);
    console.log('- StaffType:', staff.staffType);
    console.log('- Current hash:', staff.password);
    console.log('- Hash length:', staff.password.length);

    // Test what the hash should be for '12345678'
    const testPassword = '12345678';
    const correctHash = await bcrypt.hash(testPassword, 10);
    console.log('\nCorrect hash for "12345678":', correctHash);
    
    // Test comparison
    const isMatch = await bcrypt.compare(testPassword, staff.password);
    console.log('Current hash matches "12345678":', isMatch);
    
    // Test with correct hash
    const correctMatch = await bcrypt.compare(testPassword, correctHash);
    console.log('Correct hash matches "12345678":', correctMatch);

    // Update to correct hash
    console.log('\nUpdating password to correct hash...');
    staff.password = correctHash;
    await staff.save();
    console.log('Password updated successfully!');
    
    // Verify the update
    const updatedStaff = await Staff.findOne({ username: 'Em_staff4' }).select('+password');
    const finalMatch = await bcrypt.compare(testPassword, updatedStaff.password);
    console.log('Final verification - password matches "12345678":', finalMatch);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugPassword(); 