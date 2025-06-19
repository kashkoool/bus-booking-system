import requests
import json
from datetime import datetime, timedelta
import random

# --- Configuration ---
BASE_URL = "http://localhost:5001/api"
MANAGER_USERNAME = "Co_manager_test" # <--- REPLACE WITH YOUR ACTUAL MANAGER USERNAME
MANAGER_PASSWORD = "password123" # <--- REPLACE WITH YOUR ACTUAL MANAGER PASSWORD
NUM_TRIPS_TO_CREATE = 10

# --- Helper Functions ---
def login_as_manager(username, password):
    """Logs into the backend as a manager and returns the JWT token."""
    login_url = f"{BASE_URL}/login"
    payload = {
        "username": username,
        "password": password
    }
    headers = {"Content-Type": "application/json"}

    print(f"Attempting to log in as {username}...")
    try:
        response = requests.post(login_url, data=json.dumps(payload), headers=headers)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        token = response.json().get("token")
        if token:
            print("Login successful! Token obtained.")
            return token
        else:
            print("Login successful, but no token received in response.")
            print("Response:", response.json())
            return None
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error during login: {e}")
        print(f"Response content: {e.response.text}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error during login: {e}")
        return None

def generate_random_trip_data():
    """Generates a dictionary with random trip details."""
    origins = ["دمشق", "حمص", "حماه", "طرطوس", "اللاذقية", "حلب"]
    destinations = ["دمشق", "حمص", "حماه", "طرطوس", "اللاذقية", "حلب"]
    
    # Ensure origin and destination are different
    origin = random.choice(origins)
    destination = random.choice([d for d in destinations if d != origin])

    bus_numbers = [f"BUS{i:03d}" for i in range(1, 21)] # BUS001 to BUS020

    # Random date within the next 30 days
    departure_date = datetime.now() + timedelta(days=random.randint(1, 30))
    arrival_date = departure_date + timedelta(hours=random.randint(4, 10)) # Trip duration 4-10 hours

    # Random times
    dep_hour = random.randint(6, 22)
    arr_hour = random.randint(dep_hour + 1, 23) if dep_hour < 23 else dep_hour # Ensure arrival is after departure
    dep_minute = random.choice([0, 15, 30, 45])
    arr_minute = random.choice([0, 15, 30, 45])

    cost = random.randint(5000, 50000) * 10 # Random cost in multiples of 1000

    return {
        "busNumber": random.choice(bus_numbers),
        "origin": origin,
        "destination": destination,
        "departureDate": departure_date.strftime("%Y-%m-%d"),
        "arrivalDate": arrival_date.strftime("%Y-%m-%d"),
        "departureTime": f"{dep_hour:02d}:{dep_minute:02d}",
        "arrivalTime": f"{arr_hour:02d}:{arr_minute:02d}",
        "cost": cost
    }

def create_trip(token, trip_data):
    """Sends a POST request to create a single trip."""
    add_trip_url = f"{BASE_URL}/add-trip"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print(f"Creating trip from {trip_data['origin']} to {trip_data['destination']} on {trip_data['departureDate']}...")
    try:
        response = requests.post(add_trip_url, data=json.dumps(trip_data), headers=headers)
        response.raise_for_status() # Raise an exception for HTTP errors
        print("Trip created successfully!")
        print("Response:", response.json())
        return True
    except requests.exceptions.HTTPError as e:
        print(f"Failed to create trip. HTTP error: {e}")
        print(f"Request data: {trip_data}")
        print(f"Response content: {e.response.text}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"Error creating trip: {e}")
        print(f"Request data: {trip_data}")
        return False

# --- Main Script Execution ---
if __name__ == "__main__":
    jwt_token = login_as_manager(MANAGER_USERNAME, MANAGER_PASSWORD)

    if jwt_token:
        print(f"\n--- Seeding {NUM_TRIPS_TO_CREATE} Trips ---")
        successful_trips = 0
        for i in range(NUM_TRIPS_TO_CREATE):
            print(f"\nSeeding trip {i + 1}/{NUM_TRIPS_TO_CREATE}...")
            trip_data = generate_random_trip_data()
            if create_trip(jwt_token, trip_data):
                successful_trips += 1
            else:
                print(f"Skipping trip {i + 1} due to error.")
        
        print(f"\n--- Seeding Complete ---")
        print(f"Successfully created {successful_trips} out of {NUM_TRIPS_TO_CREATE} trips.")
    else:
        print("\nCould not obtain a JWT token. Trip seeding aborted.")
        print("Please ensure your backend is running and manager credentials are correct.") 