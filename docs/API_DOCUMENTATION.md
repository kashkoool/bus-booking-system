# API Documentation

## Base URL

```
Development: http://localhost:5001/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (if applicable)
  }
}
```

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "gender": "male"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "60d5ec9cf2b8a42878e9f6d3",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "gender": "male",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User

**POST** `/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "60d5ec9cf2b8a42878e9f6d3",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User

**GET** `/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d5ec9cf2b8a42878e9f6d3",
      "username": "john_doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "gender": "male",
      "role": "customer",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Logout User

**POST** `/auth/logout`

Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Trip Endpoints

### Get All Trips

**GET** `/trips`

Get paginated list of trips with filtering options.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `from` (string): Departure city
- `to` (string): Destination city
- `date` (string): Trip date (YYYY-MM-DD)
- `company` (string): Company ID
- `status` (string): Trip status (active, completed, cancelled)

**Response:**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "_id": "60d5ec9cf2b8a42878e9f6d4",
        "from": "New York",
        "to": "Boston",
        "departureTime": "2024-01-20T08:00:00.000Z",
        "arrivalTime": "2024-01-20T12:00:00.000Z",
        "price": 45.00,
        "availableSeats": 25,
        "totalSeats": 50,
        "bus": {
          "_id": "60d5ec9cf2b8a42878e9f6d5",
          "plateNumber": "NY12345",
          "model": "Mercedes Sprinter"
        },
        "company": {
          "_id": "60d5ec9cf2b8a42878e9f6d6",
          "name": "Express Bus Co.",
          "logo": "logo-url"
        },
        "status": "active"
      }
    ]
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

### Get Trip by ID

**GET** `/trips/:id`

Get detailed information about a specific trip.

**Response:**
```json
{
  "success": true,
  "data": {
    "trip": {
      "_id": "60d5ec9cf2b8a42878e9f6d4",
      "from": "New York",
      "to": "Boston",
      "departureTime": "2024-01-20T08:00:00.000Z",
      "arrivalTime": "2024-01-20T12:00:00.000Z",
      "price": 45.00,
      "availableSeats": 25,
      "totalSeats": 50,
      "bookedSeats": [1, 5, 12, 23],
      "bus": {
        "_id": "60d5ec9cf2b8a42878e9f6d5",
        "plateNumber": "NY12345",
        "model": "Mercedes Sprinter",
        "capacity": 50
      },
      "company": {
        "_id": "60d5ec9cf2b8a42878e9f6d6",
        "name": "Express Bus Co.",
        "logo": "logo-url"
      },
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Create Trip (Admin/Manager Only)

**POST** `/trips`

Create a new trip.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "from": "New York",
  "to": "Boston",
  "departureTime": "2024-01-20T08:00:00.000Z",
  "arrivalTime": "2024-01-20T12:00:00.000Z",
  "price": 45.00,
  "busId": "60d5ec9cf2b8a42878e9f6d5",
  "companyId": "60d5ec9cf2b8a42878e9f6d6"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "trip": {
      "_id": "60d5ec9cf2b8a42878e9f6d4",
      "from": "New York",
      "to": "Boston",
      "departureTime": "2024-01-20T08:00:00.000Z",
      "arrivalTime": "2024-01-20T12:00:00.000Z",
      "price": 45.00,
      "availableSeats": 50,
      "totalSeats": 50,
      "status": "active"
    }
  }
}
```

## Booking Endpoints

### Get User Bookings

**GET** `/bookings`

Get current user's bookings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Booking status (confirmed, cancelled, completed)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "60d5ec9cf2b8a42878e9f6d7",
        "trip": {
          "_id": "60d5ec9cf2b8a42878e9f6d4",
          "from": "New York",
          "to": "Boston",
          "departureTime": "2024-01-20T08:00:00.000Z",
          "arrivalTime": "2024-01-20T12:00:00.000Z"
        },
        "seats": [15, 16],
        "totalAmount": 90.00,
        "status": "confirmed",
        "bookingDate": "2024-01-15T10:30:00.000Z",
        "qrCode": "qr-code-data"
      }
    ]
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

### Create Booking

**POST** `/bookings`

Create a new booking for a trip.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "tripId": "60d5ec9cf2b8a42878e9f6d4",
  "seats": [15, 16],
  "paymentMethod": "credit_card",
  "paymentInfo": {
    "cardNumber": "**** **** **** 1234",
    "cardType": "visa"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "_id": "60d5ec9cf2b8a42878e9f6d7",
      "trip": {
        "_id": "60d5ec9cf2b8a42878e9f6d4",
        "from": "New York",
        "to": "Boston",
        "departureTime": "2024-01-20T08:00:00.000Z"
      },
      "seats": [15, 16],
      "totalAmount": 90.00,
      "status": "confirmed",
      "qrCode": "qr-code-data",
      "bookingDate": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Get Booking Details

**GET** `/bookings/:id`

Get detailed information about a specific booking.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "_id": "60d5ec9cf2b8a42878e9f6d7",
      "user": {
        "_id": "60d5ec9cf2b8a42878e9f6d3",
        "username": "john_doe",
        "email": "john@example.com"
      },
      "trip": {
        "_id": "60d5ec9cf2b8a42878e9f6d4",
        "from": "New York",
        "to": "Boston",
        "departureTime": "2024-01-20T08:00:00.000Z",
        "arrivalTime": "2024-01-20T12:00:00.000Z",
        "price": 45.00
      },
      "seats": [15, 16],
      "totalAmount": 90.00,
      "status": "confirmed",
      "paymentMethod": "credit_card",
      "qrCode": "qr-code-data",
      "bookingDate": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Cancel Booking

**PUT** `/bookings/:id/cancel`

Cancel a booking.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "_id": "60d5ec9cf2b8a42878e9f6d7",
      "status": "cancelled",
      "cancelledAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

## Company Endpoints

### Get All Companies

**GET** `/companies`

Get list of all companies.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by company name

**Response:**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "_id": "60d5ec9cf2b8a42878e9f6d6",
        "name": "Express Bus Co.",
        "email": "info@expressbus.com",
        "phone": "1234567890",
        "address": "123 Main St, New York, NY",
        "logo": "logo-url",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

### Get Company by ID

**GET** `/companies/:id`

Get detailed information about a specific company.

**Response:**
```json
{
  "success": true,
  "data": {
    "company": {
      "_id": "60d5ec9cf2b8a42878e9f6d6",
      "name": "Express Bus Co.",
      "email": "info@expressbus.com",
      "phone": "1234567890",
      "address": "123 Main St, New York, NY",
      "logo": "logo-url",
      "status": "active",
      "buses": [
        {
          "_id": "60d5ec9cf2b8a42878e9f6d5",
          "plateNumber": "NY12345",
          "model": "Mercedes Sprinter",
          "capacity": 50
        }
      ],
      "trips": [
        {
          "_id": "60d5ec9cf2b8a42878e9f6d4",
          "from": "New York",
          "to": "Boston",
          "departureTime": "2024-01-20T08:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Staff Management Endpoints

### Get Company Staff

**GET** `/company/staff`

Get staff members for the authenticated company.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by username, email, or phone
- `status` (string): Filter by status (active, inactive, suspended)
- `staffType` (string): Filter by staff type (accountant, supervisor, employee, driver)

**Response:**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "_id": "60d5ec9cf2b8a42878e9f6d8",
        "username": "driver_john",
        "email": "john@expressbus.com",
        "phone": "1234567890",
        "gender": "male",
        "staffType": "driver",
        "isActive": true,
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

### Create Staff Member

**POST** `/company/staff`

Create a new staff member.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "username": "driver_jane",
  "email": "jane@expressbus.com",
  "password": "password123",
  "phone": "0987654321",
  "gender": "female",
  "staffType": "driver"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "staff": {
      "_id": "60d5ec9cf2b8a42878e9f6d9",
      "username": "driver_jane",
      "email": "jane@expressbus.com",
      "phone": "0987654321",
      "gender": "female",
      "staffType": "driver",
      "isActive": true,
      "status": "active"
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_TOKEN` | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | User doesn't have required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |
| `INSUFFICIENT_SEATS` | Not enough seats available |
| `TRIP_FULL` | Trip is fully booked |
| `PAYMENT_FAILED` | Payment processing failed |
| `BOOKING_EXPIRED` | Booking has expired |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **File uploads**: 10 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## WebSocket Events

### Connection

Connect to WebSocket server:

```javascript
const socket = io('http://localhost:5001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### `seat_update`
Emitted when seat availability changes:

```javascript
socket.on('seat_update', (data) => {
  console.log('Seat update:', data);
  // data: { tripId, bookedSeats, availableSeats }
});
```

#### `booking_confirmation`
Emitted when a booking is confirmed:

```javascript
socket.on('booking_confirmation', (data) => {
  console.log('Booking confirmed:', data);
  // data: { bookingId, tripId, seats, qrCode }
});
```

#### `trip_status_change`
Emitted when trip status changes:

```javascript
socket.on('trip_status_change', (data) => {
  console.log('Trip status changed:', data);
  // data: { tripId, status, message }
});
```

## Pagination

Most list endpoints support pagination with these parameters:

- `page`: Page number (starts from 1)
- `limit`: Number of items per page (max 100)

Response includes pagination metadata:

```json
{
  "pagination": {
    "total": 150,
    "page": 2,
    "pages": 15,
    "limit": 10,
    "hasNext": true,
    "hasPrev": true
  }
}
``` 