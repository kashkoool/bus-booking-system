const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Staff = require('../models/Staff');
const Token = require('../models/Token');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const CreditCard = require('../models/CreditCard');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { decryptCardData } = require('../utils/encryption');
const { auth } = require('../middleware/authMiddleware');
const { managerOrStaff } = require('../middleware/roleMiddleware');



// Unified login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    let user, userType;
    
    // Determine user type based on username prefix
    if (username.startsWith('Admin_')) {
      user = await Admin.findOne({ username });
      userType = 'Admin';
    } else if (username.startsWith('Co_')) {
      user = await Company.findOne({ username });
      userType = 'Company';
      
      // Block if company doesn't exist or is suspended
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Company account suspended - login blocked' });
      }
      
      // Verify username exactly matches the company record
      if (user.username !== username) {
        return res.status(403).json({ message: 'Access denied - you can only login to your own company account' });
      }
    } else if (username.startsWith('Em_')) {
      user = await Staff.findOne({ username }).select('+password');
      userType = 'Staff';
      
      if (user) {
        // DEBUG: Log user details
        console.log('DEBUG: Found staff user:', {
          username: user.username,
          staffType: user.staffType,
          hasPassword: !!user.password,
          passwordLength: user.password ? user.password.length : 0,
          passwordStart: user.password ? user.password.substring(0, 10) + '...' : 'none'
        });
        
        // Check company status for staff
        const company = await Company.findOne({ companyID: user.companyID });
        if (!company) {
          return res.status(403).json({ message: 'Your company does not exist' });
        }
        if (company.status === 'suspended') {
          return res.status(403).json({ message: 'Company account suspended - login blocked' });
        }
        
        // Add companyID to the response for frontend use
        user.companyID = user.companyID;
      }
    } else {
      return res.status(400).json({ message: 'Invalid username format' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords (assuming you have a method like user.comparePassword)
    console.log('Comparing passwords for user:', user.username);
    console.log('DEBUG: Input password:', password);
    console.log('DEBUG: Stored password hash:', user.password);
    
    // Test direct bcrypt comparison
    const bcrypt = require('bcrypt');
    const directMatch = await bcrypt.compare(password, user.password);
    console.log('DEBUG: Direct bcrypt comparison result:', directMatch);
    
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with user data
    console.log('Creating JWT token for user:', user._id);
    // Add companyID to token payload for Company and Staff
    let tokenPayload = { 
      id: user._id,
      username: user.username,
      userType: userType,
      email: user.email,
      role: user.role,
      type: 'access'  // Add this line to specify token type
    };
    if ((userType === 'Company' || userType === 'Staff') && user.companyID) {
      tokenPayload.companyID = user.companyID;
    }
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    // Store token with user data
    console.log('Storing token in database');
    const tokenDoc = await Token.create({
      userType,
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      userData: user.toObject()
    });
    console.log('Token created:', tokenDoc._id);

    // Add companyID to user object in response for Company and Staff
    let userResponse = user.toObject();
    if ((userType === 'Company' || userType === 'Staff') && user.companyID) {
      userResponse.companyID = user.companyID;
    }

    res.json({ 
      token,
      userType,
      user: userResponse,
      dashboardPath: getDashboardPath(userType)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout endpoint to invalidate token
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify and decode token first
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Delete token from database
    await Token.deleteOne({ token });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Helper function to determine dashboard path
function getDashboardPath(userType) {
  switch(userType) {
    case 'Admin': return '/admin/dashboard';
    case 'Company': return '/manager/dashboard';
    case 'Staff': return '/staff/dashboard';
    default: return '/login';
  }
}

// Get all buses for company with driver info if available
router.get('/show-buses', auth, managerOrStaff, async (req, res) => {
  try {
    // This logic handles both manager (using _id) and staff (using companyID)
    const companyId = req.user.companyID;
    const query = { company: companyId };

    const buses = await Bus.find(query)
      .populate({
        path: 'driver',
        select: 'username phone staffType status',
        match: { staffType: 'driver' }
      })
      .lean();

    // Format the response
    const formattedBuses = buses.map(bus => {
      const busObj = {
        ...bus,
        driver: bus.driver && bus.driver.staffType === 'driver' ? {
          username: bus.driver.username,
          phone: bus.driver.phone
        } : null
      };
      
      // Remove the _id field from the driver object if it exists
      if (busObj.driver && busObj.driver._id) {
        delete busObj.driver._id;
      }
      
      // Add a check for userType and adjust the logic for creating the trip
      if (req.user.userType === 'Staff') {
        // Logic specific to staff
      } else {
        // Logic for manager
      }
      
      return busObj;
    });

    res.json(formattedBuses);
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch buses',
      error: error.message 
    });
  }
});

// Get single bus details
router.get('/show-bus/:id', auth, managerOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await Bus.findById(id);
    
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Ensure bus belongs to user's company
    if (bus.companyID !== req.user.companyID) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add trip (usable by both managers and staff)
router.post('/add-trip', auth, managerOrStaff, async (req, res, next) => {
  try {
    const {
      busNumber,
      origin,
      destination,
      departureDate,
      arrivalDate,
      departureTime,
      arrivalTime,
      cost
    } = req.body;

    // Validate required fields
    if (!busNumber || !origin || !destination || !departureDate || !arrivalDate || !cost) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        missingFields: ['busNumber', 'origin', 'destination', 'departureDate', 'arrivalDate', 'cost']
      });
    }

    // Find company details from the user's token
    const company = await Company.findOne({ companyID: req.user.companyID });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company associated with your account not found.'
      });
    }

    // Verify bus belongs to company and get its seats
    const bus = await Bus.findOne({ busNumber });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found',
        field: 'busNumber'
      });
    }

    // Verify bus belongs to company
    if (bus.company !== company.companyID) {
      return res.status(403).json({
        success: false,
        message: 'Bus does not belong to your company'
      });
    }

    // Check for trip conflicts before creating a new one
    const newDeparture = new Date(departureDate);
    const newArrival = new Date(arrivalDate);

    const existingTrip = await Trip.findOne({
      bus: bus._id,
      status: { $nin: ['cancelled', 'completed'] },
      // Check for overlapping time ranges:
      // An existing trip starts before the new one ends, AND
      // an existing trip ends after the new one starts.
      departureDate: { $lt: newArrival },
      arrivalDate: { $gt: newDeparture }
    });

    if (existingTrip) {
      return res.status(400).json({
        success: false,
        message: 'الباص محدد لرحلة في هذا التوقيت.',
        type: 'BUSY_BUS'
      });
    }

    // Log user information for debugging
    console.log('User creating trip:', {
      userId: req.user._id || req.user.id,
      userType: req.user.role,
      role: req.user.role,
      companyID: company.companyID
    });

    // Create trip with proper user references
    const tripData = {
      companyID: company.companyID,
      addedBy: req.user._id || req.user.id,
      addedByType: req.user.role === 'manager' ? 'Company' : 'Staff',
      busNumber,
      bus: bus._id,
      origin,
      destination,
      departureDate: new Date(departureDate),
      arrivalDate: new Date(arrivalDate),
      departureTime,
      arrivalTime,
      cost,
      availableSeats: bus.seats,
      totalSeats: bus.seats
    };

    console.log('Creating trip with data:', tripData);
    const trip = new Trip(tripData);

    await trip.save();

    return res.status(201).json({
      success: true,
      message: 'Trip added successfully',
      trip
    });
  } catch (error) {
    console.error('Error adding trip:', error);
    
    // Handle specific error cases
    if (error.message.includes('Bus is already assigned to another trip')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'departureTime',
        type: 'BUSY_BUS'
      });
    }
    
    // Handle other validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
        type: 'VALIDATION_ERROR'
      });
    }
    
    // Default error response
    res.status(500).json({
      success: false,
      message: 'Failed to add trip. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Edit trip
router.put('/Edit-trip/:id', auth, managerOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      busNumber,
      origin,
      destination,
      departureDate,
      arrivalDate,
      departureTime,
      arrivalTime,
      cost,
      status
    } = req.body;

    console.log('Edit trip request:', { id, busNumber, origin, destination, departureDate, arrivalDate, cost, status });
    console.log('User companyID:', req.user.companyID);

    // Find the trip and verify ownership
    const trip = await Trip.findOne({ _id: id, companyID: req.user.companyID });
    if (!trip) {
      console.log('Trip not found or access denied');
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to edit this trip'
      });
    }

    console.log('Found trip:', trip);

    // Get the bus details if busNumber is being updated
    let bus;
    if (busNumber && busNumber !== trip.busNumber) {
      console.log('Looking for bus with number:', busNumber, 'in company:', req.user.companyID);
      bus = await Bus.findOne({ busNumber, companyID: req.user.companyID });
      if (!bus) {
        console.log('Bus not found');
        return res.status(400).json({
          success: false,
          message: 'Bus not found in your company',
          field: 'busNumber'
        });
      }
      req.body.bus = bus._id; // Set the bus reference
      console.log('Found bus:', bus._id);
    } else {
      // If busNumber isn't being changed, use the existing bus
      bus = await Bus.findById(trip.bus);
      console.log('Using existing bus:', bus);
    }

    // Check for trip conflicts if bus, date, or time is being modified
    if (busNumber || departureDate || departureTime) {
      const conflictQuery = {
        _id: { $ne: id }, // Exclude current trip
        bus: bus._id,     // Same bus
        status: { $nin: ['cancelled', 'completed'] }, // Only check active/scheduled trips
        $or: [
          {
            departureDate: departureDate ? new Date(departureDate) : trip.departureDate,
            departureTime: departureTime || trip.departureTime
          },
          // Add more conditions if needed for overlapping time ranges
        ]
      };

      const existingTrip = await Trip.findOne(conflictQuery);
      
      if (existingTrip) {
        return res.status(400).json({
          success: false,
          message: 'Bus is already assigned to another trip at this date and time',
          field: 'departureTime',
          type: 'BUSY_BUS'
        });
      }
    }

    // Prevent changing certain fields if trip is in progress or completed
    if (trip.status === 'in-progress' || trip.status === 'completed') {
      const restrictedFields = ['busNumber', 'origin', 'destination', 'departureDate', 'arrivalDate'];
      for (const field of restrictedFields) {
        if (req.body[field] && req.body[field] !== trip[field]) {
          return res.status(400).json({
            success: false,
            message: `Cannot modify ${field} for a trip that is ${trip.status}`
          });
        }
      }
    }

    // Update the trip
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Trip updated successfully',
      trip: updatedTrip
    });

  } catch (error) {
    console.error('Error updating trip:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
        type: 'VALIDATION_ERROR'
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update trip. Please try again.'
      });
    }
    
    // Default error response
    return res.status(500).json({
      success: false,
      message: 'Failed to update trip. Please try again.',
      error: error.message
    });
  }
});

// Cancel trip and process refunds
router.put('/cancel-trip/:id', auth, managerOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || 'Trip cancelled by company';

    // Find the trip and verify ownership
    const trip = await Trip.findOne({ _id: id, companyID: req.user.companyID });
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to cancel this trip'
      });
    }

    // Prevent cancellation of in-progress or completed trips
    if (['in-progress', 'completed', 'cancelled'].includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a trip that is already ${trip.status}`
      });
    }

    // Find all bookings for this trip that aren't already cancelled
    const bookings = await Booking.find({ 
      tripID: id, 
      status: { $ne: 'cancelled' } 
    });

    // Process each booking
    for (const booking of bookings) {
      try {
        // Process online/credit card payments
        if ((booking.paymentMethod === 'credit_card' || booking.bookingType === 'online') && booking.paymentStatus === 'paid') {
          await processOnlineRefund(booking, trip, reason, req.user._id);
        } 
        // Process cash payments
        else if (booking.paymentMethod === 'cash') {
          await processCashRefund(booking, trip, reason, req.user._id);
        } 
        // For other payment methods or statuses, just mark as cancelled
        else {
          await updateBookingStatus(booking, {
            status: 'company-cancelled',
            cancellationReason: reason,
            cancelledAt: new Date(),
            cancelledBy: 'company'
          });
        }
      } catch (error) {
        console.error(`Error processing booking ${booking._id}:`, error);
        // Continue with other bookings even if one fails
        continue;
      }
    }

    // Update trip status to cancelled
    trip.status = 'cancelled';
    trip.cancellationReason = reason;
    trip.cancelledAt = new Date();
    trip.cancelledBy = req.user._id;
    await trip.save();

    res.json({
      success: true,
      message: 'Trip cancelled successfully',
      details: {
        totalBookings: bookings.length
      }
    });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel trip',
      error: error.message
    });
  }
});

// Revert cancelled trip back to scheduled
router.put('/revert-trip/:id', auth, managerOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the trip and verify ownership
    const trip = await Trip.findOne({ 
      _id: id, 
      companyID: req.user.companyID,
      status: 'cancelled'  // Only allow reverting cancelled trips
    });
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Cancelled trip not found or you do not have permission to modify this trip'
      });
    }

    // Check if the bus is available at the trip's scheduled time
    const conflict = await Trip.findOne({
      _id: { $ne: id },
      bus: trip.bus,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revert trip. The bus is already assigned to another scheduled or in-progress trip at this time.'
      });
    }

    // Update status back to 'scheduled'
    const updatedTrip = await Trip.findByIdAndUpdate(
      id, 
      { status: 'scheduled' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Trip reverted to scheduled status successfully',
      trip: updatedTrip
    });

  } catch (error) {
    console.error('Error reverting trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revert trip. Please try again.'
    });
  }
});



// Get trip details
router.get('/Get-trip/:id', auth, managerOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await Trip.findOne({
      _id: id,
      companyID: req.user.companyID
    }).populate('bus', 'busNumber seats');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or access denied'
      });
    }

    res.json({
      success: true,
      trip
    });

  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trip details'
    });
  }
});

// List all trips for company with filtering ///All-trips?status=cancelled&page=1&limit=10
router.get('/All-trips', auth, managerOrStaff, async (req, res) => {
  try {
    const { 
      status,           // Filter by status: 'scheduled', 'in-progress', 'completed', 'cancelled'
      startDate,        // Start date for date range filter
      endDate,          // End date for date range filter
      busNumber,        // Filter by bus number
      origin,           // Filter by origin
      destination,      // Filter by destination
      sortBy = 'departureDate',  // Default sort by departure date
      sortOrder = 'desc'         // Default sort order
    } = req.query;
    
    // Build the query
    const query = { companyID: req.user.companyID };
    
    // Status filter (can be single value or comma-separated list)
    if (status) {
      const statusList = status.split(',');
      query.status = statusList.length > 1 ? { $in: statusList } : statusList[0];
    }
    
    // Date range filter
    if (startDate && endDate) {
      query.departureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.departureDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.departureDate = { $lte: new Date(endDate) };
    }
    
    // Additional filters
    if (busNumber) query.busNumber = busNumber;
    if (origin) query.origin = new RegExp(origin, 'i'); // Case-insensitive search
    if (destination) query.destination = new RegExp(destination, 'i');
    
    // Build sort object
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      // Default sorting
      sort.departureDate = -1;
      sort.departureTime = -1;
    }
    
    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate('bus', 'busNumber')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Trip.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      count: trips.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      trips
    });
    
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Process refund for online/credit card payments
 */
async function processOnlineRefund(booking, trip, reason, userId) {
  try {
    // Find the payment record
    const payment = await Payment.findById(booking.paymentID);
    if (!payment) {
      throw new Error('Payment record not found');
    }

    // For credit card payments, update the card balance
    if (payment.paymentMethod === 'credit_card' && payment.creditCard) {
      const creditCard = await CreditCard.findById(payment.creditCard);
      if (creditCard) {
        // Refund the amount back to the card
        creditCard.balance = (creditCard.balance || 0) + (payment.amount || 0);
        await creditCard.save();
      }
    }

    // Update payment status to refunded
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundReason = reason;
    await payment.save();

    // Update booking status
    await updateBookingStatus(booking, {
      status: 'company-cancelled',
      paymentStatus: 'refunded',
      refundStatus: 'processed',
      refundProcessedAt: new Date(),
      refundProcessedBy: userId,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: 'company',
      refundNotes: `Refund of ${payment.amount} processed for cancelled trip ${trip.tripNumber}`
    });

    // Create notification for user
    if (booking.userEmail) {
      try {
        await Notification.create({
          user: booking.userEmail,
          title: 'Trip Cancelled - Refund Processed',
          message: `Your booking for trip ${trip.tripNumber} has been cancelled and a refund has been processed.`,
          type: 'trip_cancellation',
          relatedEntity: 'booking',
          relatedEntityId: booking._id,
          companyID: trip.companyID, // Add companyID from the trip
          isRead: false
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the whole refund if notification fails
      }
    }

  } catch (error) {
    console.error('Error processing online refund:', error);
    // Update booking with error status
    await updateBookingStatus(booking, {
      status: 'company-cancelled',
      refundStatus: 'failed',
      refundNotes: `Failed to process refund: ${error.message}`,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: 'company'
    });
    throw error; // Re-throw to be caught by the caller
  }
}

/**
 * Process refund for cash payments (mark for manual processing)
 */
async function processCashRefund(booking, trip, reason, userId) {
  try {
    // Mark booking for manual refund processing
    await updateBookingStatus(booking, {
      status: 'company-cancelled',
      refundStatus: 'pending',
      refundRequestedAt: new Date(),
      refundRequestedBy: userId,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: 'company',
      refundNotes: 'Cash refund requires manual processing'
    });

    // Create notification for staff
    await Notification.create({
      user: 'staff', // This will go to all staff members
      title: 'Manual Refund Required',
      message: `Booking #${booking.bookingNumber} requires manual refund processing for trip ${trip.tripNumber}.`,
      type: 'refund_required',
      relatedEntity: 'booking',
      relatedEntityId: booking._id,
      isRead: false
    });

  } catch (error) {
    console.error('Error processing cash refund:', error);
    // Update booking with error status
    await updateBookingStatus(booking, {
      status: 'company-cancelled',
      refundStatus: 'failed',
      refundNotes: `Error processing cash refund: ${error.message}`,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: 'company'
    });
    throw error; // Re-throw to be caught by the caller
  }
}

/**
 * Update booking status with the provided updates
 */
async function updateBookingStatus(booking, updates) {
  try {
    Object.assign(booking, updates);
    await booking.save();
  } catch (error) {
    console.error('Error updating booking status:', {
      bookingId: booking._id,
      error: error.message,
      updates
    });
    throw error;
  }
}

module.exports = router;