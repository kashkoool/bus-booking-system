const axios = require("axios");

// --- Configuration ---
const BASE_URL = "http://localhost:5001/api";
const MANAGER_USERNAME = "Co_manager"; // Updated to the existing manager username
const MANAGER_PASSWORD = "12345678"; // Updated to the existing manager password
const NUM_TRIPS_TO_CREATE = 10;

// --- Helper Functions ---
async function loginAsManager(username, password) {
  const loginUrl = `${BASE_URL}/shared/login`;
  const payload = {
    username: username,
    password: password,
  };
  const headers = { "Content-Type": "application/json" };

  console.log(`Attempting to log in as ${username}...`);
  try {
    const response = await axios.post(loginUrl, payload, { headers });
    const token = response.data.token;
    if (token) {
      console.log("Login successful! Token obtained.");
      return token;
    } else {
      console.log("Login successful, but no token received in response.");
      console.log("Response:", response.data);
      return null;
    }
  } catch (error) {
    console.error(`Error during login: ${error.message}`);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return null;
  }
}

async function fetchExistingBusNumbers(token) {
  const showBusesUrl = `${BASE_URL}/shared/show-buses`;
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  console.log("Fetching existing bus numbers...");
  try {
    const response = await axios.get(showBusesUrl, { headers });
    const busNumbers = response.data.map((bus) => bus.busNumber);
    console.log("Existing bus numbers fetched:", busNumbers);
    return busNumbers;
  } catch (error) {
    console.error(`Error fetching bus numbers: ${error.message}`);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return [];
  }
}

function generateRandomTripData(availableBusNumbers) {
  const origins = ["دمشق", "حمص", "حماه", "طرطوس", "اللاذقية", "حلب"];
  const destinations = ["دمشق", "حمص", "حماه", "طرطوس", "اللاذقية", "حلب"];

  let origin = origins[Math.floor(Math.random() * origins.length)];
  let destination =
    destinations[Math.floor(Math.random() * destinations.length)];
  // Ensure origin and destination are different
  while (destination === origin) {
    destination = destinations[Math.floor(Math.random() * destinations.length)];
  }

  if (availableBusNumbers.length === 0) {
    console.error(
      "No buses available to create trips. Please seed buses first."
    );
    return null;
  }

  // Random date within the next 30 days
  const departureDate = new Date();
  departureDate.setDate(
    departureDate.getDate() + Math.floor(Math.random() * 30) + 1
  ); // Random date within next 30 days
  const arrivalDate = new Date(departureDate);
  arrivalDate.setHours(
    departureDate.getHours() + Math.floor(Math.random() * 7) + 4
  ); // Trip duration 4-10 hours

  // Random times
  const depHour = Math.floor(Math.random() * (22 - 6 + 1)) + 6;
  const arrHour =
    Math.floor(Math.random() * (23 - (depHour + 1) + 1)) + (depHour + 1);
  const depMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  const arrMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

  const cost = Math.floor((Math.random() * (50000 - 5000 + 1)) / 10) * 10; // Random cost in multiples of 100

  return {
    busNumber:
      availableBusNumbers[
        Math.floor(Math.random() * availableBusNumbers.length)
      ], // Use existing bus numbers
    origin: origin,
    destination: destination,
    departureDate: departureDate.toISOString().split("T")[0],
    arrivalDate: arrivalDate.toISOString().split("T")[0],
    departureTime: `${String(depHour).padStart(2, "0")}:${String(
      depMinute
    ).padStart(2, "0")}`,
    arrivalTime: `${String(arrHour).padStart(2, "0")}:${String(
      arrMinute
    ).padStart(2, "0")}`,
    cost: cost,
  };
}

async function createTrip(token, tripData) {
  const addTripUrl = `${BASE_URL}/shared/add-trip`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Ensure companyID is set correctly
  tripData.companyID = 123456;

  console.log(
    `Creating trip from ${tripData.origin} to ${tripData.destination} on ${tripData.departureDate}...`
  );
  try {
    const response = await axios.post(addTripUrl, tripData, { headers });
    console.log("Trip created successfully!");
    console.log("Response:", response.data);
    return true;
  } catch (error) {
    console.error(`Failed to create trip. Error: ${error.message}`);
    if (error.response) {
      console.error("Request data:", tripData);
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return false;
  }
}

// --- Main Script Execution ---
async function main() {
  const jwtToken = await loginAsManager(MANAGER_USERNAME, MANAGER_PASSWORD);

  if (jwtToken) {
    const availableBusNumbers = await fetchExistingBusNumbers(jwtToken);
    if (availableBusNumbers.length === 0) {
      console.log(
        "No buses found. Please run seed_buses.js first to create buses."
      );
      return;
    }

    console.log(`\n--- Seeding ${NUM_TRIPS_TO_CREATE} Trips ---`);
    let successfulTrips = 0;
    for (let i = 0; i < NUM_TRIPS_TO_CREATE; i++) {
      console.log(`\nSeeding trip ${i + 1}/${NUM_TRIPS_TO_CREATE}...`);
      const tripData = generateRandomTripData(availableBusNumbers);
      if (tripData && (await createTrip(jwtToken, tripData))) {
        successfulTrips++;
      } else if (tripData === null) {
        // This case is handled by error message inside generateRandomTripData
        break; // Stop if no buses are available
      } else {
        console.log(`Skipping trip ${i + 1} due to error.`);
      }
    }

    console.log(`\n--- Seeding Complete ---`);
    console.log(
      `Successfully created ${successfulTrips} out of ${NUM_TRIPS_TO_CREATE} trips.`
    );
  } else {
    console.log("\nCould not obtain a JWT token. Trip seeding aborted.");
    console.log(
      "Please ensure your backend is running and manager credentials are correct."
    );
  }
}

main();
