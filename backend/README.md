# Bus Booking System - Backend API

This is the backend API for the Bus Booking System, built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Company management
- Staff management
- Bus management
- Booking management
- Real-time notifications
- Reporting and analytics

## API Documentation

### Staff Management Endpoints

#### Get All Staff

```http
GET /api/company/staff
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term (searches username, email, phone)
- `status` - Filter by status (active, inactive, suspended)
- `staffType` - Filter by staff type (accountant, supervisor, employee, driver)
- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec9cf2b8a42878e9f6d3",
      "username": "staff1",
      "email": "staff1@example.com",
      "phone": "1234567890",
      "gender": "male",
      "staffType": "driver",
      "isActive": true,
      "status": "active"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

#### Update Staff

```http
PUT /api/company/updatestaff/:id
```

**Request Body:**
```json
{
  "username": "updatedstaff",
  "email": "updated@example.com",
  "phone": "0987654321",
  "isActive": true,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff updated successfully",
  "data": {
    "_id": "60d5ec9cf2b8a42878e9f6d3",
    "username": "updatedstaff",
    "email": "updated@example.com",
    "phone": "0987654321",
    "isActive": true,
    "status": "active"
  }
}
```

#### Delete Staff

```http
DELETE /api/company/deletestaff/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Staff deleted successfully",
  "data": {
    "staffId": "60d5ec9cf2b8a42878e9f6d3"
  }
}
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/bus_booking
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Run tests:
   ```bash
   npm test
   ```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Node environment | development |
| PORT | Server port | 5001 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/bus_booking |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRE | JWT expiration time | 30d |
| JWT_COOKIE_EXPIRE | JWT cookie expiration in days | 30 |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
