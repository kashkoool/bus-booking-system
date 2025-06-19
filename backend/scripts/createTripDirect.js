const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function createTrip() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const tripsCollection = db.collection('trips');

    const tripData = {
      companyID: 1001,
      addedBy: new MongoClient(uri).startSession().client.topology.s.id('685139bc11a6086233038a7a'),
      addedByType: 'Company',
      busNumber: '1001-1',
      bus: new MongoClient(uri).startSession().client.topology.s.id('685139bc11a6086233038a84'),
      origin: 'دمشق',
      destination: 'حلب',
      departureDate: new Date('2025-06-20T08:00:00.000Z'),
      arrivalDate: new Date('2025-06-20T12:00:00.000Z'),
      departureTime: '10:00',
      arrivalTime: '14:00',
      cost: 30000,
      seatsAvailable: 40,
      seats: 40,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('\n🚌 Inserting trip with data:', JSON.stringify(tripData, null, 2));
    
    const result = await tripsCollection.insertOne(tripData);
    
    console.log('\n✅ Trip created successfully!');
    console.log('Inserted ID:', result.insertedId);
    
    // Fetch and display the created trip
    const createdTrip = await tripsCollection.findOne({ _id: result.insertedId });
    console.log('\n📋 Created trip details:');
    console.log(JSON.stringify(createdTrip, null, 2));
    
    return createdTrip;
  } catch (error) {
    console.error('\n❌ Error creating trip:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
createTrip()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
