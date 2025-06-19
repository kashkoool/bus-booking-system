const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const staffSchema = new mongoose.Schema({
  companyID: {
    type: Number,
    ref: 'Company',
    field: 'companyID',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  age: Number,
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: function() {
      return this.staffType !== 'driver';
    }
  },
  password: {
    type: String,
    required: function() {
      return this.staffType !== 'driver'; 
    },
    select: false
  },
  address: String,
  role: {
    type: String,
    default: 'staff',
  },
  staffType: {
    type: String,
    enum: ['accountant', 'supervisor', 'employee', 'driver'],
    required: true
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
staffSchema.statics.ensureIndexes = createIndexes;

staffSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const Staff = mongoose.model("Staff", staffSchema);

// Create indexes in the background when the application starts
if (process.env.NODE_ENV !== 'test') {
  Staff.createIndexes().catch(console.error);
}

module.exports = Staff;