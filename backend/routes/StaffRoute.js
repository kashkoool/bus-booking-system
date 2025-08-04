const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/authMiddleware');
const { staffOnly } = require('../middleware/roleMiddleware');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Company = require('../models/Company');
const Staff = require('../models/Staff');

// Staff dashboard
router.get('/dashboard', auth, staffOnly, async (req, res) => {
  try {
    const staffId = req.user._id;
    const companyId = req.user.companyID;

    // Get staff profile
    const staffProfile = await Staff.findById(staffId)
      .select('username email phone gender age address staffType createdAt')
      .lean();

    // Get upcoming trips for the company
    const upcomingTrips = await Trip.find({
      companyID: companyId,
      departureDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'active'] }
    })
    .populate('bus', 'busNumber busType')
    .sort({ departureDate: 1 })
    .limit(5)
    .lean();

    // Get recent activity (recent bookings made by this staff)
    const recentActivity = await Booking.find({
      staffID: staffId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('tripID', 'origin destination departureDate')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Format recent activity
    const formattedActivity = recentActivity.map(booking => ({
      description: `تم إنشاء حجز لرحلة ${booking.tripID?.origin} - ${booking.tripID?.destination}`,
      date: booking.createdAt,
      type: 'booking',
      bookingId: booking._id
    }));

    res.json({
      success: true,
      data: {
        profile: staffProfile,
        upcomingTrips,
        recentActivity: formattedActivity
      }
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading staff dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Staff notifications endpoint
router.get('/notifications', auth, staffOnly, async (req, res) => {
  try {
    const staffId = req.user._id;
    const companyId = req.user.companyID;

    // Get notifications for staff (recent bookings, trip updates, etc.)
    const notifications = await Booking.find({
      staffID: staffId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('tripID', 'origin destination departureDate status')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    // Format notifications
    const formattedNotifications = notifications.map(booking => ({
      _id: booking._id,
      message: `تم إنشاء حجز جديد لرحلة ${booking.tripID?.origin} - ${booking.tripID?.destination}`,
      type: 'booking_created',
      isRead: false,
      createdAt: booking.createdAt,
      bookingId: booking._id,
      tripId: booking.tripID?._id,
      totalAmount: booking.totalAmount,
      passengers: booking.passengers
    }));

    res.json({
      success: true,
      notifications: formattedNotifications
    });
  } catch (error) {
    console.error('Staff notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Staff profile update endpoint
router.put('/profile', auth, staffOnly, async (req, res) => {
  try {
    const staffId = req.user._id;
    const { username, email, phone, address, age, gender } = req.body;

    // Find and update staff profile
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      {
        username,
        email,
        phone,
        address,
        age,
        gender
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Staff profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/staff/counter-booking
// @desc    Create a new booking at the counter (staff only)
// @access  Private (Staff)
router.post('/counter-booking', [auth, staffOnly,[
    check('tripID', 'Trip ID is required').notEmpty(),
    check('passengers', 'At least one passenger is required').isArray({ min: 1 }),
    check('passengers.*.firstName', 'First name is required').notEmpty(),
    check('passengers.*.lastName', 'Last name is required').notEmpty(),
    check('passengers.*.gender', 'Gender is required').isIn(['male', 'female']),
    check('passengers.*.phone', 'Valid phone number is required').matches(/^[0-9]{10,15}$/),

    check('userEmail', 'User email is required').optional().isEmail(),
    check('amountPaid', 'Amount paid is required').isNumeric().toFloat()
  ]

],
 async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // In development, we'll skip transactions since they require a replica set
  const isProduction = process.env.NODE_ENV === 'production';
  const session = isProduction ? await mongoose.startSession() : null;
  
  if (isProduction) {
    await session.startTransaction();
  }

  try {
    const { tripID, passengers, userEmail, amountPaid } = req.body;
    const staffMember = req.user;

    // Get trip and check availability
    const trip = await Trip.findById(tripID).session(session || null);
    if (!trip) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Check if trip is cancelled
    if (trip.status === 'cancelled') {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot book a cancelled trip',
        tripStatus: trip.status,
        cancellationReason: trip.cancellationReason
      });
    }

    if (trip.seatsAvailable < passengers.length || trip.status === 'cancelled') {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ 
        success: false, 
        message: `Only ${trip.seatsAvailable} seats available` 
      });
    }

    // Look up customer by email if provided, otherwise use staff's company
    let customer = null;
    if (userEmail) {
      customer = await Customer.findOne({ email: userEmail, role: 'customer' });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
    }

    // Ensure noOfSeats matches the number of passengers
    const noOfSeats = req.body.noOfSeats || passengers.length;
    if (noOfSeats !== passengers.length) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'Number of seats must match number of passengers'
      });
    }

    // Get available seats
    const availableSeats = await trip.getNextAvailableSeats(passengers.length);
    
    if (availableSeats.length < passengers.length) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: `Only ${availableSeats.length} seat(s) available, but ${passengers.length} requested`
      });
    }
    
    // Assign seat numbers to passengers
    const seatNumbers = availableSeats.slice(0, passengers.length);
    passengers.forEach((passenger, index) => {
      passenger.seatNumber = seatNumbers[index];
    });
    


    // Calculate total amount and validate amountPaid
    const totalAmount = trip.cost * passengers.length;
    const paidAmount = Number(req.body.amountPaid) || 0;
    
    if (paidAmount !== totalAmount) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: `Amount paid (${paidAmount} SYP) does not match the total cost (${totalAmount} SYP)`,
        expectedAmount: totalAmount
      });
    }

    // Create booking with assigned seats as a flat array
    const booking = new Booking({
      userEmail: customer ? customer.email : null,
      tripID: trip._id,
      passengers,
      noOfSeats,
      assignedSeats: seatNumbers,
      totalAmount,
      status: 'confirmed',
      bookingType: 'counter',
      staffID: staffMember._id,
      paymentStatus: 'paid'
    });

    // Save booking
    await booking.save({ session: session || undefined });

    // Create and process payment for all bookings
    const payment = new Payment({
      bookingID: booking._id,
      user: customer ? customer._id : null,  // Save user ID if available, otherwise null
      userEmail: customer ? customer.email : null,  // Save email if available, otherwise null
      amount: totalAmount,
      currency: 'SYP',
      status: 'completed',
      paymentMethod: 'cash',
      paymentDate: new Date()
    });
    
    await payment.save({ session: session || undefined });
    
    // Update booking with payment ID
    booking.paymentID = payment._id;
    await booking.save({ session: session || undefined });
    
    // Update trip's available seats
    trip.seatsAvailable -= passengers.length;
    await trip.save({ session: session || undefined });
    
    if (isProduction) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(201).json({
      success: true,
      message: 'Counter booking created successfully',
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        bookingType: booking.bookingType,
        totalAmount: booking.totalAmount,
        amountPaid: booking.amountPaid,
        changeDue: (amountPaid - totalAmount) > 0 ? (amountPaid - totalAmount) : 0,
        passengers: booking.passengers,
        trip: {
          id: trip._id,
          origin: trip.origin,
          destination: trip.destination,
          departureDate: trip.departureDate,
          departureTime: trip.departureTime
        },
        bookedBy: booking.bookedBy
      }
    });

  } catch (error) {
    if (isProduction) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Counter booking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing counter booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// @route   GET /api/staff/counter-refunds
// @desc    Get list of counter bookings that require refunds (company-cancelled)
// @access  Private (Staff)
router.get('/counter-refunds', [auth, staffOnly], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {
      status: 'company-cancelled',
      bookingType: 'counter',
      paymentStatus: 'paid',
      refundStatus: { $ne: 'refunded' } // Only show pending or unprocessed refunds
    };

    // Add search filter if provided
    if (req.query.search) {
      query.$or = [
        { 'passengers.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'passengers.lastName': { $regex: req.query.search, $options: 'i' } },
        { bookingNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    // Get paginated results
    const bookings = await Booking.find(query)
      .populate({
        path: 'tripID',
        select: 'origin destination departureDate departureTime tripNumber'
      })
      .populate({
        path: 'staffID',
        select: 'username email'
      })
      .sort({ cancelledAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch transactionId for each booking
    const bookingsWithTransactionId = await Promise.all(bookings.map(async (booking) => {
      let transactionId = null;
      let cancelledByUsername = null;
      if (booking.paymentID) {
        const payment = await Payment.findById(booking.paymentID).select('transactionId');
        if (payment) transactionId = payment.transactionId;
      }
      // Try to populate cancelledBy username
      let cancelledBy = booking.cancellation?.cancelledBy || null;
      if (cancelledBy) {
        const staff = await Staff.findById(cancelledBy).select('username');
        if (staff) cancelledByUsername = staff.username;
      }
      const obj = booking.toObject();
      return {
        ...obj,
        transactionId,
        refundStatus: obj.refundStatus || 'غير متوفر',
        cancelledAt: obj.cancelledAt || (obj.cancellation && obj.cancellation.cancelledAt) || null,
        cancellationReason: obj.cancellation?.reason || 'غير متوفر',
        cancelledBy: cancelledByUsername || cancelledBy || 'غير متوفر'
      };
    }));

    res.json({
      success: true,
      data: bookingsWithTransactionId,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching counter refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching counter refunds',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



/**
 * @route   GET /api/staff/show-counter-bookings
 * @desc    Get all counter bookings (cash payments) with pagination and search
 * @access  Private (Staff)
 * @query   {number} [page=1] - Page number (default: 1)
 * @query   {number} [limit=10] - Items per page (default: 10, max: 50)
 * @query   {string} [search] - Search by transaction ID or booking reference
 */
router.get('/show-counter-bookings', auth, staffOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build the query for counter bookings (cash payments)
    const query = {
      paymentMethod: 'cash',
      status: { $in: ['completed', 'pending'] }
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'bookingID.bookingReference': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await Payment.countDocuments(query);

    // Find counter bookings with pagination and populate booking details
    const payments = await Payment.find(query)
      .populate({
        path: 'bookingID',
        select: 'status bookingType noOfSeats totalAmount passengers bookingReference staffID',
        populate: [
          {
            path: 'tripID',
            select: 'origin destination departureDate arrivalDate bus',
            populate: {
              path: 'bus',
              select: 'busNumber busType',
              model: 'Bus'
            }
          },
          {
            path: 'staffID',
            select: 'username',
            model: 'Staff'
          }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedPayments = payments.map(payment => {
      const booking = payment.bookingID;
      if (!booking) return null;

      return {
        _id: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paymentDate,
        booking: {
          _id: booking._id,
          reference: booking.bookingReference,
          status: booking.status,
          bookingType: booking.bookingType,
          noOfSeats: booking.noOfSeats,
          totalAmount: booking.totalAmount,
          passengers: booking.passengers,
          trip: booking.tripID ? {
            origin: booking.tripID.origin,
            destination: booking.tripID.destination,
            departureDate: booking.tripID.departureDate,
            arrivalDate: booking.tripID.arrivalDate,
            bus: booking.tripID.bus
          } : null,
          addedBy: booking.staffID?.username || 'System'
        }
      };
    }).filter(Boolean); // Remove any null entries

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching counter bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching counter bookings',
      error: error.message
    });
  }
});



/**
 * @route   GET /api/staff/search-booking
 * @desc    Search for a booking by transaction ID (staff only)
 * @access  Private (Staff)
 */
router.get('/search-booking', auth, staffOnly, async (req, res) => {
 
  try {
    const { transactionId } = req.query;

    // Validate input
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // Find the payment by transaction ID
    const payment = await Payment.findOne({ 
      transactionId,
      status: { $in: ['completed', 'pending'] }
    }).populate('bookingID', 'status bookingType noOfSeats totalAmount passengers');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Find the booking associated with this payment
    const booking = await Booking.findById(payment.bookingID)
      .populate({
        path: 'tripID',
        select: 'origin destination departureDate arrivalDate bus',
        populate: {
          path: 'bus',
          select: 'busNumber busType',
          model: 'Bus'
        }
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Format the response
    const response = {
      success: true,
      booking: {
        _id: booking._id,
        status: booking.status,
        bookingType: booking.bookingType,
        noOfSeats: booking.noOfSeats,
        totalAmount: booking.totalAmount,
        passengers: booking.passengers,
        trip: {
          ...booking.tripID.toObject(),
          bus: booking.tripID.bus // Include the populated bus data
        },
        payment: {
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error searching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching booking',
      error: error.message
    });
  }
});



/**
 * @route   PUT /api/staff/bookings/:bookingId/cancel
 * @desc    Cancel a counter booking by booking ID
 * @access  Private (Staff)
 * @param   {string} bookingId - The ID of the booking to cancel
 */
router.put('/bookings/:bookingId/cancel', auth, staffOnly, async (req, res) => {
  // Use a variable to track if we should use transactions
  const useTransactions = process.env.NODE_ENV === 'production';
  const session = useTransactions ? await mongoose.startSession() : null;
  
  try {
    if (useTransactions) {
      await session.startTransaction();
    }
    
    const { bookingId } = req.params;
    const queryOptions = useTransactions ? { session } : {};

    // Find the booking by ID
    const booking = await Booking.findOne({
      _id: bookingId,
      bookingType: 'counter',
      status: { $in: ['confirmed', 'pending'] }
    }, null, queryOptions);

    if (!booking) {
      if (useTransactions) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        message: 'Active counter booking not found or already cancelled'
      });
    }

    // Find the payment for this booking
    const payment = await Payment.findOne({
      bookingID: booking._id,
      status: 'completed'
    }, null, queryOptions);

    if (!payment) {
      if (useTransactions) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        message: 'Payment not found for this booking'
      });
    }

    // Update booking status to cancelled
    const now = new Date();
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded'; // Update payment status to refunded
    booking.refundStatus = 'processed'; // Set refundStatus to processed
    booking.cancelledAt = now;
    booking.cancellation = {
      reason: 'Cancelled by staff',
      cancelledBy: req.user._id,
      cancelledAt: now
    };
    await booking.save(queryOptions);

    // Update payment status to refunded
    payment.status = 'refunded';
    payment.refundedAt = now;
    payment.refundReason = 'Booking cancelled';
    await payment.save(queryOptions);
    
    // Note: No need to manually update seatsAvailable as it's now dynamically calculated

    if (useTransactions) {
      await session.commitTransaction();
      session.endSession();
    }

    res.json({
      success: true,
      message: 'Booking and payment cancelled successfully',
      bookingId: booking._id,
      transactionId: payment.transactionId,
      refundAmount: payment.amount,
      currency: payment.currency
    });

  } catch (error) {
    if (useTransactions && session) {
      await session.abortTransaction();
      session.endSession();
    }
    
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * @route   GET /api/staff/trips/search
 * @desc    Search for trips within staff's company
 * @access  Private (Staff)
 * @query   {string} [origin] - Case-insensitive partial match for trip origin
 * @query   {string} [destination] - Case-insensitive partial match for trip destination
 * @query   {string} [date] - Date in YYYY-MM-DD format to filter trips by departure date
 * @query   {string} [status] - Filter by trip status (scheduled, in-progress, completed, cancelled)
 * @query   {number} [page=1] - Page number for pagination (default: 1)
 * @query   {number} [limit=10] - Number of results per page (default: 10, max: 50)
 */
router.get('/trips/search', auth, staffOnly, async (req, res) => {
  try {
    const {
      origin,
      destination,
      date,
      status,
      page = 1,
      limit = 10
    } = req.query;

    // Validate page and limit
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query for staff's company trips
    const query = { companyID: req.user.companyID };

    // Add filters if provided
    if (origin) query.origin = { $regex: origin, $options: 'i' };
    if (destination) query.destination = { $regex: destination, $options: 'i' };
    if (status) query.status = status;
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.departureDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    // Get total count for pagination
    const totalTrips = await Trip.countDocuments(query);
    const totalPages = Math.ceil(totalTrips / limitNum);

    // Get paginated trips with company details
    const trips = await Trip.find(query)
      .populate('bus', 'busNumber capacity')
      .sort({ departureDate: 1, departureTime: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: trips,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalTrips,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrevious: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error searching trips:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching trips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/staff/counter-refunds/:bookingId/confirm
 * @desc    Confirm refund for a company-cancelled counter booking
 * @access  Private (Staff)
 */
router.put('/counter-refunds/:bookingId/confirm', auth, staffOnly, async (req, res) => {
  try {
    const { bookingId } = req.params;
    // Find the booking
    const booking = await Booking.findOne({
      _id: bookingId,
      bookingType: 'counter',
      status: 'company-cancelled',
      paymentStatus: 'paid',
      refundStatus: { $ne: 'refunded' }
    });
    console.log('DEBUG: bookingId:', bookingId);
    console.log('DEBUG: booking found:', booking);
    if (!booking) {
      console.log('DEBUG: Booking not found or already refunded');
      return res.status(404).json({ success: false, message: 'الحجز غير موجود أو تم استرداده بالفعل' });
    }
    // Find the payment
    const payment = await Payment.findById(booking.paymentID);
    console.log('DEBUG: paymentID:', booking.paymentID);
    console.log('DEBUG: payment found:', payment);
    if (!payment) {
      console.log('DEBUG: Payment not found');
      return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    }
    // Update booking and payment
    booking.paymentStatus = 'refunded';
    booking.refundStatus = 'processed';
    booking.refundProcessedAt = new Date();
    await booking.save();
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();
    console.log('DEBUG: refund confirmed successfully');
    res.json({ success: true, message: 'تم تأكيد الاسترداد بنجاح', booking });
  } catch (error) {
    console.error('Error confirming refund:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تأكيد الاسترداد', error: error.message });
  }
});

module.exports = router;