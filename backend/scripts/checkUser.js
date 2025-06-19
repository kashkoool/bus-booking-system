const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Successfully connected to MongoDB');
    
    // Get the user collection
    const user = await mongoose.connection.db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId('685187939f6641882b71224c')
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:');
    console.log('Email:', user.email);
    console.log('Default Payment Method:', user.defaultPaymentMethod);
    console.log('Credit Cards:', user.creditCards);
    
    // Get credit cards
    if (user.creditCards && user.creditCards.length > 0) {
      const cards = await mongoose.connection.db.collection('creditcards').find({
        _id: { $in: user.creditCards }
      }).toArray();
      
      console.log('Credit Cards Details:');
      cards.forEach(card => {
        console.log(`- ID: ${card._id}`);
        console.log(`  isDefault: ${card.isDefault}`);
        console.log(`  Last 4: ${card.cardNumberLast4}`);
        console.log(`  Balance: ${card.balance}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkUser();
