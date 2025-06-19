const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function dropCollections() {
  try {
    await connectDB();

    // Drop collections
    await mongoose.connection.collection("trips").drop();
    await mongoose.connection.collection("buses").drop();
    await mongoose.connection.collection("companies").drop();

    console.log("Successfully dropped trips, buses, and companies collections");
    process.exit(0);
  } catch (error) {
    console.error("Error dropping collections:", error);
    process.exit(1);
  }
}

dropCollections();
