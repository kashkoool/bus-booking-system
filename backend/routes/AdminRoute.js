const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const { Customer } = require('../models/Customer');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const moment = require('moment');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin API is running',
    timestamp: new Date().toISOString()
  });
});

// Admin Dashboard Stats
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    console.log('Admin dashboard accessed by:', req.user.username);
    
    // Log model types for debugging
    console.log('Model types:', {
      Customer: typeof Customer,
      Company: typeof Company,
      Booking: typeof Booking,
      Trip: typeof Trip,
      Notification: typeof Notification
    });

    // Test a simple count query
    try {
      const testCount = await Customer.countDocuments({});
      console.log('Test customer count:', testCount);
    } catch (countError) {
      console.error('Error in test count:', countError);
      throw new Error(`Test count failed: ${countError.message}`);
    }
    
    // Get counts for all entities
    // First get the counts without populating
    const [
      totalUsers,
      totalCompanies,
      totalBookings,
      totalTrips,
      pendingCompanies,
      activeCompanies,
      suspendedCompanies
    ] = await Promise.all([
      Customer.countDocuments({}).exec(),
      Company.countDocuments({}).exec(),
      Booking.countDocuments({}).exec(),
      Trip.countDocuments({}).exec(),
      Company.countDocuments({ status: 'pending' }).exec(),
      Company.countDocuments({ status: 'active' }).exec(),
      Company.countDocuments({ status: 'suspended' }).exec()
    ]);

    // Then get the recent bookings and trips with proper population
    const [recentBookings, recentTrips] = await Promise.all([
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: 'trip',
          select: 'origin destination departureTime',
          options: { strictPopulate: false }
        })
        .lean()
        .exec(),
      Trip.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
          path: 'company',
          select: 'companyName',
          options: { strictPopulate: false }
        })
        .lean()
        .exec()
    ]);

    // Calculate revenue (example: sum of all booking amounts)
    const revenueResult = await Booking.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Get recent notifications
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Prepare dashboard data
    const dashboardData = {
      stats: {
        totalUsers,
        totalCompanies,
        totalBookings,
        totalTrips,
        totalRevenue,
        pendingCompanies,
        activeCompanies,
        suspendedCompanies,
      },
      recentBookings,
      recentTrips,
      recentNotifications,
      lastUpdated: new Date()
    };

    console.log('Dashboard data prepared for:', req.user.username);
    
    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error in admin dashboard:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // More detailed error response
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// Check for pending changes before login
router.post('/check-changes', auth, adminOnly, async (req, res) => {
  try {
    console.log('Check changes endpoint hit. User:', req.user);
    
    if (!req.user || req.user.userType !== 'Admin') {
      console.log('Unauthorized access - User not admin:', req.user);
      return res.status(403).json({ 
        success: false, 
        code: 'FORBIDDEN', 
        message: 'Insufficient permissions' 
      });
    }

    // Check for pending company approvals
    const pendingCompanies = await Company.countDocuments({ status: 'pending' });
    
    // Check for critical notifications
    const criticalNotifications = await Notification.countDocuments({
      type: 'critical',
      read: false
    });

    // Check for system updates
    const systemUpdates = 0; // This would come from your system update service

    const result = {
      hasChanges: pendingCompanies > 0 || criticalNotifications > 0 || systemUpdates > 0,
      pendingCompanies,
      criticalNotifications,
      systemUpdates
    };

    console.log('Check changes result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error checking for changes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking for changes',
      error: error.message 
    });
  }
});

// Process all pending companies
router.post('/companies/process-all', auth, adminOnly, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    const update = action === 'approve' 
      ? { status: 'active', approvedAt: new Date() } 
      : { status: 'rejected', rejectedAt: new Date() };

    const result = await Company.updateMany(
      { status: 'pending' },
      { $set: update }
    );

    res.json({
      success: true,
      message: `Successfully ${action}ed ${result.nModified} companies`,
      count: result.nModified
    });
  } catch (error) {
    console.error('Error processing companies:', error);
    res.status(500).json({ message: 'Error processing companies' });
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', auth, adminOnly, async (req, res) => {
  try {
    const { types = [] } = req.body;
    
    const filter = { read: false };
    if (types.length > 0) {
      filter.type = { $in: types };
    }

    const result = await Notification.updateMany(
      filter,
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: `Marked ${result.nModified} notifications as read`,
      count: result.nModified
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});





// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/company-logos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Create company with manager account and logo upload
router.post('/createcompanies', auth, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    console.log('User object from middleware:', req.user);
    const { companyID, companyName, username, email, password, phone, address } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare company data
    const companyData = {
      companyID,
      companyName,
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      role: 'manager',
      admin: new mongoose.Types.ObjectId(req.user._id)
    };

    // Add logo path if file was uploaded
    if (req.file) {
      companyData.logo = '/uploads/company-logos/' + req.file.filename;
    }
    
    // Create company
    const company = new Company(companyData);
    await company.save();
    
    // Create token for the new manager
    const token = jwt.sign(
      {
        id: company._id,
        username: company.username,
        userType: company.role,
        email: company.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'Company and manager account created successfully',
      company,
      token,
    });
  } catch (error) {
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field} already exists` 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Get all companies with admin usernames
router.get('/showcompanies', auth, adminOnly, async (req, res) => {
  try {
    const companies = await Company.find({})
      .populate('admin', 'username') // Only get admin's username
      .exec();
    
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend a company
router.put('/companies/:id/suspend', auth, adminOnly, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({ 
      message: 'Company suspended successfully',
      company 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate a company
router.put('/companies/:id/activate', auth, adminOnly, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({ 
      message: 'Company activated successfully',
      company 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a company
router.delete('/Deletecompanies/:id', auth, adminOnly, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // First get the company to find its numeric ID
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Delete all staff with matching companyID
    await Staff.deleteMany({ companyID: company.companyID });
    
    // Then delete the company
    await Company.findByIdAndDelete(companyId);
    
    res.json({ 
      message: 'Company and all associated staff deleted successfully',
      company: {
        id: company._id,
        name: company.companyName
      }
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Error deleting company', error: error.message });
  }
});



/**
 * Get system statistics
 * @route GET /api/admin/stats
 * @access Private/Admin
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
  console.log('[/api/admin/stats] Endpoint hit');
  try {
    // Get customer statistics
    const totalUsers = await Customer.countDocuments();
    const activeUsers = await Customer.countDocuments({ active: true });
    const usersThisMonth = await Customer.countDocuments({
      createdAt: { $gte: moment().startOf('month').toDate() }
    });

    // Get company statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'active' });
    const pendingCompanies = await Company.countDocuments({ status: 'pending' });

    // Get trip statistics
    const totalTrips = await Trip.countDocuments();
    const completedTrips = await Trip.countDocuments({ status: 'completed' });
    const upcomingTrips = await Trip.countDocuments({ status: 'scheduled' });

    // Get booking statistics
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      totalUsers,
      activeUsers,
      newUsersThisMonth: usersThisMonth,
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        pending: pendingCompanies
      },
      trips: {
        total: totalTrips,
        completed: completedTrips,
        upcoming: upcomingTrips
      },
      totalBookings,
      confirmedBookings,
      revenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * Get company-wise reports
 * @route GET /api/admin/reports/companies
 * @access Private/Admin
 */
router.get('/reports/companies', auth, adminOnly, async (req, res) => {
  try {
    const companies = await Company.aggregate([
      {
        $lookup: {
          from: 'trips',
          localField: 'companyID',
          foreignField: 'companyID',
          as: 'trips'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'companyID',
          foreignField: 'companyID',
          as: 'bookings'
        }
      },
      {
        $project: {
          companyName: 1,
          email: 1,
          status: 1,
          totalTrips: { $size: '$trips' },
          totalBookings: { $size: '$bookings' },
          totalRevenue: {
            $sum: '$bookings.amount'
          },
          activeSince: 1,
          lastActive: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error('Error fetching company reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company reports',
      error: error.message
    });
  }
});

/**
 * Get trip reports with filters
 * @route GET /api/admin/reports/trips
 * @access Private/Admin
 */
router.get('/reports/trips', auth, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, status, companyId } = req.query;
    
    const filter = {};
    
    // Add date range filter
    if (startDate || endDate) {
      filter.departureDate = {};
      if (startDate) filter.departureDate.$gte = new Date(startDate);
      if (endDate) filter.departureDate.$lte = new Date(endDate);
    }
    
    // Add status filter
    if (status) {
      filter.status = status;
    }
    
    // Add company filter
    if (companyId) {
      filter.companyID = Number(companyId);
    }
    
    const trips = await Trip.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'companies',
          localField: 'companyID',
          foreignField: 'companyID',
          as: 'company'
        }
      },
      { $unwind: '$company' },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'trip',
          as: 'bookings'
        }
      },
      {
        $project: {
          _id: 1,
          origin: 1,
          destination: 1,
          departureDate: 1,
          arrivalDate: 1,
          status: 1,
          availableSeats: 1,
          totalSeats: 1,
          company: {
            companyID: '$company.companyID',
            companyName: '$company.companyName',
            // email: '$company.email',
            phone: '$company.phone',
            address: '$company.address',
            // status: '$company.status'
          },
          totalBookings: { $size: '$bookings' },
          revenue: { $sum: '$bookings.amount' },
          occupancyRate: {
            $multiply: [
              { $divide: [
                { $subtract: ['$totalSeats', '$availableSeats'] },
                '$totalSeats'
              ]},
              100
            ]
          }
        }
      },
      { $sort: { departureDate: -1 } }
    ]);

    res.json({
      success: true,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('Error fetching trip reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trip reports',
      error: error.message
    });
  }
});

/**
 * Get revenue reports
 * @route GET /api/admin/reports/revenue
 * @access Private/Admin
 */
router.get('/reports/revenue', auth, adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let groupFormat = '%Y-%m';
    
    if (period === 'day') {
      groupFormat = '%Y-%m-%d';
    } else if (period === 'week') {
      groupFormat = '%Y-%U';
    }
    
    const revenueByPeriod = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: {
            $gte: moment().subtract(1, 'year').toDate()
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: '$createdAt' }
          },
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 },
          averageRevenue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get company-wise revenue
    const revenueByCompany = await Booking.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $lookup: {
          from: 'trips',
          localField: 'tripID',
          foreignField: '_id',
          as: 'trip'
        }
      },
      { $unwind: '$trip' },
      {
        $lookup: {
          from: 'companies',
          localField: 'trip.companyID',
          foreignField: 'companyID',
          as: 'company'
        }
      },
      { $unwind: '$company' },
      {
        $group: {
          _id: {
            companyId: '$company.companyID',
            companyName: '$company.companyName'
          },
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 },
          averageRevenue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      success: true,
      revenueByPeriod,
      revenueByCompany
    });
  } catch (error) {
    console.error('Error fetching revenue reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue reports',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/notifications/send
 * @desc    Send notification to company manager(s)
 * @access  Private/Admin
 */
router.post('/notifications/send', auth, adminOnly, async (req, res) => {
  try {
    const { companyIds, title, message, type = 'info', action = 'none', metadata = {} } = req.body;

    // Validate required fields
    if (!companyIds || !companyIds.length || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Company IDs, title, and message are required'
      });
    }

    // Check if companies exist
    const companies = await Company.find({ companyID: { $in: companyIds } });
    if (companies.length !== companyIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more companies not found'
      });
    }

    // Create notifications
    const notifications = companyIds.map(companyId => {
      const company = companies.find(c => c.companyID === companyId);
      return {
        companyID: companyId,
        companyName: company ? company.companyName : `Company ${companyId}`,
        title,
        message,
        type,
        action,
        metadata,
        // For system notifications, we don't need userEmail
        // userEmail will be null/undefined for company-wide notifications
      };
    });

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: 'Notifications sent successfully',
      count: createdNotifications.length,
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});

// /**
//  * @route   GET /api/admin/notifications
//  * @desc    Get all notifications (with filters)
//  * @access  Private/Admin
//  */
// router.get('/notifications', auth, adminOnly, async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 20, 
//       companyId, 
//       isRead, 
//       type, 
//       startDate, 
//       endDate 
//     } = req.query;

//     const query = {};
    
//     // Add filters if provided
//     if (companyId) {
//       query.companyID = companyId;
//     }
    
//     if (isRead !== undefined) {
//       query.isRead = isRead === 'true';
//     }
    
//     if (type) {
//       query.type = type;
//     }
    
//     // Date range filter
//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     const options = {
//       page: parseInt(page, 10),
//       limit: parseInt(limit, 10),
//       sort: { createdAt: -1 },
//       populate: [
//         { 
//           path: 'sender', 
//           select: 'username email',
//           options: { allowEmptyArray: true } // Handle case where sender might be deleted
//         },
//         { 
//           path: 'company', 
//           select: 'companyName email companyID',
//           options: { allowEmptyArray: true } // Handle case where company might be deleted
//         }
//       ]
//     };

//     const result = await Notification.paginate(query, options);

//     // Add additional company info for better display
//     const notificationsWithCompanyInfo = await Promise.all(
//       result.docs.map(async notification => {
//         // If company population failed (deleted company), try to get basic info
//         if (!notification.company && notification.companyID) {
//           const company = await Company.findOne({ companyID: notification.companyID })
//             .select('companyName email')
//             .lean();
          
//           if (company) {
//             notification.company = company;
//           } else {
//             notification.company = {
//               companyName: `[Deleted Company: ${notification.companyID}]`,
//               email: 'N/A',
//               companyID: notification.companyID
//             };
//           }
//         }
//         return notification;
//       })
//     );

//     res.json({
//       success: true,
//       ...result,
//       docs: notificationsWithCompanyInfo
//     });
//   } catch (error) {
//     console.error('Error fetching notifications:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch notifications',
//       error: error.message
//     });
//   }
// });

/**
 * @route   GET /api/admin/notifications/history
 * @desc    Get notification history with pagination and filters
 * @access  Private/Admin
 */
router.get('/notifications/history', auth, adminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      search
    } = req.query;

    const query = {};
    
    // Add type filter if provided
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Get notifications with company info
    const notifications = await Notification.find(query)
      .populate('company', 'companyName companyID')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit, 10));

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page, 10) < totalPages,
        hasPrevPage: parseInt(page, 10) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/notifications/:id
 * @desc    Get notification by ID
 * @access  Private/Admin
 */
router.get('/notifications/:id', auth, adminOnly, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'username email')
      .populate('company', 'companyName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/companies/:id/manager
 * @desc    Get company and manager details by ID
 * @access  Private/Admin
 */
router.get('/companies/:id/manager', auth, adminOnly, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    console.log('=== DEBUG: Fetching company and manager ===');
    console.log('Company ID:', companyId);
    
    // Find company by ID
    const company = await Company.findById(companyId);
    console.log('Company found:', company ? 'Yes' : 'No');
    
    if (!company) {
      console.log('=== DEBUG: Company not found ===');
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    console.log('=== DEBUG: Company data ===');
    console.log('Company:', {
      _id: company._id,
      companyID: company.companyID,
      companyName: company.companyName,
      username: company.username,
      email: company.email,
      phone: company.phone,
      address: company.address,
      status: company.status,
      logo: company.logo,
      role: company.role
    });

    // Try to find manager in Staff collection first
    let manager = await Staff.findOne({ 
      companyID: company.companyID
    });

    console.log('=== DEBUG: Staff manager lookup ===');
    console.log('Manager found in Staff:', manager ? 'Yes' : 'No');

    // If no manager found in Staff, use company data as manager
    if (!manager) {
      console.log('=== DEBUG: Using company data as manager ===');
      manager = {
        _id: company._id,
        username: company.username,
        email: company.email,
        phone: company.phone,
        status: company.status || 'active'
      };
    }

    console.log('=== DEBUG: Final manager data ===');
    console.log('Manager:', manager);

    res.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          companyID: company.companyID,
          name: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          status: company.status,
          logo: company.logo
        },
        manager: manager ? {
          _id: manager._id,
          username: manager.username,
          email: manager.email,
          phone: manager.phone,
          status: manager.status || 'active'
        } : null
      }
    });
  } catch (error) {
    console.error('=== DEBUG: Error in companies/:id/manager ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company and manager details',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/companies/:id
 * @desc    Update company information
 * @access  Private/Admin
 */
router.put('/companies/:id', auth, adminOnly, async (req, res) => {
  try {
    const companyId = req.params.id;
    const updates = req.body;

    console.log('=== DEBUG: Updating company ===');
    console.log('Company ID:', companyId);
    console.log('Updates:', updates);

    // Find company by ID
    const company = await Company.findById(companyId);
    if (!company) {
      console.log('=== DEBUG: Company not found ===');
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (updates.companyName) updateData.companyName = updates.companyName;
    if (updates.companyID) updateData.companyID = updates.companyID;
    if (updates.email) updateData.email = updates.email;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.address) updateData.address = updates.address;
    if (updates.status) updateData.status = updates.status;
    if (updates.logo) updateData.logo = updates.logo;
    if (updates.username) updateData.username = updates.username;

    // Hash password if provided
    if (updates.password) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      updateData.password = hashedPassword;
    }

    console.log('=== DEBUG: Update data ===');
    console.log('Update data:', updateData);

    // Update company
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId, 
      updateData,
      { new: true }
    );

    console.log('=== DEBUG: Company updated successfully ===');

    res.json({
      success: true,
      message: 'Company updated successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('=== DEBUG: Error updating company ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/companies/:id/logo
 * @desc    Update company logo
 * @access  Private/Admin
 */
router.put('/companies/:id/logo', auth, adminOnly, upload.single('logo'), async (req, res) => {
  try {
    const companyId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      });
    }

    // Find company by ID
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update company logo
    const logoPath = '/uploads/company-logos/' + req.file.filename;
    await Company.findByIdAndUpdate(companyId, { logo: logoPath });

    res.json({
      success: true,
      message: 'Company logo updated successfully',
      logoUrl: logoPath
    });
  } catch (error) {
    console.error('Error updating company logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company logo',
      error: error.message
    });
  }
});



module.exports = router;