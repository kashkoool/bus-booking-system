const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const connectDB = require("../config/db");

// Import models in the correct order to prevent circular dependencies
const models = require("../models");
const Admin = models.Admin;
const Company = models.Company;
const Bus = models.Bus;
const Trip = models.Trip;

// Helper function to generate a random date within a range
function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to generate a random time
function getRandomTime() {
  const hours = Math.floor(Math.random() * 24)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(Math.random() * 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Helper function to calculate arrival time based on departure time and duration
function calculateArrivalTime(departureTime, durationHours) {
  const [hours, minutes] = departureTime.split(":").map(Number);
  const departureDate = new Date();
  departureDate.setHours(hours, minutes);

  const arrivalDate = new Date(
    departureDate.getTime() + durationHours * 60 * 60 * 1000
  );
  return `${arrivalDate.getHours().toString().padStart(2, "0")}:${arrivalDate
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

async function seed() {
  try {
    await connectDB();
    console.log("Connected to database");

    // Create admin if not exists
    let admin = await Admin.findOne({ email: "admin@example.com" });
    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      admin = await Admin.create({
        email: "admin@example.com",
        password: hashedPassword,
        username: "admin",
      });
      console.log("Created admin account");
    }

    // Company data
    const companies = [
      {
        companyName: "شركة طروادة للنقل السياحي",
        username: "trojan",
        email: "trojan@example.com",
        phone: "0111234567",
        address: "دمشق، سوريا",
        companyID: 1001,
      },
      {
        companyName: "شركة الحسن للنقل",
        username: "alhasan",
        email: "alhasan@example.com",
        phone: "0112345678",
        address: "حلب، سوريا",
        companyID: 1002,
      },
      {
        companyName: "شركة الحكيم للنقل السياحي",
        username: "alhakeem",
        email: "alhakeem@example.com",
        phone: "0113456789",
        address: "حمص، سوريا",
        companyID: 1003,
      },
      {
        companyName: "شركة القدموس",
        username: "alqadmus",
        email: "alqadmus@example.com",
        phone: "0114567890",
        address: "طرطوس، سوريا",
        companyID: 1004,
      },
      {
        companyName: "زريق للنقل السياحي",
        username: "zareeq",
        email: "zareeq@example.com",
        phone: "0115678901",
        address: "اللاذقية، سوريا",
        companyID: 1005,
      },
    ];

    // Create companies
    const createdCompanies = [];
    for (const companyData of companies) {
      const hashedPassword = await bcrypt.hash("company123", 10);
      const company = await Company.create({
        ...companyData,
        password: hashedPassword,
        admin: admin._id,
        role: "manager",
        status: "active",
      });
      createdCompanies.push(company);
      console.log(`Created company: ${company.companyName}`);
    }

    // Bus types and models
    const busTypes = ["standard", "premium", "luxury"];
    const busModels = ["Mercedes", "MAN", "Scania", "Volvo", "Iveco"];

    // Create buses for each company
    for (const company of createdCompanies) {
      for (let i = 1; i <= 5; i++) {
        const busType = busTypes[Math.floor(Math.random() * busTypes.length)];
        const busModel =
          busModels[Math.floor(Math.random() * busModels.length)];
        const seats =
          busType === "luxury" ? 30 : busType === "premium" ? 35 : 40;

        const bus = await Bus.create({
          companyID: company.companyID,
          addedBy: company._id,
          busNumber: `${company.companyID}-${i}`,
          seats: seats,
          busType: busType,
          model: busModel,
        });
        console.log(`Created bus: ${bus.busNumber} for ${company.companyName}`);

        // Create 5 trips for each bus
        const cities = [
          "دمشق",
          "حلب",
          "حمص",
          "حماة",
          "اللاذقية",
          "طرطوس",
          "دير الزور",
          "الحسكة",
          "الرقة",
        ];
        const tripDurations = {
          "دمشق-حلب": 5,
          "دمشق-حمص": 2,
          "دمشق-حماة": 3,
          "دمشق-اللاذقية": 4,
          "دمشق-طرطوس": 4.5,
          "حلب-حمص": 3,
          "حلب-حماة": 4,
          "حلب-اللاذقية": 6,
          "حمص-حماة": 1,
          "حمص-اللاذقية": 3,
          "حماة-طرطوس": 4,
          "اللاذقية-طرطوس": 1,
        };

        for (let j = 1; j <= 5; j++) {
          // Generate random origin and destination
          let origin, destination;
          do {
            origin = cities[Math.floor(Math.random() * cities.length)];
            destination = cities[Math.floor(Math.random() * cities.length)];
          } while (origin === destination);

          const routeKey = `${origin}-${destination}`;
          const durationHours = tripDurations[routeKey] || 3; // Default 3 hours if route not in list

          // Generate random dates within next 30 days
          const departureDate = getRandomDate(
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          );
          const departureTime = getRandomTime();
          const arrivalTime = calculateArrivalTime(
            departureTime,
            durationHours
          );
          const arrivalDate = new Date(departureDate);
          arrivalDate.setHours(arrivalDate.getHours() + durationHours);

          // Generate random cost based on distance and bus type
          const baseCost = durationHours * 10000; // 10,000 per hour
          const busTypeMultiplier =
            busType === "luxury" ? 1.5 : busType === "premium" ? 1.2 : 1;
          const cost = Math.round(baseCost * busTypeMultiplier);

          const trip = await Trip.create({
            companyID: company.companyID,
            addedBy: company._id,
            addedByType: "Company", // Always set to Company since we're not using staff-created trips
            busNumber: bus.busNumber,
            bus: bus._id,
            origin: origin,
            destination: destination,
            departureDate: departureDate,
            arrivalDate: arrivalDate,
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            cost: cost,
            seatsAvailable: seats,
            seats: seats,
            status: "scheduled",
          });
          console.log(
            `Created trip: ${origin} to ${destination} for bus ${bus.busNumber}`
          );
        }
      }
    }

    console.log("Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
