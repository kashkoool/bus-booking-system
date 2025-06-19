const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const companySchema = new mongoose.Schema({
  companyID: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  logo: { // edit this field later
    type: String,
    default: null,
    required: false
  },

  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'manager',
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, { timestamps: true });

companySchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

companySchema.virtual('id', {
  ref: 'Notification',
  localField: 'companyID',
  foreignField: 'companyID',
  justOne: false
});

const Company = mongoose.model("Company", companySchema);
module.exports = Company;