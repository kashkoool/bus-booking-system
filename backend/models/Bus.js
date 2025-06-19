const mongoose = require('mongoose');


const busSchema = new mongoose.Schema({
  companyID: {
    type: Number,
    ref: 'Company',
    field: 'companyID',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  busNumber: {
    type: String,
    required: true,
    unique: true
  },

  seats: {
    type: Number,
    required: true,
    min: 1
  },
  busType: {
    type: String,
    enum: ['standard', 'premium', 'luxury', 'sleeper'],
    required: true
  },
  model: String,
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',  
    required: false  
  }
}, { timestamps: true });

const Bus = mongoose.model("Bus", busSchema);
module.exports = Bus;