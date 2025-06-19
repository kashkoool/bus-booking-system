const axios = require("axios");

// --- Configuration ---
const BASE_URL = "http://localhost:5001/api"; // Note: This needs to be the base API URL, not shared
const MANAGER_USERNAME = "Co_manager";
const MANAGER_PASSWORD = "12345678";
const NUM_BUSES_TO_CREATE = 5;

// --- Helper Functions ---
async function loginAsManager(username, password) {
  const loginUrl = `${BASE_URL}/shared/login`; // Corrected path for shared login
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

function generateRandomBusData(index) {
  const busTypes = ["standard", "premium", "luxury", "sleeper"];
  const models = [
    "Mercedes-Benz Travego",
    "Volvo 9700",
    "Scania Touring",
    "Setra S 517 HD",
  ];
  const seats = Math.floor(Math.random() * (50 - 30 + 1)) + 30; // 30-50 seats

  return {
    busNumber: `BUS${String(index + 1).padStart(3, "0")}`,
    seats: seats,
    busType: busTypes[Math.floor(Math.random() * busTypes.length)],
    model: models[Math.floor(Math.random() * models.length)],
  };
}

async function createBus(token, busData) {
  const addBusUrl = `${BASE_URL}/company/add-bus`; // Corrected path for add-bus
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  console.log(`Creating bus ${busData.busNumber}...`);
  try {
    const response = await axios.post(addBusUrl, busData, { headers });
    console.log("Bus created successfully!");
    console.log("Response:", response.data);
    return true;
  } catch (error) {
    console.error(`Failed to create bus. Error: ${error.message}`);
    if (error.response) {
      console.error("Request data:", busData);
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
    console.log(`\n--- Seeding ${NUM_BUSES_TO_CREATE} Buses ---`);
    let successfulBuses = 0;
    for (let i = 0; i < NUM_BUSES_TO_CREATE; i++) {
      console.log(`\nSeeding bus ${i + 1}/${NUM_BUSES_TO_CREATE}...`);
      const busData = generateRandomBusData(i);
      if (await createBus(jwtToken, busData)) {
        successfulBuses++;
      } else {
        console.log(`Skipping bus ${i + 1} due to error.`);
      }
    }

    console.log(`\n--- Seeding Complete ---`);
    console.log(
      `Successfully created ${successfulBuses} out of ${NUM_BUSES_TO_CREATE} buses.`
    );
  } else {
    console.log("\nCould not obtain a JWT token. Bus seeding aborted.");
    console.log(
      "Please ensure your backend is running and manager credentials are correct."
    );
  }
}

main();
