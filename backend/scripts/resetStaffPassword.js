const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');

async function resetStaffPassword(username, newPassword) {
  try {
    await connectDB();

    // Find the staff member
    const staff = await Staff.findOne({ username });
    
    if (!staff) {
      console.log(`Staff member with username "${username}" not found`);
      return false;
    }

    console.log(`Found staff member: ${staff.username} (${staff.staffType})`);

    // Use the new resetPassword method
    const updatedStaff = await staff.resetPassword(newPassword);
    
    if (updatedStaff) {
      console.log(`✅ Password reset successfully for ${username}`);
      
      // Verify the password works
      const isMatch = await updatedStaff.comparePassword(newPassword);
      console.log(`Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      return isMatch;
    } else {
      console.log(`❌ Failed to reset password for ${username}`);
      return false;
    }

  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  } finally {
    process.exit(0);
  }
}

// Get command line arguments
const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log('Usage: node resetStaffPassword.js <username> <new_password>');
  console.log('Example: node resetStaffPassword.js Em_staff4 12345678');
  process.exit(1);
}

resetStaffPassword(username, password); 