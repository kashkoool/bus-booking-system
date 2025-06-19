const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Company = require("../models/Company");
const Admin = require("../models/Admin"); // Import Admin model
const connectDB = require("../config/db");

async function createCompany() {
  try {
    await connectDB();

    // Try to find an existing admin, or create one if none exists
    let adminUser = await Admin.findOne({ email: "admin2@gmail.com" });
    if (!adminUser) {
      console.log(
        "No existing admin found with email admin2@gmail.com. Creating a new admin..."
      );
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("12345678", salt);
      adminUser = new Admin({
        email: "admin2@gmail.com",
        password: hashedPassword,
        username: "Admin_anas",
      });
      await adminUser.save();
      console.log("New admin account created:", adminUser.username);
    }

    const companyData = {
      companyID: "123456",
      companyName: "Test Company",
      username: "Co_manager",
      email: "manager@gmail.com",
      password: await bcrypt.hash("12345678", 10), // Hashed password
      phone: "1234567890",
      address: "123 Main St",
      role: "manager",
      status: "active",
      admin: adminUser._id, // Use the found or newly created admin's _id
    };

    // Check if company already exists by username or email
    const existingCompany = await Company.findOne({
      $or: [{ username: companyData.username }, { email: companyData.email }],
    });
    if (existingCompany) {
      console.log(
        "Company with this username or email already exists. Skipping creation."
      );
      console.log("Existing Company:", existingCompany);
      process.exit(0);
    }

    // Create company
    const company = new Company(companyData);
    await company.save();

    console.log("Company account created successfully:", company);
    process.exit(0);
  } catch (error) {
    console.error("Error creating company account:", error);
    process.exit(1);
  }
}

createCompany();

// node scripts/createCompany.js
