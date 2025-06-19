const mongoose = require('mongoose');
require('dotenv').config();

async function updateDefaultPayment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Successfully connected to MongoDB');
    
    const userId = '685187939f6641882b71224c';
    const cardId = '685194239ee61c8c50477fa0';
    
    // Update the user's default payment method
    const result = await mongoose.connection.db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { defaultPaymentMethod: new mongoose.Types.ObjectId(cardId) } }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const updatedUser = await mongoose.connection.db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(userId)
    });
    
    console.log('Updated user:');
    console.log('Email:', updatedUser.email);
    console.log('Default Payment Method:', updatedUser.defaultPaymentMethod);
    
    console.log('Default payment method updated successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateDefaultPayment();
