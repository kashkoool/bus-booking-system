const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// You'll need to get a valid admin token from your system
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE';

async function createTrip() {
  try {
    console.log('🚀 Creating trip via API...');
    
    const response = await axios.post(
      'http://localhost:5000/api/trips', // Update port if needed
      {
        companyID: 1001,
        busNumber: '1001-1',
        bus: '685139bc11a6086233038a84',
        origin: 'دمشق',
        destination: 'حلب',
        departureDate: '2025-06-20T10:00:00.000Z',
        arrivalDate: '2025-06-20T14:00:00.000Z',
        departureTime: '10:00',
        arrivalTime: '14:00',
        cost: 30000,
        seatsAvailable: 40,
        seats: 40,
        status: 'scheduled'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );

    console.log('✅ Trip created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error creating trip:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Run the script
createTrip()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
