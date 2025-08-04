const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const staffSchema = new mongoose.Schema({
  companyID: {
    type: Number,
    ref: 'Company',
    field: 'companyID',
    required: [true, 'Company ID is required'],
    validate: {
      validator: Number.isInteger,
      message: 'Company ID must be an integer'
    }
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  age: {
    type: Number,
    min: [18, 'Staff must be at least 18 years old'],
    max: [100, 'Age must be less than 100']
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female'],
      message: 'Gender must be either male or female'
    },
    required: [true, 'Gender is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [
      function() { return this.staffType !== 'driver'; },
      'Email is required for non-driver staff'
    ],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: [
      function() { return this.staffType !== 'driver'; },
      'Password is required for non-driver staff'
    ],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  role: {
    type: String,
    default: 'staff',
    enum: {
      values: ['staff', 'admin', 'manager'],
      message: 'Invalid role'
    }
  },
  staffType: {
    type: String,
    enum: {
      values: ['accountant', 'supervisor', 'employee', 'driver'],
      message: 'Invalid staff type'
    },
    required: [true, 'Staff type is required']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended'],
      message: 'Invalid status'
    },
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, { 
  timestamps: true,
  autoIndex: false // Disable automatic index creation
});

// Create indexes with explicit names to prevent conflicts
const createIndexes = async function() {
  try {
    await this.collection.createIndex(
      { username: 1 },
      {
        name: 'username_unique',
        unique: true
      }
    );
    
    await this.collection.createIndex(
      { phone: 1 },
      {
        name: 'phone_unique',
        unique: true
      }
    );
    
    await this.collection.createIndex(
      { email: 1 },
      {
        name: 'email_unique',
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } }
      }
    );
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Create indexes when the model is first initialized
// Add text index for search
staffSchema.index(
  { username: 'text', email: 'text', phone: 'text' },
  { name: 'staff_search_index' }
);

staffSchema.statics.ensureIndexes = createIndexes;

// Hash password before saving
staffSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.staffType === 'driver') return next();
  
  try {
    // Check if password is already hashed (bcrypt hashes start with $2b$)
    if (this.password && this.password.startsWith('$2b$')) {
      console.log('Password already hashed, skipping re-hash');
      return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
staffSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.staffType === 'driver') return false;
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to safely reset password
staffSchema.methods.resetPassword = async function(newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return this.constructor.findByIdAndUpdate(
    this._id,
    { password: hashedPassword },
    { new: true, runValidators: false }
  );
};

// Method to get staff member's full name
staffSchema.methods.getFullName = function() {
  return this.username; // In case we add firstName and lastName later
};

// Static method to find staff by email
staffSchema.statics.findByEmail = async function(email) {
  return this.findOne({ email });
};

// Static method to find active staff by company
staffSchema.statics.findActiveByCompany = function(companyId) {
  return this.find({ 
    companyID: companyId,
    isActive: true,
    status: 'active'
  }).select('-password');
};

// Static method to safely update password (bypasses pre-save hook)
staffSchema.statics.updatePassword = async function(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return this.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true, runValidators: false }
  );
};

// Virtual for staff member's full profile URL
staffSchema.virtual('profileUrl').get(function() {
  return `/api/staff/${this._id}/profile`;
});

// Index for text search
staffSchema.index(
  { username: 'text', email: 'text', phone: 'text' },
  { name: 'staff_search_index' }
);

// Compound index for company and status
staffSchema.index({ companyID: 1, status: 1 });

// Index for case-insensitive email search
staffSchema.index({ email: 1 }, { collation: { locale: 'en', strength: 2 } });

const Staff = mongoose.model("Staff", staffSchema);

// Create indexes in the background when the application starts
if (process.env.NODE_ENV !== 'test') {
  Staff.createIndexes().catch(console.error);
}

module.exports = Staff;