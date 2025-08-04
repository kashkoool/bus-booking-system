const mongoose = require('mongoose');
const Staff = require('../models/Staff');

module.exports = async () => {
  console.log('Running migration: Add isActive and status fields to Staff collection');
  
  try {
    // Update all staff documents to include isActive and status fields
    const result = await Staff.updateMany(
      { 
        $or: [
          { isActive: { $exists: false } },
          { status: { $exists: false } }
        ]
      },
      {
        $set: { 
          isActive: true,
          status: 'active'
        }
      }
    );
    
    console.log(`Migration completed. Updated ${result.nModified} staff members.`);
    return { success: true, updated: result.nModified };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};
