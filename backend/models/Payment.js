const mongoose = require('mongoose');
const CreditCard = require('./CreditCard');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema({
  // Reference to the booking this payment is for
  bookingID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  
  // Reference to the customer who made the payment (optional for guest checkouts)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
    default: null
  },
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
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SYP',
    uppercase: true,
    enum: ['USD', 'EUR', 'SYP']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // Payment method details
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'cash'],
    required: true,
    default: 'credit_card'
  },
  
  // Reference to the credit card (required when paymentMethod is 'credit_card')
  creditCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditCard',
    default: null,
    // Only required if paymentMethod is 'credit_card'
    required: function() { return this.paymentMethod === 'credit_card'; }
  },
  
  // Card details (populated from credit card for reference)
  cardDetails: {
    brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
      default: null
    },
    last4: {
      type: String,
      default: null
    }
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  // Billing information
  billingDetails: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strict: 'throw'
});

// Generate a secure transaction ID and set payment date
paymentSchema.pre('save', async function(next) {
  // Generate a transaction ID if not provided
  if (!this.transactionId) {
    this.transactionId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  // Set payment date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.paymentDate) {
    this.paymentDate = new Date();
  }
  
  // For credit card payments, verify the card belongs to the user
  if (this.paymentMethod === 'credit_card' && this.creditCard && this.user) {
    try {
      const card = await CreditCard.findOne({ _id: this.creditCard, user: this.user });
      if (!card) {
        throw new Error('Credit card not found or does not belong to user');
      }
      
      // Verify card is not expired
      if (card.isExpired()) {
        throw new Error('Credit card has expired');
      }
      
      // Store card details for reference
      this.cardDetails = {
        brand: card.brand,
        last4: card.cardNumberLast4
      };
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Virtual for payment status
paymentSchema.virtual('isPaid').get(function() {
  return this.status === 'completed';
});

// Virtual to check if payment requires a credit card
paymentSchema.virtual('requiresCreditCard').get(function() {
  return this.paymentMethod === 'credit_card';
});

// Virtual for refund status
paymentSchema.virtual('canRefund').get(function() {
  return this.status === 'completed' && !this.isRefunded;
});

// Virtual for partial refunds
paymentSchema.virtual('isPartiallyRefunded').get(function() {
  return this.status === 'refunded' && this.amount > this.refundedAmount;
});

// Virtual for refunded amount
paymentSchema.virtual('refundedAmount').get(function() {
  if (!this.refunds || this.refunds.length === 0) return 0;
  return this.refunds
    .filter(refund => refund.status === 'completed')
    .reduce((total, refund) => total + refund.amount, 0);
});

/**
 * Process a payment with a credit card
 * @param {Object} options - Payment options
 * @param {String} options.cardId - ID of the credit card
 * @param {Object} options.metadata - Additional metadata for the payment
 * @returns {Promise<Object>} Payment result
 */
paymentSchema.methods.processWithCreditCard = async function({ cardId, metadata = {} }) {
  try {
    // Find the credit card
    const card = await CreditCard.findOne({
      _id: cardId,
      user: this.user
    });
    
    if (!card) {
      throw new Error('Credit card not found');
    }
    
    if (card.isExpired()) {
      throw new Error('Credit card has expired');
    }
    
    // Update payment details
    this.paymentMethod = 'credit_card';
    this.creditCard = card._id;
    this.cardDetails = {
      brand: card.brand,
      last4: card.cardNumberLast4
    };
    
    // In a real app, this would integrate with a payment processor
    // For demo, we'll simulate a successful payment after a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 95% success rate for demo purposes
    const isSuccess = Math.random() < 0.95;
    
    if (isSuccess) {
      this.status = 'completed';
      this.error = null;
    } else {
      this.status = 'failed';
      this.error = {
        code: 'card_declined',
        message: 'Your card was declined',
        decline_code: 'generic_decline'
      };
    }
    
    await this.save();
    
    return {
      success: isSuccess,
      payment: this,
      error: this.error
    };
    
  } catch (error) {
    this.status = 'failed';
    this.error = {
      message: error.message,
      code: 'processing_error'
    };
    await this.save();
    
    return {
      success: false,
      error: error.message,
      payment: this
    };
  }
};

/**
 * Process a refund for this payment
 * @param {Number} amount - Amount to refund (optional, defaults to full amount)
 * @param {String} reason - Reason for the refund
 * @returns {Promise<Object>} Refund result
 */
paymentSchema.methods.processRefund = async function(amount, reason = '') {
  try {
    if (this.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }
    
    const refundAmount = amount || (this.amount - this.refundedAmount);
    
    if (refundAmount <= 0) {
      throw new Error('No amount available for refund');
    }
    
    if (refundAmount > (this.amount - this.refundedAmount)) {
      throw new Error('Refund amount exceeds available balance');
    }
    
    // In a real app, this would integrate with a payment processor
    // For demo, we'll simulate a successful refund after a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create refund record
    const refund = {
      amount: refundAmount,
      reason,
      processedAt: new Date(),
      status: 'completed',
      transactionId: `re_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    };
    
    // Add to refunds array
    if (!this.refunds) {
      this.refunds = [];
    }
    this.refunds.push(refund);
    
    // Update payment status
    if (refundAmount >= (this.amount - this.refundedAmount)) {
      this.status = 'refunded';
    }
    
    await this.save();
    
    return {
      success: true,
      refund,
      payment: this,
      message: 'Refund processed successfully'
    };
    
  } catch (error) {
    console.error('Refund processing error:', error);
    
    // Record failed refund attempt
    if (!this.refunds) this.refunds = [];
    this.refunds.push({
      amount: amount || 0,
      reason,
      processedAt: new Date(),
      status: 'failed',
      error: error.message
    });
    
    await this.save();
    
    return {
      success: false,
      error: error.message,
      payment: this
    };
  }
};

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
