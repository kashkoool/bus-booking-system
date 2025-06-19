const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const dotenv = require('dotenv');

dotenv.config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/travels', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Admin data
    const adminData = {
      email: 'admin2@gmail.com',
      password: '12345678', // In production, use a stronger password
      username: 'Admin_anas',
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const admin = new Admin(adminData);
    await admin.save();

    console.log('Admin account created successfully:', admin);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error);
    process.exit(1);
  }
}

createAdmin();


// node scripts/createAdmin.js