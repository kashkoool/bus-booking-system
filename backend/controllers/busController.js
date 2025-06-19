// controllers/busController.js
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');

// Fetch available buses based on companyID and exclude buses assigned to trips
const getAvailableBuses = async (companyID) => {
  try {
    // Step 1: Fetch all buses for the company
    const allBuses = await Bus.find({ companyID });

    // Step 2: Fetch all trips for the company
    const allTrips = await Trip.find({ companyID });

    // Step 3: Extract bus numbers that are already assigned to trips
    const assignedBusNumbers = allTrips.map(trip => trip.busNumber);

    // Step 4: Filter out buses that are already assigned to trips
    const availableBuses = allBuses.filter(bus => !assignedBusNumbers.includes(bus.busNumber));

    return availableBuses;
  } catch (error) {
    console.error("Error fetching available buses:", error);
    throw new Error("Unable to fetch available buses");
  }
};

// Controller function for fetching buses for an employee
const fetchEmployeeBuses = async (req, res) => {
  const { companyID } = req.user; // Assuming companyID is stored in req.user
  try {
    const availableBuses = await getAvailableBuses(companyID);
    res.status(200).json({ message: "Available buses retrieved successfully", availableBuses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch available buses" });
  }
};

// Controller function for fetching buses for a manager
const fetchManagerBuses = async (req, res) => {
  const { companyID } = req.user; // Assuming companyID is stored in req.user
  try {
    const availableBuses = await getAvailableBuses(companyID);
    res.status(200).json(availableBuses); // Return the array directly
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch available buses" });
  }
};

module.exports = {
  fetchEmployeeBuses,
  fetchManagerBuses,
};