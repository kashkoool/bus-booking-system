const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('../models/User');
const CreditCard = require('../models/CreditCard');

// Enable debug logging
mongoose.set('debug', true);
console.log('MongoDB URI:', process.env.MONGO_URI);

async function fixDefaultPayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find the user by ID
    const userId = '685187939f6641882b71224c'; // Your user ID
    console.log('Looking for user with ID:', userId);
    const user = await User.findById(userId).populate('creditCards defaultPaymentMethod');
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.error('User not found');
      return;
    }

    console.log('Found user:', user.email);

    // Find the credit card that should be default
    console.log('Looking for default credit card for user:', userId);
    const creditCard = await CreditCard.findOne({
      user: userId,
      isDefault: true
    });
    console.log('Default credit card found:', creditCard ? 'Yes' : 'No');

    if (!creditCard) {
      console.error('No default credit card found');
      return;
    }

    console.log('Found default credit card:', creditCard._id);

    // Update user's default payment method
    user.defaultPaymentMethod = creditCard._id;
    await user.save();

    console.log('Successfully updated default payment method');
    console.log('User after update:', {
      _id: user._id,
      email: user.email,
      defaultPaymentMethod: user.defaultPaymentMethod,
      creditCards: user.creditCards
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixDefaultPayment();
