// controllers/managerController.js

const UserCompany = require("../models/UserCompany");

// Fetch employees belonging to the manager's company
const fetchCompanyEmployees = async (req, res) => {
  const { companyID, role } = req.user; // Get companyID and role from authenticated user

  try {
    // Fetch employees while excluding the manager
    const employees = await UserCompany.find({
      companyID,
      role: { $ne: 'owner' } // Exclude managers (owners)
    });

    res.status(200).json({ message: "Employees retrieved successfully", employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

module.exports = {
  fetchCompanyEmployees,
};
