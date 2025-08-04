const mongoose = require('mongoose');
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
  await listCompanies();
});

async function listCompanies() {
  try {
    console.log('Listing all companies...\n');
    
    const companies = await Company.find({});
    
    if (companies.length === 0) {
      console.log('No companies found in the database.');
    } else {
      console.log(`Found ${companies.length} company(ies):\n`);
      
      companies.forEach((company, index) => {
        console.log(`${index + 1}. Company Details:`);
        console.log(`   ID: ${company._id}`);
        console.log(`   Company ID: ${company.companyID}`);
        console.log(`   Name: ${company.companyName}`);
        console.log(`   Username: ${company.username}`);
        console.log(`   Email: ${company.email}`);
        console.log(`   Phone: ${company.phone}`);
        console.log(`   Address: ${company.address}`);
        console.log(`   Role: ${company.role}`);
        console.log(`   Status: ${company.status}`);
        console.log(`   Created: ${company.createdAt}`);
        console.log('   ---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error listing companies:', error);
    process.exit(1);
  }
} 