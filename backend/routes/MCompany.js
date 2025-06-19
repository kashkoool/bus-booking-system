const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const { managerOnly } = require('../middleware/roleMiddleware');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Helper function to set Excel headers
const setExcelHeaders = (res, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/company-logos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
  }
}).single('logo');

// Company dashboard
router.get('/dashboard', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    
    // Get basic company info
    const company = await Company.findOne({ 
      $or: [
        { companyID: companyId },
        { _id: companyId }
      ]
    }).select('-password');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company Dashboard',
      user: req.user,
      company: company
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/company/stats
 * @desc    Get company statistics
 * @access  Private/Manager
 */
router.get('/stats', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get company's trips
    const trips = await Trip.find({ companyID: companyId });
    const tripIds = trips.map(trip => trip._id);

    // Get total bookings count and revenue
    const bookingsStats = await Booking.aggregate([
      {
        $match: {
          tripID: { $in: tripIds },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startOfMonth] },
                '$totalAmount',
                0
              ]
            }
          },
          yearlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startOfYear] },
                '$totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Get upcoming trips
    const upcomingTrips = await Trip.countDocuments({
      companyID: companyId,
      departureDate: { $gte: new Date() }
    });

    // Get recent bookings
    const recentBookings = await Booking.find({ 
      tripID: { $in: tripIds },
      status: 'confirmed'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('tripID', 'origin destination departureDate')
    .select('passengers totalAmount status createdAt');

    // Get revenue by month for the current year
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          tripID: { $in: tripIds },
          status: 'confirmed',
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format monthly data
    const monthlyData = Array(12).fill(0).map((_, index) => {
      const monthData = monthlyRevenue.find(m => m._id === index + 1);
      return {
        month: index + 1,
        revenue: monthData ? monthData.revenue : 0,
        bookings: monthData ? monthData.bookings : 0
      };
    });

    const stats = {
      overview: {
        totalBookings: bookingsStats[0]?.totalBookings || 0,
        totalRevenue: bookingsStats[0]?.totalRevenue || 0,
        monthlyRevenue: bookingsStats[0]?.monthlyRevenue || 0,
        yearlyRevenue: bookingsStats[0]?.yearlyRevenue || 0,
        upcomingTrips
      },
      monthlyData,
      recentBookings: recentBookings.map(booking => ({
        id: booking._id,
        trip: booking.tripID,
        passengers: booking.passengers.length,
        amount: booking.totalAmount,
        status: booking.status,
        date: booking.createdAt
      }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company statistics',
      error: error.message
    });
  }
});


// Test dashboard endpoint for company
// Removed test endpoint as it bypasses security
// All company routes should use proper middleware

// Create staff for manager's company
router.post('/Addstaff', auth, managerOnly, async (req, res, next) => {
  try {
    const { 
      username, 
      age, 
      gender, 
      phone, 
      email, 
      password,
      address,
      staffType 
    } = req.body;
    
    // Validate required fields based on staff type
    const isDriver = staffType === 'driver';
    const requiredFields = { 
      username, 
      age, 
      gender, 
      phone, 
      address,
      staffType 
    };
    
    // Only require email and password for non-driver staff
    if (!isDriver) {
      requiredFields.email = email;
      requiredFields.password = password;
    }
    
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === null || value === '')
      .map(([key]) => key);
      
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided',
        missingFields,
        field: missingFields[0]
      });
    }
    
    // Validate username starts with 'Em_'
    if (!username.startsWith('Em_')) {
      return res.status(400).json({ 
        success: false,
        message: 'Staff username must start with Em_',
        field: 'username'
      });
    }

    // Check if phone number already exists
    const existingPhone = await Staff.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists',
        field: 'phone'
      });
    }

    // Check if username already exists
    const existingUser = await Staff.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Username already exists',
        field: 'username'
      });
    }

    // Check if email exists (only for non-drivers)
    if (!isDriver) {
      const existingEmail = await Staff.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists',
          field: 'email'
        });
      }
    }

    // Rest of the company lookup code remains the same...
    let company;
    try {
      company = await Company.findById(req.user._id);
      if (!company) {
        company = await Company.findOne({
          $or: [
            { email: req.user.email },
            { username: req.user.username },
            { companyID: req.user.companyID }
          ]
        });
        
        if (!company) {
          return res.status(404).json({
            success: false,
            message: 'Company not found. Please ensure your manager account is properly linked to a company.',
            field: 'companyId'
          });
        }
      }
    } catch (error) {
      console.error('Error finding company:', error);
      return res.status(500).json({
        success: false,
        message: 'Error looking up company information',
        error: error.message
      });
    }
    
    // Get the next staff ID
    const lastStaff = await Staff.findOne().sort({ staffID: -1 });
    const nextID = lastStaff ? lastStaff.staffID + 1 : 1;
    
    // Create staff object with common fields
    const staffData = {
      staffID: nextID,
      companyID: company.companyID,
      username,
      age,
      gender,
      phone,
      address,
      role: 'staff',
      staffType,
      companyName: company.companyName
    };

    // Only add email and password for non-drivers
    if (!isDriver) {
      staffData.email = email;
      staffData.password = await bcrypt.hash(password, 10);
    } else {
      // For drivers, explicitly set password to undefined to exclude the field
      staffData.password = undefined;
    }

    const staff = new Staff(staffData);
    await staff.save();
    
    // Return staff data without password
    const responseData = staff.toObject();
    delete responseData.password;
    
    return res.status(201).json({
      success: true,
      message: `${isDriver ? 'Driver' : 'Staff'} created successfully`,
      staff: {
        ...responseData,
        company: {
          companyID: company.companyID,
          companyName: company.companyName
        }
      }
    });
  } catch (error) {
    console.error('Error in Addstaff:', error);
    next(error);
  }
});


/**
 * @route   PUT /api/company/bus/assign-driver
 * @desc    Assign a driver to a bus
 * @access  Private/Company Manager
 */
router.put('/bus/assign-driver', auth, managerOnly, async (req, res) => {
  try {
    const { busNumber, driverUsername } = req.body;
    const companyId = req.user.companyID || req.user._id;

    // Validate input
    if (!busNumber || !driverUsername) {
      return res.status(400).json({
        success: false,
        message: 'Bus number and driver username are required'
      });
    }

    // Find the bus by number and company
    const bus = await Bus.findOne({ 
      busNumber,
      companyID: companyId 
    });

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found or you do not have permission'
      });
    }

    // Find the driver by username and company
    const driver = await Staff.findOne({
      username: driverUsername,
      companyID: companyId,
      staffType: 'driver'
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found or is not a valid driver'
      });
    }

    // Check if driver is already assigned to another bus
    const existingBus = await Bus.findOne({ 
      driver: driver._id,
      _id: { $ne: bus._id } // Exclude current bus from the check
    });

    if (existingBus) {
      return res.status(400).json({
        success: false,
        message: `Driver is already assigned to bus ${existingBus.busNumber}`
      });
    }

    // Update the bus with the driver
    bus.driver = driver._id;
    await bus.save();

    // Populate driver details for response
    await bus.populate('driver', 'username phone');

    res.json({
      success: true,
      message: 'Driver assigned to bus successfully',
      bus: {
        busNumber: bus.busNumber,
        model: bus.model,
        driver: {
          username: bus.driver.username,
          phone: bus.driver.phone
        }
      }
    });

  } catch (error) {
    console.error('Error assigning driver to bus:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning driver to bus',
      error: error.message
    });
  }
});



// Edit staff details
router.put('/Editstaff/:id',  auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      age,
      gender,
      phone,
      email,
      password,
      address,
      staffType
    } = req.body;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Verify staff belongs to manager's company
    if (staff.companyID !== req.company.companyID) {
      return res.status(403).json({ message: 'Not authorized to edit this staff member' });
    }

    // Update fields if provided
    if (username) {
      // Validate username starts with 'Em_'
      if (!username.startsWith('Em_')) {
        return res.status(400).json({ message: 'Staff username must start with Em_' });
      }
      staff.username = username;
    }
    if (age) staff.age = age;
    if (gender) staff.gender = gender;
    if (phone) staff.phone = phone;
    if (email) staff.email = email;
    if (address) staff.address = address;
    if (staffType) staff.staffType = staffType;
    
    // Handle password update separately
    if (password) {
      staff.password = await bcrypt.hash(password, 10);
    }

    await staff.save();
    
    // Return updated staff without password
    const staffData = staff.toObject();
    delete staffData.password;
    
    res.json({
      message: 'Staff updated successfully',
      staff: staffData
    });
  } catch (error) {
    console.error('Staff update error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Error updating staff' });
  }
});



// Get all staff for manager's company
router.get('/show-all-staff', auth, managerOnly, async (req, res) => {
  try {
    const staff = await Staff.find({ companyID: req.company.companyID });
    res.json(staff);
  } catch (error) {
    console.error('Staff retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving staff' });
  }
});


// Delete staff
router.delete('/deletestaff/:id', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Verify staff belongs to manager's company
    if (staff.companyID !== req.company.companyID) {
      return res.status(403).json({ message: 'Not authorized to delete this staff member' });
    }

    await Staff.findByIdAndDelete(id);
    
    res.json({
      message: 'Staff deleted successfully',
      staffId: id
    });
  } catch (error) {
    console.error('Staff deletion error:', error);
    res.status(500).json({ message: 'Error deleting staff' });
  }
});



// Add bus
router.post('/add-bus', auth, managerOnly, async (req, res) => {
  try {
    const { busNumber, seats, busType, model } = req.body;
    const companyID = req.user.companyID;

    // Create bus with manager as addedBy
    const bus = new Bus({
      companyID,
      addedBy: req.user._id,
      busNumber,
      seats,
      busType,
      model
    });

    await bus.save();
    res.status(201).json({
      message: 'Bus added successfully',
      bus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit bus
router.put('/edit-bus/:id', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { busNumber, seats, busType, model } = req.body;

    // Find and update bus
    const bus = await Bus.findById(id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Ensure bus belongs to manager's company
    if (bus.companyID !== req.user.companyID) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Update bus fields
    bus.busNumber = busNumber || bus.busNumber;
    bus.seats = seats || bus.seats;
    bus.busType = busType || bus.busType;
    bus.model = model || bus.model;

    await bus.save();
    res.json({
      message: 'Bus updated successfully',
      bus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bus
router.delete('/delete-bus/:id', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete bus
    const bus = await Bus.findById(id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Ensure bus belongs to manager's company
    if (bus.companyID !== req.user.companyID) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    await bus.deleteOne();
    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update available seats for a trip (VIP seats management)
router.put('/trip/:id/update-seats', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { seatsAvailable } = req.body;

    // Validate input
    if (typeof seatsAvailable !== 'number' || seatsAvailable < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of seats (0 or greater)'
      });
    }

    // Find the trip and verify it belongs to the manager's company
    const trip = await Trip.findOne({
      _id: id,
      companyID: req.user.companyID
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to update this trip'
      });
    }

    // Get the total seats from the bus
    const bus = await Bus.findById(trip.bus).select('seats');
    if (!bus) {
      return res.status(400).json({
        success: false,
        message: 'Associated bus not found'
      });
    }

    // Calculate total booked seats
    const bookingAggregate = await Booking.aggregate([
      {
        $match: {
          tripID: trip._id,
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalSeats' }
        }
      }
    ]);

    const totalBooked = bookingAggregate[0]?.total || 0;
    const totalSeats = bus.seats;
    
    // Ensure we're not setting available seats to less than booked seats
    if (seatsAvailable > (totalSeats - totalBooked)) {
      return res.status(400).json({
        success: false,
        message: `Cannot set available seats to ${seatsAvailable}. There are already ${totalBooked} seats booked out of ${totalSeats} total seats.`
      });
    }

    // Update the seatsAvailable
    trip.seatsAvailable = seatsAvailable;
    await trip.save();

    res.json({
      success: true,
      message: 'Available seats updated successfully',
      trip: {
        _id: trip._id,
        bus: trip.bus,
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate,
        departureTime: trip.departureTime,
        totalSeats: totalSeats,
        seatsAvailable: trip.seatsAvailable,
        seatsBooked: totalBooked,
        seatsHeld: totalSeats - totalBooked - trip.seatsAvailable
      }
    });

  } catch (error) {
    console.error('Error updating trip seats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update available seats. Please try again.'
    });
  }
});

// Get trip details with seat information
// Response:
// {
//   "success": true,
//   "message": "Available seats updated successfully",
//   "trip": {
//     "totalSeats": 30,
//     "seatsAvailable": 25,
//     "seatsBooked": 0,
//     "seatsHeld": 5
//     // ... other trip details
//   }
router.get('/trip/:id/seats', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the trip and verify it belongs to the manager's company
    const trip = await Trip.findOne({
      _id: id,
      companyID: req.user.companyID
    }).populate('bus', 'busNumber seats');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to view this trip'
      });
    }

    // Calculate total booked seats
    const bookingAggregate = await Booking.aggregate([
      {
        $match: {
          tripID: trip._id,
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalSeats' }
        }
      }
    ]);

    const totalBooked = bookingAggregate[0]?.total || 0;
    const totalSeats = trip.bus.seats;
    const seatsHeld = totalSeats - totalBooked - trip.seatsAvailable;

    res.json({
      success: true,
      trip: {
        _id: trip._id,
        bus: trip.bus,
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate,
        departureTime: trip.departureTime,
        totalSeats,
        seatsAvailable: trip.seatsAvailable,
        seatsBooked: totalBooked,
        seatsHeld,
        status: trip.status
      }
    });

  } catch (error) {
    console.error('Error fetching trip seat information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trip seat information'
    });
  }
});




// Get company profile data
router.get('/show-profile', auth, managerOnly, async (req, res) => {
  try {
    // Get company data (excluding sensitive fields)
    const company = await Company.findOne(
      { _id: req.user.id },
      { 
        password: 0, 
        admin: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0
      }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company profile'
    });
  }
});

// Update company profile and/or manager account
router.put('/Edit-profile', auth, managerOnly, (req, res) => {
  // Handle file upload if present
  upload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading file'
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing request'
        });
      }

      const { 
        companyName, 
        phone, 
        email, 
        address, 
        currentPassword, 
        newPassword 
      } = req.body;

      const updates = {};
      const company = await Company.findById(req.user.id);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company details
      if (companyName) updates.companyName = companyName;
      if (phone) updates.phone = phone;
      if (address) updates.address = address;
      
      // Handle email update with validation
      if (email && email !== company.email) {
        // Check if email is already in use
        const emailExists = await Company.findOne({ email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use',
            field: 'email'
          });
        }
        updates.email = email.toLowerCase().trim();
      }

      // Handle password change if requested
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required to change password',
            field: 'currentPassword'
          });
        }
        
        // Verify current password
        const isMatch = await company.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect',
            field: 'currentPassword'
          });
        }
        
        // Hash and update new password
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(newPassword, salt);
      }

      // Handle logo upload if file was uploaded
      if (req.file) {
        // Delete old logo if it exists
        if (company.logo && fs.existsSync(company.logo)) {
          try {
            fs.unlinkSync(company.logo);
          } catch (err) {
            console.error('Error deleting old logo:', err);
          }
        }
        updates.logo = req.file.path.replace(/\\/g, '/'); // Convert to forward slashes for URLs
      }

      // Update the company
      const updatedCompany = await Company.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -__v');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        company: updatedCompany
      });

    } catch (error) {
      console.error('Error updating company profile:', error);
      
      // Delete uploaded file if there was an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error cleaning up uploaded file:', err);
        }
      }
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update profile. Please try again.'
      });
    }
  });
});

/**
 * @route   GET /api/company/notifications
 * @desc    Get all notifications for the company
 * @access  Private/Company Manager
 */
router.get('/notifications', auth, managerOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const query = { companyID: req.user.companyID };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: [
        { path: 'sender', select: 'username email' },
        { path: 'company', select: 'companyName' }
      ]
    };

    const result = await Notification.paginate(query, options);

    // Mark notifications as read when fetched
    if (result.docs.length > 0) {
      const notificationIds = result.docs.map(n => n._id);
      await Notification.updateMany(
        { _id: { $in: notificationIds }, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      
      // Update the result to show notifications as read
      result.docs.forEach(notification => {
        notification.isRead = true;
        notification.readAt = new Date();
      });
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});



/**
 * @route   GET /api/company/export/staff
 * @desc    Export staff directory to Excel
 * @access  Private/Manager
 */
router.get('/export/staff', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    
    // Get all staff for the company with the required fields
    const staff = await Staff.find({ companyID: companyId })
      .select('username email phone gender age address staffType createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Found staff:', staff); // Debug log

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Staff Directory');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Staff Type', key: 'staffType', width: 15 },
      { header: 'Join Date', key: 'joinDate', width: 15 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    staff.forEach((member) => {
      const row = worksheet.addRow({
        name: member.username || 'N/A',
        email: member.email || 'N/A',
        phone: member.phone || 'N/A',
        gender: member.gender || 'N/A',
        age: member.age || 'N/A',
        address: member.address || 'N/A',
        staffType: member.staffType || 'N/A',
        joinDate: member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'
      });

      // Add borders to each cell in the row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=staff_directory_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting staff directory',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/company/export/trips
 * @desc    Export trips report to Excel
 * @access  Private/Manager
 */
router.get('/export/trips', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const { startDate, endDate, status } = req.query;
    
    // Build query
    const query = { companyID: companyId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.departureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Get trips with related data
    const trips = await Trip.find(query)
      .populate({
        path: 'bus',
        select: 'busNumber busType seats model driver',
        populate: {
          path: 'driver',
          select: 'username phone staffType',
          match: { staffType: 'driver' }
        }
      })
      .sort({ departureDate: -1 })
      .lean();

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trips Report');

    // Add headers with styling
    const headerRow = worksheet.addRow([
      'Origin', 'Destination', 'Departure Date', 'Departure Time',
      'Arrival Date', 'Arrival Time', 'Bus Number', 'Bus Type',
      'Seats', 'Model', 'Driver', 'Driver Phone', 'Status', 'Booked Seats'
    ]);

    // Style headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    });

    // Add data rows
    for (const trip of trips) {
      const bus = trip.bus || {};
      let driverInfo = {
        username: 'Not Assigned',
        phone: 'N/A'
      };

      // Format dates and times
      const departureDate = trip.departureDate ? new Date(trip.departureDate) : null;
      const arrivalDate = trip.arrivalDate ? new Date(trip.arrivalDate) : null;

      // Format date as YYYY-MM-DD
      const formatDate = (date) => date ? date.toISOString().split('T')[0] : 'N/A';
      
      // Format time as HH:MM
      const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        const [hours, minutes] = timeStr.split(':');
        return `${hours.padStart(2, '0')}:${minutes || '00'}`;
      };

      // Handle driver information
      if (bus.driver && typeof bus.driver === 'object' && bus.driver.staffType === 'driver') {
        driverInfo = {
          username: bus.driver.username || 'Not Assigned',
          phone: bus.driver.phone || 'N/A'
        };
      } else if (bus.driver) {
        try {
          const driver = await Staff.findById(bus.driver).select('username phone staffType').lean();
          if (driver && driver.staffType === 'driver') {
            driverInfo = {
              username: driver.username || 'Not Assigned',
              phone: driver.phone || 'N/A'
            };
          }
        } catch (error) {
          console.error('Error fetching driver details:', error);
        }
      }

      worksheet.addRow([
        trip.origin || 'N/A',
        trip.destination || 'N/A',
        formatDate(departureDate),
        formatTime(trip.departureTime),
        formatDate(arrivalDate),
        formatTime(trip.arrivalTime),
        bus.busNumber || 'N/A',
        bus.busType ? bus.busType.charAt(0).toUpperCase() + bus.busType.slice(1) : 'N/A',
        bus.seats || 0,
        bus.model || 'N/A',
        driverInfo.username,
        driverInfo.phone,
        trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'N/A',
        (bus.seats - (trip.seatsAvailable || 0))
      ]);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 30); // Reduced max width for better fit
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'trips-report.xlsx'
    );

    // Send the workbook as a response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting trips report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/company/export/bookings
 * @desc    Export bookings report to Excel
 * @access  Private/Manager
 */
router.get('/export/bookings', auth, managerOnly, async (req, res) => {
  try {
    console.log('=== Starting export bookings ===');
    
    // First, get all bookings without any filters
    console.log('Fetching all bookings without filters...');
    const allBookings = await Booking.find({}).lean();
    console.log(`Found ${allBookings.length} total bookings in database`);
    
    if (allBookings.length > 0) {
      console.log('Sample raw booking from DB:', JSON.stringify({
        _id: allBookings[0]._id,
        tripID: allBookings[0].tripID,
        staffID: allBookings[0].staffID,
        status: allBookings[0].status,
        bookingType: allBookings[0].bookingType,
        totalAmount: allBookings[0].totalAmount,
        createdAt: allBookings[0].createdAt
      }, null, 2));
    }

    // Now get bookings with populated data
    console.log('Fetching bookings with populated data...');
    const bookings = await Booking.find({})
      .populate({
        path: 'tripID',
        select: 'origin destination departureDate arrivalDate',
        options: { lean: true }
      })
      .populate({
        path: 'staffID',
        select: 'username email phone',
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${bookings.length} bookings after population`);
    if (bookings.length > 0) {
      console.log('Sample populated booking:', JSON.stringify({
        _id: bookings[0]._id,
        tripID: bookings[0].tripID,
        staffID: bookings[0].staffID,
        status: bookings[0].status,
        bookingType: bookings[0].bookingType,
        totalAmount: bookings[0].totalAmount,
        createdAt: bookings[0].createdAt
      }, null, 2));
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings Report');

    // Define columns with headers
    worksheet.columns = [
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Origin', key: 'origin', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Travel Date', key: 'travelDate', width: 15 },
      { header: 'Seats', key: 'seats', width: 10 },
      { header: 'Total Amount', key: 'totalAmount', width: 15, style: { numFmt: '$#,##0.00' } },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Booking Status', key: 'bookingStatus', width: 15 },
      { header: 'Booking Type', key: 'bookingType', width: 15 },
      { header: 'Booking Date', key: 'bookingDate', width: 20 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    let rowCount = 0;
    for (const booking of bookings) {
      try {
        rowCount++;
        console.log(`Processing booking ${rowCount}/${bookings.length}:`, booking._id);
        
        // Safely get values with null checks
        const getValue = (obj, path, defaultValue = 'N/A') => {
          try {
            const value = path.split('.').reduce((o, p) => (o && o[p] !== undefined ? o[p] : null), booking);
            return value !== null && value !== undefined ? value : defaultValue;
          } catch (e) {
            console.error(`Error getting value for path ${path}:`, e);
            return defaultValue;
          }
        };

        const rowData = {
          customer: getValue(booking, 'staffID.username', 'Counter Sale'),
          email: booking.userEmail || getValue(booking, 'staffID.email', 'N/A'),
          phone: getValue(booking, 'staffID.phone'),
          origin: getValue(booking, 'tripID.origin'),
          destination: getValue(booking, 'tripID.destination'),
          travelDate: booking.tripID?.departureDate ? 
            new Date(booking.tripID.departureDate).toLocaleDateString() : 'N/A',
          seats: Array.isArray(booking.assignedSeats) ? 
            booking.assignedSeats.join(', ') : 
            (booking.assignedSeats ? String(booking.assignedSeats) : 'N/A'),
          totalAmount: booking.totalAmount || 0,
          paymentStatus: booking.paymentStatus || 'Pending',
          bookingStatus: booking.status || 'Confirmed',
          bookingType: booking.bookingType || 'N/A',
          bookingDate: booking.createdAt ? 
            new Date(booking.createdAt).toLocaleString() : 'N/A'
        };
        
        console.log(`Adding row ${rowCount} data:`, rowData);
        const row = worksheet.addRow(rowData);

        // Add borders to each cell in the row
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      } catch (rowError) {
        console.error(`Error processing booking row ${rowCount}/${bookings.length} (${booking._id}):`, rowError);
        console.error('Problematic booking data:', JSON.stringify(booking, null, 2));
      }
    }
    
    console.log(`Successfully processed ${rowCount} bookings`);

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (!column || !column.eachCell) return;
      
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        let columnLength = 0;
        if (cell.value !== null && cell.value !== undefined) {
          columnLength = cell.value.toString().length;
        }
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      
      // Set column width with reasonable limits (min: header length + 2, max: 50)
      const headerLength = column.header ? column.header.length : 10;
      column.width = Math.min(Math.max(maxLength + 2, headerLength + 2), 50);
    });

    // Set response headers
    setExcelHeaders(res, 'bookings_report');

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting bookings report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/company/export/financial-summary
 * @desc    Export financial summary to Excel
 * @access  Private/Manager
 */
router.get('/export/financial-summary', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    console.log('=== Starting financial summary export ===');
    console.log('Company ID:', companyId);
    console.log('Date range:', { startDate, endDate });
    console.log('Group by:', groupBy);
    
    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month', 'year'];
    const groupByValue = validGroupBy.includes(groupBy) ? groupBy : 'month';
    
    console.log('Exporting financial summary for company:', companyId);
    
    // Convert companyId to ObjectId if it's a number
    const companyObjectId = typeof companyId === 'number' 
      ? (await Company.findOne({ companyID: companyId }))?._id 
      : companyId;
      
    if (!companyObjectId) {
      throw new Error('Company not found');
    }
    
    console.log('Using company ObjectId:', companyObjectId);
    
    // Check total bookings in the database
    const totalBookingsInDB = await Booking.countDocuments({});
    console.log('Total bookings in database:', totalBookingsInDB);
    
    // Get a sample of all bookings to check their structure
    const allBookingsSample = await Booking.find({}).limit(3).lean();
    console.log('Sample of all bookings in database:', JSON.stringify(allBookingsSample.map(b => ({
      _id: b._id,
      companyId: b.companyId,
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    })), null, 2));
    
    // Check bookings for this company
    const bookingsCount = await Booking.countDocuments({ companyId: companyObjectId });
    console.log(`Total bookings for company ${companyObjectId}:`, bookingsCount);
    
    // Get sample of company's bookings to check their structure
    const companyBookings = await Booking.find({ companyId: companyObjectId }).limit(3).lean();
    console.log(`Sample of company's bookings:`, JSON.stringify(companyBookings, null, 2));
    
    // Build match query
    // Include bookings with matching companyId OR no companyId (for backward compatibility)
    const matchQuery = {
      $and: [
        {
          $or: [
            { companyId: companyObjectId },
            { companyId: { $exists: false } },
            { companyId: null }
          ]
        },
        { status: { $ne: 'cancelled' } },
        { paymentStatus: 'paid' }
      ]
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      console.log('Filtering by date range:', { startDate, endDate });
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      console.log('No date range filter applied');
    }
    
    console.log('Final match query:', JSON.stringify(matchQuery, null, 2));
    
    // Log the count of matching documents
    const matchingCount = await Booking.countDocuments(matchQuery);
    console.log(`Found ${matchingCount} matching bookings`);

    // Format for grouping
    const dateFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },  // Changed from bookingDate to createdAt
      week: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },   // Changed from bookingDate to createdAt
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },  // Changed from bookingDate to createdAt
      year: { $dateToString: { format: '%Y', date: '$createdAt' } }       // Changed from bookingDate to createdAt
    }[groupByValue];
    
    console.log('Grouping by:', groupByValue);

    // Get financial summary
    console.log('Fetching financial data...');
    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: dateFormat,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageBookingValue: { $avg: '$totalAmount' },
          date: { $first: '$createdAt' },
          paymentStatuses: { $push: '$paymentStatus' }
        }
      },
      { $sort: { _id: 1 } }
    ];
    
    console.log('Aggregation pipeline:', JSON.stringify(pipeline, null, 2));
    
    const financials = await Booking.aggregate(pipeline).allowDiskUse(true);
    console.log(`Aggregation returned ${financials.length} results`);
    
    // If no results, try without the payment status filter to see if that's the issue
    if (financials.length === 0) {
      console.log('No results with paymentStatus filter, trying without it...');
      const testMatch = { ...matchQuery };
      delete testMatch.paymentStatus;
      
      const testPipeline = [
        { $match: testMatch },
        {
          $group: {
            _id: dateFormat,
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageBookingValue: { $avg: '$totalAmount' },
            date: { $first: '$createdAt' },
            paymentStatuses: { $push: '$paymentStatus' }
          }
        },
        { $sort: { _id: 1 } }
      ];
      
      const testResults = await Booking.aggregate(testPipeline).allowDiskUse(true);
      console.log(`Test query returned ${testResults.length} results`);
      if (testResults.length > 0) {
        console.log('Payment statuses in data:', [...new Set(testResults.flatMap(r => r.paymentStatuses))]);
      }
    }
    
    console.log(`Found ${financials.length} financial records`);
    if (financials.length > 0) {
      console.log('Sample financial record:', JSON.stringify(financials[0], null, 2));
    }

    // Get payment methods distribution
    console.log('Fetching payment methods distribution...');
    const paymentMethods = await Booking.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'bookingID',
          as: 'payment'
        }
      },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$payment.paymentMethod', 'Unknown'] },
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { total: -1 } }
    ]).allowDiskUse(true);  // Added allowDiskUse for large datasets
    
    console.log(`Found ${paymentMethods.length} payment methods`);
    if (paymentMethods.length > 0) {
      console.log('Sample payment method:', JSON.stringify(paymentMethods[0], null, 2));
    }

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Calculate totals
    const totalBookingsCount = financials.reduce((sum, item) => sum + (item.totalBookings || 0), 0);
    const totalRevenue = financials.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    
    // Add summary data
    summarySheet.addRow(['Financial Summary']);
    summarySheet.addRow(['Period', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time']);
    summarySheet.addRow(['Grouped By', groupByValue]);
    summarySheet.addRow([]);
    
    // Add financial totals
    summarySheet.addRow(['Total Revenue', `$${totalRevenue.toFixed(2)}`]);
    summarySheet.addRow(['Total Bookings', totalBookingsCount]);
    summarySheet.addRow(['Average Booking Value', `$${(totalRevenue / (totalBookingsCount || 1)).toFixed(2)}`]);
    
    // Add payment methods
    summarySheet.addRow([]);
    summarySheet.addRow(['Payment Methods']);
    paymentMethods.forEach(method => {
      summarySheet.addRow([
        method._id || 'Unknown',
        method.count,
        `$${method.total.toFixed(2)}`,
        `${((method.total / (totalRevenue || 1)) * 100).toFixed(1)}%`
      ]);
    });
    
    // Style summary sheet
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    summarySheet.getCell('A6').font = { bold: true };
    summarySheet.getCell('A8').font = { bold: true };
    
    // Add Financial Data sheet
    const dataSheet = workbook.addWorksheet('Financial Data');
    
    // Add headers
    const headerRow = dataSheet.addRow([
      'Period', 'Total Bookings', 'Total Revenue', 'Average Booking Value'
    ]);
    
    // Style header row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add data rows
    financials.forEach(item => {
      const row = dataSheet.addRow([
        item._id,
        item.totalBookings,
        item.totalRevenue,
        item.averageBookingValue
      ]);
      
      // Add borders to each cell in the row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Format currency columns
    const formatCurrency = (sheet, column) => {
      sheet.getColumn(column).eachCell((cell) => {
        if (cell.value !== undefined && cell.value !== 'Total Revenue' && cell.value !== 'Average Booking Value') {
          cell.numFmt = '$#,##0.00';
        }
      });
    };
    
    formatCurrency(dataSheet, 'C'); // Total Revenue
    formatCurrency(dataSheet, 'D'); // Average Booking Value
    
    // Auto-fit columns
    [summarySheet, dataSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 40);
      });
    });
    
    // Set response headers
    setExcelHeaders(res, 'financial_summary');
    
    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export financial summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting financial summary',
      error: error.message
    });
  }
});

module.exports = router;









