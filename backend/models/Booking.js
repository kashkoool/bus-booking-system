const mongoose = require('mongoose');
const Staff = require('./Staff');
const Payment = require('./Payment');
const { Customer } = require('./Customer');
const { Trip } = require('./Trip');

// Passenger subdocument schema
const passengerSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be longer than 50 characters']
  },
  lastName: { 
    type: String, 
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be longer than 50 characters']
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female'],
      message: 'Gender must be either male, female'
    },
    required: [true, 'Gender is required']
  },
  phone: {
    type: String,
    required: [false, 'Phone number is required'],
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  seatNumber: { 
    type: Number, 
    required: [true, 'Seat number is required'],
    min: [1, 'Seat number must be at least 1']
  }
}, { _id: false });

// Main booking schema
const bookingSchema = new mongoose.Schema({
  // User's email who made the booking (optional for counter bookings)
  userEmail: {
    type: String,
    ref: 'Customer',
    trim: true,
    lowercase: true,
    default: null,
    validate: {
      validator: function(v) {
        // Allow null or valid email
        return v === null || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Please use a valid email address or leave empty'
    },
    index: true
  },
  
  // Reference to the trip being booked
  tripID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trip', 
    required: [true, 'Trip ID is required'],
    index: true
  },
  
  // Booking details
  passengers: {
    type: [passengerSchema],
    required: [true, 'At least one passenger is required'],
    validate: {
      validator: function(passengers) {
        return passengers && passengers.length > 0;
      },
      message: 'At least one passenger is required'
    }
  },
  
  noOfSeats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'At least one seat must be booked'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v) && v > 0;
      },
      message: 'Number of seats must be a positive integer'
    }
  },
  
  assignedSeats: {
    type: [Number],
    required: [true, 'Assigned seats are required'],
    validate: {
      validator: function(seats) {
        return seats.length === this.noOfSeats;
      },
      message: 'Number of assigned seats must match number of seats in booking'
    }
  },
  
  
  
  // Status tracking
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled', 'completed','company-cancelled'],
      message: 'Invalid booking status'
    },
    default: 'confirmed',
    index: true
  },
  
  // Booking type (online or counter)
  bookingType: {
    type: String,
    enum: {
      values: ['online', 'counter'],
      message: 'Invalid booking type'
    },
    default: 'online'
  },
  
  // Reference to the staff who made the booking (if any)
  staffID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  
  // Reference number for counter bookings
  // bookingReference: {
  //   type: String,
  //   unique: true,
  //   sparse: true,
  //   index: true
  // },
  
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  totalAmount: {
    type: Number,
    min: 0,
    required: true
  },
    // Refund fields
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed', null],
      default: null
    },
    refundRequestedAt: Date,
    refundProcessedAt: Date,
    refundProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundNotes: String,
    refundPaymentMethod: String,
    refundReference: String
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strict: 'throw',
  strictQuery: false
});




// Pre-save middleware to set booking type and validate user email
bookingSchema.pre('save', async function(next) {
  // Normalize email if provided
  if (this.userEmail) {
    this.userEmail = this.userEmail.toLowerCase().trim();
  }
  try {
    // If booking type is already set, don't change it
    if (this.isModified('bookingType') && this.bookingType) {
      return next();
    }

    // If staffID is provided, it's a counter booking
    if (this.staffID) {
      this.bookingType = 'counter';
      // Verify the staff exists
      const staff = await Staff.findById(this.staffID);
      if (!staff) {
        throw new Error('Invalid staff ID provided');
      }
    } else {
      // If no staffID, it's an online booking
      this.bookingType = 'online';
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method to process payment for a booking
bookingSchema.methods.processPayment = async function(paymentMethod, cardDetails = {}) {
  // Ensure user email is set and valid
  if (!this.userEmail || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(this.userEmail)) {
    throw new Error('Valid user email is required for payment processing');
  }
  try {
    // Create a new payment record
    const payment = new Payment({
      bookingID: this._id,
      userEmail: this.userEmail,
      amount: this.totalAmount,
      paymentMethod: paymentMethod,
      status: 'pending',
      ...(paymentMethod.includes('card') && {
        cardLast4: cardDetails.last4 || '4242', // Default test value
        cardBrand: cardDetails.brand || 'visa' // Default test value
      })
    });

    // Simulate payment processing
    const paymentResult = await Payment.processPayment({
      amount: this.totalAmount,
      paymentMethod,
      ...cardDetails
    });

    // Update payment status
    payment.status = paymentResult.success ? 'completed' : 'failed';
    payment.transactionId = paymentResult.transactionId;
    payment.userEmail = this.userEmail; // Ensure email is set
    await payment.save();

    // Update booking status
    this.paymentStatus = payment.status;
    this.paymentID = payment._id;
    await this.save();

    return {
      success: paymentResult.success,
      paymentId: payment._id,
      transactionId: payment.transactionId,
      status: payment.status,
      amount: this.totalAmount
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new Error('Payment processing failed');
  }
};

// Virtual for checking if booking is paid
bookingSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'paid';
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;