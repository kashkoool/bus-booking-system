const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/authMiddleware');
const { managerOnly } = require('../middleware/roleMiddleware');
const Staff = require('../models/Staff');
const Notification = require('../models/Notification');
const Company = require('../models/Company');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { tajawalFonts, getSystemLogoBuffer, addPdfHeader, addPdfFooter } = require('../utils/pdfGenerator');

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

// Bus Management Endpoints

// Get all buses for company
router.get('/buses', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const buses = await Bus.find({ company: companyId })
      .populate('driver', 'username fullName phone')
      .select('-__v');
    
    res.json(buses);
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ message: 'فشل في تحميل بيانات الباصات', error: error.message });
  }
});

// Add a new bus
router.post('/add-bus', auth, managerOnly, [
  check('busNumber', 'رقم الباص مطلوب').notEmpty(),
  check('seats', 'سعة الباص مطلوبة').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyID || req.user._id;
    const { busNumber, seats, busType, model, driver } = req.body;

    // Check if bus number already exists for this company
    const existingBus = await Bus.findOne({ busNumber, company: companyId });
    if (existingBus) {
      return res.status(400).json({ message: 'رقم الباص مسجل مسبقاً' });
    }

    // Prevent assigning the same driver to more than one bus
    if (driver) {
      const driverAssigned = await Bus.findOne({ driver });
      if (driverAssigned) {
        return res.status(400).json({ message: 'هذا السائق مرتبط بالفعل بباص آخر' });
      }
    }

    const newBus = new Bus({
      companyID: companyId,
      company: companyId,
      addedBy: req.user._id,
      busNumber,
      seats: Number(seats),
      busType,
      model,
      driver: driver || null,
      // status: 'active' // Default status
    });

    await newBus.save();
    res.status(201).json({ message: 'تمت إضافة باص بنجاح', bus: newBus });
  } catch (error) {
    console.error('Error adding bus:', error);
    res.status(500).json({ message: 'فشل في إضافة الباص', error: error.message });
  }
});

// Toggle bus active status
router.patch('/buses/:id/toggle-status', auth, managerOnly, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'الباص غير موجود' });
    }

    // Verify bus belongs to company
    const companyId = req.user.companyID || req.user._id;
    if (bus.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    bus.isActive = !bus.isActive;
    await bus.save();

    res.json({ 
      message: `تم ${bus.isActive ? 'تفعيل' : 'تعطيل'} الباص بنجاح`,
      isActive: bus.isActive 
    });
  } catch (error) {
    console.error('Error toggling bus status:', error);
    res.status(500).json({ message: 'فشل في تغيير حالة الباص', error: error.message });
  }
});

// Delete a bus
router.delete('/buses/:id', auth, managerOnly, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'الباص غير موجود' });
    }

    // Verify bus belongs to company
    const companyId = req.user.companyID || req.user._id;
    if (bus.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    // Check if bus is assigned to any trips
    const hasTrips = await Trip.exists({ bus: bus._id });
    if (hasTrips) {
      return res.status(400).json({ 
        message: 'لا يمكن حذف الباص لأنه مرتبط برحلات',
        hasTrips: true
      });
    }

    await Bus.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف الباص بنجاح' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({ message: 'فشل في حذف الباص', error: error.message });
  }
});

// Get single bus details
router.get('/buses/:id', auth, managerOnly, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driver', 'username fullName phone')
      .select('-__v');
    
    if (!bus) {
      return res.status(404).json({ message: 'الباص غير موجود' });
    }

    // Verify bus belongs to company
    const companyId = req.user.companyID || req.user._id;
    if (bus.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    res.json(bus);
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ message: 'فشل في تحميل بيانات الباص', error: error.message });
  }
});

// Update bus details
router.put('/buses/:id', auth, managerOnly, async (req, res) => {
  try {
    const { busNumber, busType, driver } = req.body;
    
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'الباص غير موجود' });
    }

    // Verify bus belongs to company
    const companyId = req.user.companyID || req.user._id;
    if (bus.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    // Check if bus number is being updated and if it's already taken
    if (busNumber && busNumber !== bus.busNumber) {
      const existingBus = await Bus.findOne({ 
        busNumber,
        company: companyId,
        _id: { $ne: req.params.id }
      });
      
      if (existingBus) {
        return res.status(400).json({ message: 'رقم الباص مسجل مسبقاً' });
      }
      bus.busNumber = busNumber;
    }

    // Update other fields
    if (busType) bus.busType = busType;
    
    // Handle driver assignment
    if (driver !== undefined) {
      // If driver is being unassigned
      if (driver === '' || driver === null) {
        bus.driver = null;
      } else {
        // Verify driver exists and belongs to company
        const driverStaff = await Staff.findOne({
          _id: driver,
          companyID: companyId,
          staffType: 'driver'
        });
        
        if (!driverStaff) {
          return res.status(400).json({ message: 'السائق غير صالح' });
        }
        
        bus.driver = driver;
      }
    }

    await bus.save();
    
    // Populate driver details in response
    const updatedBus = await Bus.findById(req.params.id)
      .populate('driver', 'username phone')
      .select('-__v');
    
    res.json({ 
      message: 'تم تحديث بيانات الباص بنجاح',
      bus: updatedBus 
    });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({ message: 'فشل في تحديث بيانات الباص', error: error.message });
  }
});

// Get all staff for company with search, filter, and pagination
router.get('/staff', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      status,
      staffType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { companyID: companyId };
    
    // Add search criteria
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    // Add staff type filter
    if (staffType) {
      query.staffType = staffType;
    }

    // Set up pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const count = await Staff.countDocuments(query);
    
    // Find staff with pagination and sorting
    const staff = await Staff.find(query)
      .select('-password -__v -updatedAt') // Removed -createdAt to include it in the response
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: staff,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff',
      error: error.message
    });
  }
});

// Get individual staff member by ID
router.get('/staff/:id/view', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyID || req.user._id;

    // Find staff member
    const staff = await Staff.findOne({ 
      _id: id, 
      companyID: companyId 
    }).select('-password -__v');

    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: 'Staff member not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff member',
      error: error.message
    });
  }
});

// Get company notifications
router.get('/notifications', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    
    // Find notifications for this company
    const notifications = await Notification.find({
      companyID: companyId,
      isRead: false
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// Company dashboard
router.get('/dashboard', auth, managerOnly, async (req, res) => {
  console.log('=== Dashboard Request ===');
  console.log('User:', {
    _id: req.user?._id,
    companyID: req.user?.companyID,
    role: req.user?.role
  });

  try {
    if (!req.user) {
      console.error('No user in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const companyId = req.user.companyID || req.user._id;
    console.log('Looking up company with ID:', companyId, 'Type:', typeof companyId);
    
    // Build query to handle both numeric companyID and ObjectId _id
    const query = {};
    
    // If companyId is a number, search by companyID field only
    if (typeof companyId === 'number' || !isNaN(companyId)) {
      query.companyID = companyId;
    } else if (typeof companyId === 'string' && companyId.length === 24) {
      // If it's a string that looks like an ObjectId, try to use it as _id
      query.$or = [
        { _id: companyId },
        { companyID: companyId }
      ];
    } else {
      // For other cases, try both
      query.$or = [
        { _id: companyId },
        { companyID: companyId },
        { companyID: companyId?.toString?.() }
      ].filter(Boolean);
    }

    console.log('Query:', JSON.stringify(query, null, 2));
    
    // Get basic company info
    const company = await Company.findOne(query).select('-password').lean();

    console.log('Found company:', company ? 'Yes' : 'No');

    if (!company) {
      console.error('Company not found for ID:', companyId);
      return res.status(404).json({
        success: false,
        message: 'Company not found',
        companyId: companyId
      });
    }

    // Get additional stats
    const [staffCount, busCount, activeTrips, todayBookings] = await Promise.all([
      Staff.countDocuments({ companyID: companyId }),
      Bus.countDocuments({ companyID: companyId }),
      Trip.countDocuments({ companyID: companyId, status: 'active' }),
      Booking.countDocuments({ 
        companyID: companyId,
        createdAt: { $gte: new Date().setHours(0,0,0,0) }
      })
    ]);

    console.log('Stats loaded:', { staffCount, busCount, activeTrips, todayBookings });

    res.json({
      success: true,
      message: 'Company Dashboard',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      company: company,
      stats: {
        staff: staffCount,
        buses: busCount,
        activeTrips,
        todayBookings,
        totalUsers: staffCount + 1 // +1 for the manager
      },
      revenueData: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        data: [12000, 19000, 3000, 5000, 2000, 25000]
      },
      userDistribution: {
        customers: 60,
        staff: 30,
        companyManagers: 5,
        admins: 5
      }
    });
  } catch (error) {
    console.error('Dashboard error:', {
      message: error.message,
      stack: error.stack,
      user: req.user,
      companyId: req.user?.companyID || req.user?._id
    });
    
    res.status(500).json({
      success: false,
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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

    // Get bus count for the company
    const busCount = await Bus.countDocuments({ companyID: companyId });

    // Get staff count for the company
    const staffCount = await Staff.countDocuments({ companyID: companyId });

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
        upcomingTrips,
        busCount,
        staffCount
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


// Update staff
router.put('/updatestaff/:id', [
  auth, 
  managerOnly,
  [
    check('username', 'Username is required').optional().notEmpty(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('phone', 'Please include a valid phone number').optional().isMobilePhone(),
    check('staffType', 'Invalid staff type').optional().isIn(['accountant', 'supervisor', 'employee', 'driver']),
    check('status', 'Invalid status').optional().isIn(['active', 'suspended'])
  ]
], async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;
    const companyId = req.user.companyID || req.user._id;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: 'Staff not found' 
      });
    }

    // Verify staff belongs to manager's company
    if (staff.companyID.toString() !== companyId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this staff member' 
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'username', 'age', 'gender', 'phone', 'email', 
      'address', 'staffType'
    ];
    const updatesToApply = {};
    
    // Only allow direct updates to specific fields
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updatesToApply[key] = updates[key];
      }
    });

    // Handle status and isActive updates
    if (updates.status !== undefined) {
      updatesToApply.status = updates.status;
      // The model's setter will handle syncing isActive
    } else if (updates.isActive !== undefined) {
      // If isActive is provided directly, map it to status
      updatesToApply.status = updates.isActive ? 'active' : 'inactive';
    }

    // If email is being updated, check if it's already in use
    if (updatesToApply.email && updatesToApply.email !== staff.email) {
      const existingStaff = await Staff.findOne({ email: updatesToApply.email });
      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another staff member'
        });
      }
    }

    // If phone is being updated, check if it's already in use
    if (updatesToApply.phone && updatesToApply.phone !== staff.phone) {
      const existingStaff = await Staff.findOne({ phone: updatesToApply.phone });
      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use by another staff member'
        });
      }
    }

    // Update staff
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { $set: updatesToApply },
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already in use`
      });
    }
    
    // Handle validation errors
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
      message: 'Error updating staff',
      error: error.message
    });
  }
});

// Delete staff
router.delete('/deletestaff/:id', auth, managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyID || req.user._id;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Verify staff belongs to manager's company
    if (staff.companyID.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this staff member'
      });
    }

    // Check if staff has any active bookings or assignments
    const hasActiveBookings = await Booking.exists({ 
      $or: [
        { 'staffID': id },
        { 'driverID': id }
      ],
      status: { $nin: ['completed', 'cancelled'] }
    });

    if (hasActiveBookings) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete staff with active bookings or assignments',
        code: 'ACTIVE_BOOKINGS_EXIST'
      });
    }

    // Delete the staff member
    await Staff.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Staff deleted successfully',
      data: { staffId: id }
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
    const staff = await Staff.find({ companyID: companyId })
      .select('username email phone gender age address staffType createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=staff_directory_${new Date().toISOString().split('T')[0]}.pdf`);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.registerFont('Tajawal-Regular', tajawalFonts.regular);
    doc.registerFont('Tajawal-Bold', tajawalFonts.bold);
    doc.registerFont('Tajawal-Medium', tajawalFonts.medium);
    const logoBuffer = await getSystemLogoBuffer();
    addPdfHeader(doc, 'Staff Directory', tajawalFonts, logoBuffer);
    let currentY = 190;
    doc.font(tajawalFonts.bold).fontSize(16).fillColor('#1a5276').text('Staff List', 50, currentY);
    currentY += 30;
    // Table header
    doc.font(tajawalFonts.medium).fontSize(12).fillColor('#2c3e50');
    doc.text('Name', 50, currentY);
    doc.text('Email', 150, currentY);
    doc.text('Phone', 270, currentY);
    doc.text('Gender', 350, currentY);
    doc.text('Age', 410, currentY);
    doc.text('Type', 450, currentY);
    doc.text('Join Date', 510, currentY);
    currentY += 18;
    doc.moveTo(50, currentY).lineTo(560, currentY).lineWidth(0.5).stroke('#3498db');
    currentY += 8;
    doc.font(tajawalFonts.regular).fontSize(11).fillColor('#34495e');
    staff.forEach(member => {
      if (currentY > 750) {
        doc.addPage();
        addPdfHeader(doc, 'Staff Directory', tajawalFonts, logoBuffer);
        currentY = 190;
      }
      doc.text(member.username || 'N/A', 50, currentY);
      doc.text(member.email || 'N/A', 150, currentY);
      doc.text(member.phone || 'N/A', 270, currentY);
      doc.text(member.gender || 'N/A', 350, currentY);
      doc.text(member.age || 'N/A', 410, currentY);
      doc.text(member.staffType || 'N/A', 450, currentY);
      doc.text(member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A', 510, currentY);
      currentY += 18;
    });
    addPdfFooter(doc, tajawalFonts);
    doc.on('pageAdded', () => addPdfFooter(doc, tajawalFonts));
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Export staff error:', error);
    res.status(500).json({ success: false, message: 'Error exporting staff directory', error: error.message });
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
    const query = { companyID: companyId };
    if (startDate && endDate) {
      query.departureDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) query.status = status;
    const trips = await Trip.find(query)
      .populate({
        path: 'bus',
        select: 'busNumber model driver',
        populate: { path: 'driver', select: 'username phone staffType', match: { staffType: 'driver' } }
      })
      .sort({ departureDate: -1 })
      .lean();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=trips-report.pdf');
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.registerFont('Tajawal-Regular', tajawalFonts.regular);
    doc.registerFont('Tajawal-Bold', tajawalFonts.bold);
    doc.registerFont('Tajawal-Medium', tajawalFonts.medium);
    const logoBuffer = await getSystemLogoBuffer();
    addPdfHeader(doc, 'Trips Report', tajawalFonts, logoBuffer);
    let currentY = 190;
    doc.font(tajawalFonts.bold).fontSize(16).fillColor('#1a5276').text('Trips List', 50, currentY);
    currentY += 30;
    // Table header
    doc.font(tajawalFonts.medium).fontSize(12).fillColor('#2c3e50');
    doc.text('Origin', 50, currentY);
    doc.text('Destination', 120, currentY);
    doc.text('Departure', 210, currentY);
    doc.text('Arrival', 290, currentY);
    doc.text('Bus', 370, currentY);
    doc.text('Driver', 430, currentY);
    doc.text('Status', 510, currentY);
    currentY += 18;
    doc.moveTo(50, currentY).lineTo(560, currentY).lineWidth(0.5).stroke('#3498db');
    currentY += 8;
    doc.font(tajawalFonts.regular).fontSize(11).fillColor('#34495e');
    for (const trip of trips) {
      if (currentY > 750) {
        doc.addPage();
        addPdfHeader(doc, 'Trips Report', tajawalFonts, logoBuffer);
        currentY = 190;
      }
      const bus = trip.bus || {};
      const driver = bus.driver || {};
      doc.text(trip.origin || 'N/A', 50, currentY);
      doc.text(trip.destination || 'N/A', 120, currentY);
      doc.text(trip.departureDate ? new Date(trip.departureDate).toLocaleDateString() : 'N/A', 210, currentY);
      doc.text(trip.arrivalDate ? new Date(trip.arrivalDate).toLocaleDateString() : 'N/A', 290, currentY);
      doc.text(bus.busNumber || 'N/A', 370, currentY);
      doc.text(driver.username || 'N/A', 430, currentY);
      doc.text(trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'N/A', 510, currentY);
      currentY += 18;
    }
    addPdfFooter(doc, tajawalFonts);
    doc.on('pageAdded', () => addPdfFooter(doc, tajawalFonts));
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Export trips error:', error);
    res.status(500).json({ success: false, message: 'Error exporting trips report', error: error.message });
  }
});

/**
 * @route   GET /api/company/export/bookings
 * @desc    Export bookings report to Excel
 * @access  Private/Manager
 */
router.get('/export/bookings', auth, managerOnly, async (req, res) => {
  try {
    const companyId = req.user.companyID || req.user._id;
    const trips = await Trip.find({ companyID: companyId }).select('_id').lean();
    const tripIds = trips.map(t => t._id);
    const bookings = await Booking.find({ tripID: { $in: tripIds } })
      .populate({ path: 'tripID', select: 'origin destination departureDate arrivalDate' })
      .populate({ path: 'staffID', select: 'username email phone' })
      .sort({ createdAt: -1 })
      .lean();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.pdf');
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.registerFont('Tajawal-Regular', tajawalFonts.regular);
    doc.registerFont('Tajawal-Bold', tajawalFonts.bold);
    doc.registerFont('Tajawal-Medium', tajawalFonts.medium);
    const logoBuffer = await getSystemLogoBuffer();
    addPdfHeader(doc, 'Bookings Report', tajawalFonts, logoBuffer);
    let currentY = 190;
    doc.font(tajawalFonts.bold).fontSize(16).fillColor('#1a5276').text('Bookings List', 50, currentY);
    currentY += 30;
    // Table header
    doc.font(tajawalFonts.medium).fontSize(12).fillColor('#2c3e50');
    doc.text('Customer', 50, currentY);
    doc.text('Email', 130, currentY);
    doc.text('Phone', 230, currentY);
    doc.text('Origin', 310, currentY);
    doc.text('Destination', 370, currentY);
    doc.text('Date', 450, currentY);
    doc.text('Seats', 510, currentY);
    currentY += 18;
    doc.moveTo(50, currentY).lineTo(560, currentY).lineWidth(0.5).stroke('#3498db');
    currentY += 8;
    doc.font(tajawalFonts.regular).fontSize(11).fillColor('#34495e');
    bookings.forEach(booking => {
      if (currentY > 750) {
        doc.addPage();
        addPdfHeader(doc, 'Bookings Report', tajawalFonts, logoBuffer);
        currentY = 190;
      }
      const trip = booking.tripID || {};
      // Use userEmail for both Customer and Email columns
      doc.text(booking.userEmail || 'Counter Sale', 50, currentY);
      doc.text(booking.userEmail || 'N/A', 130, currentY);
      // Use first passenger's phone if available
      const phone = (booking.passengers && booking.passengers[0] && booking.passengers[0].phone) ? booking.passengers[0].phone : 'N/A';
      doc.text(phone, 230, currentY);
      doc.text(trip.origin || 'N/A', 310, currentY);
      doc.text(trip.destination || 'N/A', 370, currentY);
      doc.text(trip.departureDate ? new Date(trip.departureDate).toLocaleDateString() : 'N/A', 450, currentY);
      doc.text(Array.isArray(booking.assignedSeats) ? booking.assignedSeats.join(', ') : (booking.assignedSeats ? String(booking.assignedSeats) : 'N/A'), 510, currentY);
      currentY += 18;
    });
    addPdfFooter(doc, tajawalFonts);
    doc.on('pageAdded', () => addPdfFooter(doc, tajawalFonts));
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ success: false, message: 'Error exporting bookings report', error: error.message });
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
    const validGroupBy = ['day', 'week', 'month', 'year'];
    const groupByValue = validGroupBy.includes(groupBy) ? groupBy : 'month';
    const trips = await Trip.find({ companyID: companyId }).select('_id').lean();
    const tripIds = trips.map(t => t._id);
    const matchQuery = {
      tripID: { $in: tripIds },
      status: { $ne: 'cancelled' },
      paymentStatus: 'paid'
    };
    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const dateFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      year: { $dateToString: { format: '%Y', date: '$createdAt' } }
    }[groupByValue];
    const pipeline = [
      { $match: matchQuery },
      { $group: {
        _id: dateFormat,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageBookingValue: { $avg: '$totalAmount' },
        date: { $first: '$createdAt' },
        paymentStatuses: { $push: '$paymentStatus' }
      } },
      { $sort: { _id: 1 } }
    ];
    const financials = await Booking.aggregate(pipeline).allowDiskUse(true);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=financial_summary.pdf');
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.registerFont('Tajawal-Regular', tajawalFonts.regular);
    doc.registerFont('Tajawal-Bold', tajawalFonts.bold);
    doc.registerFont('Tajawal-Medium', tajawalFonts.medium);
    const logoBuffer = await getSystemLogoBuffer();
    addPdfHeader(doc, 'Financial Summary', tajawalFonts, logoBuffer);
    let currentY = 190;
    doc.font(tajawalFonts.bold).fontSize(16).fillColor('#1a5276').text('Financial Data', 50, currentY);
    currentY += 30;
    // Table header
    doc.font(tajawalFonts.medium).fontSize(12).fillColor('#2c3e50');
    doc.text('Period', 50, currentY);
    doc.text('Bookings', 150, currentY);
    doc.text('Revenue', 250, currentY);
    doc.text('Avg Value', 350, currentY);
    currentY += 18;
    doc.moveTo(50, currentY).lineTo(560, currentY).lineWidth(0.5).stroke('#3498db');
    currentY += 8;
    doc.font(tajawalFonts.regular).fontSize(11).fillColor('#34495e');
    financials.forEach(item => {
      if (currentY > 750) {
        doc.addPage();
        addPdfHeader(doc, 'Financial Summary', tajawalFonts, logoBuffer);
        currentY = 190;
      }
      doc.text(item._id, 50, currentY);
      doc.text(item.totalBookings, 150, currentY);
      doc.text(`$${item.totalRevenue.toFixed(2)}`, 250, currentY);
      doc.text(`$${item.averageBookingValue.toFixed(2)}`, 350, currentY);
      currentY += 18;
    });
    addPdfFooter(doc, tajawalFonts);
    doc.on('pageAdded', () => addPdfFooter(doc, tajawalFonts));
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Export financial summary error:', error);
    res.status(500).json({ success: false, message: 'Error exporting financial summary', error: error.message });
  }
});

/**
 * @route   PUT /api/company/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private/Manager
 */
router.put('/notifications/:id/read', auth, managerOnly, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const companyId = req.user.companyID || req.user._id;

    // Find the notification and verify it belongs to this company
    const notification = await Notification.findOne({
      _id: notificationId,
      companyID: companyId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

module.exports = router;
