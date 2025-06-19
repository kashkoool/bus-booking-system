const mongoose = require('mongoose');

// Add indexes for better query performance
const tripSchema = new mongoose.Schema({
  companyID: {
    type: Number,
    ref: 'Company',
    field: 'companyID',
    required: true,
    index: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'addedByType',
    required: true
  },
  addedByType: {
    type: String,
    enum: ['Company', 'Staff'],
    required: false
  },
  busNumber: {
    type: String,
    required: true,
    index: true
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    index: true
  },
  origin: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  departureDate: {
    type: Date,
    required: true,
    index: true
  },
  arrivalDate: {
    type: Date,
    required: true
  },
  departureTime: {
    type: String,
    index: true
  },
  arrivalTime: String,
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  seatsAvailable: {
    type: Number,
    min: 0
  },
  seats: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  ratings: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    required: false
  }
}, { 
  timestamps: true,
  // Add compound index for common queries
  autoIndex: process.env.NODE_ENV !== 'production' // Auto-index in development only
});

// Add compound index for bus availability checks
tripSchema.index({ 
  bus: 1, 
  departureDate: 1, 
  departureTime: 1,
  status: 1 
});

// Optimized pre-save middleware
tripSchema.pre('save', async function(next) {
  // Only run if bus is modified and it's a new document or bus field changed
  if (this.isNew || this.isModified('bus')) {
    try {
      const bus = await mongoose.model('Bus').findById(this.bus).select('seats').lean();
      if (bus) {
        this.seats = bus.seats;
        this.seatsAvailable = bus.seats;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Optimized post-save middleware
tripSchema.post('save', async function(doc) {
  if (doc.isModified('bus')) {
    try {
      const [bus, bookingData] = await Promise.all([
        mongoose.model('Bus').findById(doc.bus).select('seats').lean(),
        mongoose.model('Booking').aggregate([
          { 
            $match: { 
              tripID: doc._id, 
              status: { $ne: 'cancelled' } 
            } 
          },
          { 
            $group: { 
              _id: null, 
              total: { $sum: "$totalSeats" } 
            } 
          }
        ])
      ]);

      if (bus) {
        const totalBooked = bookingData[0]?.total || 0;
        await doc.constructor.findByIdAndUpdate(
          doc._id, 
          { $set: { seatsAvailable: bus.seats - totalBooked } }
        );
      }
    } catch (error) {
      console.error('Error in post-save hook:', error);
    }
  }
});

// Get next available seats
tripSchema.methods.getNextAvailableSeats = async function(count) {
  const bookedSeats = await this.constructor.aggregate([
    { 
      $match: { 
        _id: this._id 
      } 
    },
    {
      $lookup: {
        from: 'bookings',
        let: { tripId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tripID', '$$tripId'] },
                  { $ne: ['$status', 'cancelled'] }
                ]
              }
            }
          },
          { $unwind: '$assignedSeats' },
          { $group: { _id: null, seats: { $addToSet: '$assignedSeats' } } }
        ],
        as: 'bookedSeats'
      }
    },
    { $unwind: { path: '$bookedSeats', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, bookedSeats: '$bookedSeats.seats' } }
  ]);

  const takenSeats = new Set(bookedSeats[0]?.bookedSeats || []);
  const availableSeats = [];
  
  // Find first available seats
  for (let i = 1; i <= this.seats && availableSeats.length < count; i++) {
    if (!takenSeats.has(i)) {
      availableSeats.push(i);
    }
  }

  return availableSeats;
};

// Check if seats are available
tripSchema.methods.areSeatsAvailable = async function(seatNumbers) {
  const availableSeats = await this.getNextAvailableSeats(this.seats);
  const availableSeatsSet = new Set(availableSeats);
  
  return seatNumbers.every(seat => availableSeatsSet.has(seat));
};

// Optimized availability check
tripSchema.methods.checkAvailability = async function(seatsRequested) {
  const availableSeats = await this.getNextAvailableSeats(this.seats);
  return availableSeats.length >= seatsRequested;
};

// Validation middleware
tripSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('addedBy') || this.isModified('bus') || 
      this.isModified('departureDate') || this.isModified('departureTime')) {
    try {
      const [Staff, Company, Trip] = [
        mongoose.model('Staff'),
        mongoose.model('Company'),
        mongoose.model('Trip')
      ];

      // Validate addedBy
      let addedByDoc;
      if (this.addedByType === 'Company') {
        addedByDoc = await Company.findById(this.addedBy).select('role').lean();
        if (!addedByDoc || addedByDoc.role !== 'manager') {
          throw new Error('Company record must be a manager');
        }
      } else if (this.addedByType === 'Staff') {
        addedByDoc = await Staff.findById(this.addedBy).select('companyID').lean();
        if (!addedByDoc || String(addedByDoc.companyID) !== String(this.companyID)) {
          throw new Error('Staff does not belong to this company');
        }
      }

      if (!addedByDoc) {
        throw new Error('Added by user not found');
      }

      // Check for trip conflicts
      if (this.isNew || this.isModified('bus') || this.isModified('departureDate') || 
          this.isModified('departureTime')) {
        const existingTrip = await Trip.findOne({
          _id: { $ne: this._id },
          bus: this.bus,
          status: { $ne: 'cancelled' },
          $or: [
            { 
              departureDate: this.departureDate,
              departureTime: this.departureTime
            },
            // Add other conflict conditions if needed
          ]
        }).lean();

        if (existingTrip) {
          throw new Error('Bus is already assigned to another trip at this date and time');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Trip = mongoose.model('Trip', tripSchema);
module.exports = Trip;