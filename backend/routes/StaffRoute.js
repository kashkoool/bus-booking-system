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

// Staff dashboard
router.get('/dashboard', auth, staffOnly, (req, res) => {
  res.json({
    message: 'Staff Dashboard',
    user: req.user,
    company: req.user.companyID
  });
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
], async (req, res) => {
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
    let customer = staffMember; // Default to staff member
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
      userEmail: user ? user.email : null,
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
      user: user ? user._id : null,  // Save user ID if available, otherwise null
      userEmail: user ? user.email : null,  // Save email if available, otherwise null
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

    res.json({
      success: true,
      data: bookings,
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
        paidAt: payment.paidAt,
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
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: 'Cancelled by staff',
      cancelledBy: req.user._id,
      cancelledAt: new Date()
    };
    await booking.save(queryOptions);

    // Update payment status to refunded
    payment.status = 'refunded';
    payment.refundedAt = new Date();
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





module.exports = router;