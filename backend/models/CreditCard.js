const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Generate a fixed 32-byte key for AES-256-CBC
const getEncryptionKey = () => {
  // Use environment variable or fallback to a fixed key (for development only)
  const key = process.env.CARD_ENCRYPTION_KEY || 'default-key-32-characters-long-12345';
  // Use SHA-256 to derive a 32-byte key
  return crypto.createHash('sha256').update(key).digest();
};

const creditCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  cardNumber: {
    type: String,
    required: true,
    // This will store the last 4 digits for display
    get: (cardNumber) => `•••• •••• •••• ${cardNumber.slice(-4)}`
  },
  cardNumberLast4: {
    type: String,
    required: true
  },
  cardHolderName: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  expiryMonth: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const month = parseInt(v, 10);
        return month >= 1 && month <= 12;
      },
      message: 'Expiry month must be between 01 and 12'
    }
  },
  expiryYear: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const year = parseInt(v, 10);
        const currentYear = new Date().getFullYear() % 100;
        const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
        return year >= currentYear && year <= (currentYear + 20);
      },
      message: 'Expiry year must be valid and not more than 20 years in the future'
    }
  },
  cvv: {
    type: String,
    required: true,
    select: false // Never return CVV in queries
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  // For encryption
  iv: {
    type: String,
    required: true
  },
  // Card brand (visa, mastercard, etc.)
  brand: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
    required: true
  },
  // Token for payment processing (if needed)
  paymentToken: {
    type: String,
    select: false
  },
  // Available balance on the card (in SYP)
  balance: {
    type: Number,
    default: 1000000,
    min: [0, 'Balance cannot be negative'],
    required: true 
  },
  cardNumberHash: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper function to hash card number consistently
function hashCardNumber(cardNumber) {
  if (!cardNumber) return null;
  try {
    // Ensure we have a string and remove all non-digit characters
    const cleanNumber = cardNumber.toString().replace(/\D/g, '');
    if (!cleanNumber) {
      console.error('No digits found in card number');
      return null;
    }
    
    // Use a consistent salt from environment or fallback
    const salt = process.env.CARD_HASH_SALT || 'default-salt';
    
    // Create a consistent hash of the cleaned card number with salt
    const hash = crypto
      .createHash('sha256')
      .update(cleanNumber + salt)
      .digest('hex');
    
    console.log(`Hashed card number: ${cleanNumber} -> ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error hashing card number:', error);
    return null;
  }
}

// Pre-save hook to handle card number hashing, encryption, and duplicate checking
creditCardSchema.pre('save', async function(next) {
  // Skip if card number is not modified and this is not a new document
  if (!this.isModified('cardNumber') && !this.isNew) {
    console.log('Skipping pre-save hook: card number not modified');
    return next();
  }

  const session = this.$session();
  
  try {
    console.log('Starting pre-save hook for card:', {
      isNew: this.isNew,
      userId: this.user,
      cardLast4: this.cardNumber ? this.cardNumber.toString().slice(-4) : 'none',
      modifiedFields: this.modifiedPaths()
    });

    // Clean and hash the card number
    const cleanNumber = this.cardNumber.toString().replace(/\D/g, '');
    if (!cleanNumber) {
      const error = new Error('Invalid card number');
      error.code = 'INVALID_CARD_NUMBER';
      return next(error);
    }
    
    // Store last 4 digits for display
    this.cardNumberLast4 = cleanNumber.slice(-4);
    
    // Create consistent hash of the cleaned card number
    this.cardNumberHash = hashCardNumber(cleanNumber);
    
    // Check for duplicate card for this user
    const query = {
      user: this.user,
      cardNumberHash: this.cardNumberHash,
      _id: { $ne: this._id } // Exclude current document when updating
    };
    
    console.log('Checking for duplicate card with query:', JSON.stringify(query));
    
    const existingCard = await this.constructor
      .findOne(query)
      .session(session || null) // Use the same session if in transaction
      .select('_id cardNumberLast4 brand expiryMonth expiryYear')
      .lean();

    if (existingCard) {
      console.error('Duplicate card detected:', {
        existingCardId: existingCard._id,
        last4: existingCard.cardNumberLast4,
        brand: existingCard.brand,
        expiry: `${existingCard.expiryMonth}/${existingCard.expiryYear}`
      });
      
      const error = new Error('This card is already saved to your account');
      error.code = 'DUPLICATE_CARD';
      error.existingCard = existingCard;
      return next(error);
    }

    // Encrypt the card number
    console.log('Encrypting card data...');
    const iv = crypto.randomBytes(16).toString('hex');
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      getEncryptionKey(),
      Buffer.from(iv, 'hex')
    );
    
    let encrypted = cipher.update(cleanNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    this.cardNumber = encrypted;
    this.iv = iv;
    
    // Encrypt CVV if modified
    if (this.isModified('cvv') && this.cvv) {
      const cvvIv = crypto.randomBytes(16).toString('hex');
      const cvvCipher = crypto.createCipheriv(
        'aes-256-cbc',
        getEncryptionKey(),
        Buffer.from(cvvIv, 'hex')
      );
      
      let encryptedCvv = cvvCipher.update(this.cvv, 'utf8', 'hex');
      encryptedCvv += cvvCipher.final('hex');
      
      this.cvv = encryptedCvv;
      this.cvvIv = cvvIv;
    }
    
    // Handle default card setting
    if (this.isDefault) {
      console.log('Setting as default card');
      await this.constructor.updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isDefault: false } },
        { session: session || null }
      );
    } else if (this.isNew) {
      // If this is the first card for the user, set it as default
      const cardCount = await this.constructor
        .countDocuments({ user: this.user })
        .session(session || null);
        
      this.isDefault = cardCount === 0;
      console.log(`Card is ${this.isDefault ? 'set as default' : 'not default'}. Total cards: ${cardCount + 1}`);
    }

    console.log('Pre-save hook completed successfully');
    next();
  } catch (error) {
    console.error('Error in credit card pre-save hook:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      existingCard: error.existingCard
    });
    next(error);
  }
});

// Method to decrypt card data (only when needed)
creditCardSchema.methods.decryptCard = function() {
  try {
    const decryptData = (encryptedData) => {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        getEncryptionKey(),
        Buffer.from(this.iv, 'hex')
      );
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'hex')),
        decipher.final()
      ]).toString('utf8');
    };

    const decryptedNumber = decryptData(this.cardNumber);
    const decryptedCVV = decryptData(this.cvv);

    return {
      ...this.toObject(),
      cardNumber: decryptedNumber,
      cvv: decryptedCVV
    };
  } catch (error) {
    throw new Error('Failed to decrypt card data');
  }
};

// Virtual for formatted expiry date
creditCardSchema.virtual('expiryDate').get(function() {
  return `${this.expiryMonth.padStart(2, '0')}/${this.expiryYear.slice(-2)}`;
});

// Method to check if card is expired
creditCardSchema.methods.isExpired = function() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 0-11 -> 1-12
  const currentYear = now.getFullYear() % 100;
  const cardMonth = parseInt(this.expiryMonth, 10);
  const cardYear = parseInt(this.expiryYear, 10);
  
  return (cardYear < currentYear) || 
         (cardYear === currentYear && cardMonth < currentMonth);
};


// Create a compound index to ensure unique last 4 digits per user
// This prevents users from adding the same card multiple times
creditCardSchema.index(
  { user: 1, cardNumberLast4: 1 },
  { 
    unique: true,
    name: 'unique_last4_per_user',
    partialFilterExpression: { cardNumberLast4: { $exists: true } }
  }
);
// The actual index should be created using:
// db.creditcards.createIndex(
//   { user: 1, cardNumberHash: 1 },
//   { 
//     unique: true,
//     name: 'unique_card_per_user',
//     partialFilterExpression: { cardNumberHash: { $exists: true } }
//   }
// )
console.log('CreditCard model loaded - make sure unique index is created in MongoDB');

// Create indexes
creditCardSchema.index(
  { user: 1, cardNumberHash: 1 },
  { 
    unique: true,
    partialFilterExpression: { cardNumberHash: { $exists: true } },
    name: 'unique_card_per_user'
  }
);

// Pre-save hook to ensure cardNumberHash is always set
creditCardSchema.pre('save', function(next) {
  if (this.isModified('cardNumber') && this.cardNumber) {
    this.cardNumberHash = hashCardNumber(this.cardNumber);
  }
  next();
});

// Create the model
const CreditCard = mongoose.model('CreditCard', creditCardSchema);

// Add error handling for duplicate key error
CreditCard.on('index', function(error) {
  if (error) {
    console.error('Error creating indexes for CreditCard model:', error);
  } else {
    console.log('CreditCard indexes created successfully');
  }
});

module.exports = CreditCard;

// secure key derivation function using SHA-256