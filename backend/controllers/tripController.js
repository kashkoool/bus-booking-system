const Trip = require("../models/Trip");
const Company = require("../models/company");
// Fetch available trips based on companyID and seat availability
const getAvailableTrips = async (companyID) => {
  try {
    // Find trips with seats available
    return await Trip.find({ companyID, seatsAvailable: { $gt: 0 } });
  } catch (error) {
    console.error("Error fetching available trips:", error);
    throw new Error("Unable to fetch available trips");
  }
};

const fetchManagerTrips = async (req, res) => {
  const { companyID } = req.user;
  try {
      const availableTrips = await getAvailableTrips(companyID);
      res.status(200).json({ message: "Available trips retrieved successfully", availableTrips });
  } catch (error) {
      res.status(500).json({ message: "Failed to fetch available trips" });
  }
};

const fetchEmployeeTrips = async (req, res) => {
  const { companyID } = req.user;
  try {
      const availableTrips = await getAvailableTrips(companyID);
      res.status(200).json({ message: "Available trips retrieved successfully", availableTrips });
  } catch (error) {
      res.status(500).json({ message: "Failed to fetch available trips" });
  }
};


const fetchAvailableTripsForUsers = async (req, res) => {
  try {
    // Fetch trips that are available and have seats remaining
    const availableTrips = await Trip.find(
      { isAvailable: true, seatsAvailable: { $gt: 0 } }
    );

    // Fetch company details for each trip
    const tripsWithCompany = await Promise.all(
      availableTrips.map(async (trip) => {
        const company = await Company.findOne({ companyID: trip.companyID });
        return {
          ...trip._doc,
          companyName: company ? company.companyName : "Unknown Company",
          phone: company ? company.phone : "N/A",
          logo: company ? company.logo : "N/A",
        };
      })
    );

    res.status(200).json({
      message: "Available trips retrieved successfully",
      availableTrips: tripsWithCompany,
    });
  } catch (error) {
    console.error("Error fetching available trips:", error);
    res.status(500).json({ message: "Failed to fetch available trips" });
  }
};



module.exports = {
  fetchEmployeeTrips,
  fetchManagerTrips,
  fetchAvailableTripsForUsers,
};
