const mongoose = require('mongoose');
const Staff = require('../models/Staff');
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
  await checkStaff();
});

async function checkStaff() {
  try {
    console.log('Checking staff members...\n');
    
    const staffMembers = await Staff.find({});
    
    if (staffMembers.length === 0) {
      console.log('No staff members found in the database.');
    } else {
      console.log(`Found ${staffMembers.length} staff member(s):\n`);
      
      staffMembers.forEach((staff, index) => {
        console.log(`${index + 1}. Staff Details:`);
        console.log(`   ID: ${staff._id}`);
        console.log(`   Username: ${staff.username}`);
        console.log(`   Name: ${staff.name}`);
        console.log(`   Email: ${staff.email}`);
        console.log(`   Phone: ${staff.phone}`);
        console.log(`   Company ID: ${staff.companyID}`);
        console.log(`   Role: ${staff.role}`);
        console.log(`   Status: ${staff.status}`);
        console.log(`   Created: ${staff.createdAt}`);
        console.log('   ---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking staff:', error);
    process.exit(1);
  }
} 