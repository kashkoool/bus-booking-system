const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const moment = require('moment');


// Regular admin dashboard (with middleware)
router.get('/dashboard', auth, adminOnly, (req, res) => {
  res.json({
    message: 'Admin Dashboard',
    user: req.user
  });
});



// Create company with manager account
router.post('/createcompanies', auth, adminOnly, async (req, res) => {
  try {
    console.log('User object from middleware:', req.user);
    const { companyID, companyName, username, email, password, phone, address } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create company
    const company = new Company({
      companyID,
      companyName,
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      role: 'manager',
      admin: new mongoose.Types.ObjectId(req.user._id)
    });
    
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
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: usersThisMonth
        },
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
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          totalRevenue: totalRevenue[0]?.total || 0
        }
      }
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
    const notifications = companyIds.map(companyId => ({
      sender: req.user._id,
      companyID: companyId,
      title,
      message,
      type,
      action,
      metadata
    }));

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

/**
 * @route   GET /api/admin/notifications
 * @desc    Get all notifications (with filters)
 * @access  Private/Admin
 */
router.get('/notifications', auth, adminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      companyId, 
      isRead, 
      type, 
      startDate, 
      endDate 
    } = req.query;

    const query = {};
    
    // Add filters if provided
    if (companyId) {
      query.companyID = companyId;
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    
    if (type) {
      query.type = type;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: [
        { 
          path: 'sender', 
          select: 'username email',
          options: { allowEmptyArray: true } // Handle case where sender might be deleted
        },
        { 
          path: 'company', 
          select: 'companyName email companyID',
          options: { allowEmptyArray: true } // Handle case where company might be deleted
        }
      ]
    };

    const result = await Notification.paginate(query, options);

    // Add additional company info for better display
    const notificationsWithCompanyInfo = await Promise.all(
      result.docs.map(async notification => {
        // If company population failed (deleted company), try to get basic info
        if (!notification.company && notification.companyID) {
          const company = await Company.findOne({ companyID: notification.companyID })
            .select('companyName email')
            .lean();
          
          if (company) {
            notification.company = company;
          } else {
            notification.company = {
              companyName: `[Deleted Company: ${notification.companyID}]`,
              email: 'N/A',
              companyID: notification.companyID
            };
          }
        }
        return notification;
      })
    );

    res.json({
      success: true,
      ...result,
      docs: notificationsWithCompanyInfo
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



module.exports = router;