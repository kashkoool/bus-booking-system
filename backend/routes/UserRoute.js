const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const mongoose = require('mongoose');
// Import models directly from their files to avoid any potential circular dependencies
const { Customer, validateCustomer } = require("../models/Customer");
const Joi = require("joi");
const Token = require("../models/Token");
const Trip = require("../models/Trip");
const Company = require("../models/Company");
const Bus = require("../models/Bus");
const Booking = require("../models/Booking");
const CreditCard = require("../models/CreditCard");
const Payment = require("../models/Payment");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/authMiddleware");
const { customerOnly } = require("../middleware/roleMiddleware");
const { body, check, validationResult } = require("express-validator");
const NodeCache = require("node-cache");
const Notification = require("../models/Notification");

// For backward compatibility
const userOnly = customerOnly;

// Export the router
module.exports = router;

// Export userOnly separately for use in other files (deprecated, use customerOnly instead)
module.exports.userOnly = userOnly;

// Initialize cache with 5 minutes TTL (time to live)
const dashboardCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Helper function to get cache key for customer dashboard
const getDashboardCacheKey = (customerId) => `customer_dashboard_${customerId}`;

// Clear dashboard cache when customer updates their profile or makes a booking
const clearUserDashboardCache = (customerId) => {
  const cacheKey = getDashboardCacheKey(customerId);
  dashboardCache.del(cacheKey);
};

// User (Customer) registration (public route)
router.post("/register", async (req, res) => {
  try {
    // Validate request body
    const { error } = validateCustomer(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    // Check if customer already exists
    const customer = await Customer.findOne({ email: req.body.email });
    if (customer) {
      return res
        .status(409)
        .send({ message: "Customer with given email already exists" });
    }

    // Create new customer
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const newCustomer = new Customer({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
      age: req.body.age,
      phone: req.body.phone,
      country: req.body.country,
      gender: req.body.gender,
    });

    await newCustomer.save();

    // Generate auth token
    const token = newCustomer.generateAuthToken();

    // Set token in response header
    res.header("x-auth-token", token).status(201).send({
      _id: newCustomer._id,
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      email: newCustomer.email,
      role: newCustomer.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Validation schema for login
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().required().label("Password")
  });
  return schema.validate(data);
};

// User login (public route)
router.post("/login", async (req, res) => {
  try {
    console.log('Login request body:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
    const validationResult = validateLogin({
      email: req.body.email,
      password: req.body.password
    });
    
    console.log('Validation result:', JSON.stringify(validationResult, null, 2));
    
    if (validationResult.error) {
      console.error('Validation error:', validationResult.error.details);
      return res.status(400).json({
        success: false,
        message: validationResult.error.details[0].message,
      });
    }

    // Check if customer exists
    const customer = await Customer.findOne({ email: req.body.email });
    if (!customer) {
      console.log('Customer not found for email:', req.body.email);
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // Validate password
    const validPassword = await bcrypt.compare(
      req.body.password,
      customer.password
    );
    if (!validPassword) {
      console.log('Invalid password for email:', req.body.email);
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate auth token
    const token = customer.generateAuthToken();

    // Create token document
    const tokenDoc = new Token({
      userType: "Customer",
      userId: customer._id,
      token: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      userData: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        country: customer.country,
        gender: customer.gender,
        age: customer.age,
        role: customer.role,
      },
    });

    await tokenDoc.save();

    // Response with token and customer data
    res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        country: customer.country,
        gender: customer.gender,
        age: customer.age,
        role: customer.role,
      },
      tokenExpiresIn: "1d",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});



// Helper function to build trip query based on filters
const buildTripQuery = (query) => {
  // Start with empty query to show all trips
  const tripQuery = {};

  // Filter by origin if provided
  if (query.origin) {
    tripQuery.origin = query.origin;
  }

  // Filter by destination if provided
  if (query.destination) {
    tripQuery.destination = query.destination;
  }

  // Filter by date if provided
  if (query.date) {
    const searchDate = new Date(query.date);
    const nextDate = new Date(searchDate);
    nextDate.setDate(nextDate.getDate() + 1);

    tripQuery.departureDate = {
      $gte: searchDate,
      $lt: nextDate,
    };
  }

  // Filter by price range if provided
  if (query.minPrice) {
    tripQuery.cost = { ...tripQuery.cost, $gte: Number(query.minPrice) };
  }
  if (query.maxPrice) {
    tripQuery.cost = {
      ...tripQuery.cost,
      $lte: Number(query.maxPrice),
    };
  }

  // Filter by departure time range if provided
  if (query.departureTimeFrom || query.departureTimeTo) {
    tripQuery.departureTime = {};
    if (query.departureTimeFrom) {
      tripQuery.departureTime.$gte = query.departureTimeFrom;
    }
    if (query.departureTimeTo) {
      tripQuery.departureTime.$lte = query.departureTimeTo;
    }
  }

  // Filter by companies if provided
  if (query.companies) {
    console.log("Received companies filter:", query.companies);
    try {
      // Split the companies string and convert each ID to a number
      const companyIds = query.companies.split(",").map((id) => Number(id));
      console.log("Parsed company IDs:", companyIds);

      // Add company filter to query
      tripQuery.companyID = { $in: companyIds };
      console.log(
        "Final company filter query:",
        JSON.stringify(tripQuery.companyID)
      );
    } catch (error) {
      console.error("Error parsing company IDs:", error);
    }
  }

  console.log("Final trip query:", JSON.stringify(tripQuery, null, 2));
  return tripQuery;
};

/**
 * @route   GET /api/user/dashboard
 * @desc    Get all trips with company info
 * @access  Private (User)
 */
router.get("/dashboard", auth, customerOnly, async (req, res) => {
  try {
    console.log("Dashboard request received with filters:", req.query);

    // First, let's check what trips exist without filters
    const allTrips = await Trip.find({}).lean();
    console.log("Total trips in database:", allTrips.length);

    if (allTrips.length > 0) {
      console.log("Sample of all trips in database:");
      allTrips.slice(0, 3).forEach((trip, index) => {
        console.log(`Trip ${index + 1}:`, {
          id: trip._id,
          departureDate: trip.departureDate,
          departureTime: trip.departureTime,
          origin: trip.origin,
          destination: trip.destination,
          cost: trip.cost,
          status: trip.status,
          seatsAvailable: trip.seatsAvailable,
        });
      });
    }

    // Build trip query from filters
    const tripQuery = buildTripQuery(req.query);

    // Get filtered trips
    const trips = await Trip.find(tripQuery)
      .sort({ departureDate: 1, departureTime: 1 })
      .lean();

    console.log(`Debug: Found ${trips.length} trips matching filters`);

    // Log a sample of the filtered trips to verify data
    if (trips.length > 0) {
      console.log("Sample filtered trip:", JSON.stringify(trips[0], null, 2));
    } else {
      console.log("No trips found with the current filters");
      console.log("Query used:", JSON.stringify(tripQuery, null, 2));
    }

    // Get unique company IDs from the trips
    const companyIds = [...new Set(trips.map((trip) => trip.companyID))];
    console.log("Found company IDs:", companyIds);

    // Get company information
    const companies = await Company.find(
      { companyID: { $in: companyIds } },
      "companyID companyName logo"
    ).lean();

    console.log(`Found ${companies.length} companies`);

    // Create a map for quick company lookup
    const companyMap = companies.reduce((acc, company) => {
      acc[company.companyID] = company;
      return acc;
    }, {});

    // Attach company info to each trip
    const tripsWithCompany = trips.map((trip) => ({
      ...trip,
      id: trip._id,
      company: companyMap[trip.companyID] || null,
    }));

    // Simple pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTrips = tripsWithCompany.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTrips,
      pagination: {
        total: tripsWithCompany.length,
        page: page,
        limit: limit,
        pages: Math.ceil(tripsWithCompany.length / limit),
      },
      filters: {
        applied: Object.keys(tripQuery).length > 1,
        active: {
          date: req.query.date || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
          origin: req.query.origin || null,
          destination: req.query.destination || null,
          minPrice: req.query.minPrice || null,
          maxPrice: req.query.maxPrice || null,
          busType: req.query.busType || null,
          company: req.query.company || null,
          timeOfDay: req.query.timeOfDay || null,
          minSeats: req.query.minSeats || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in dashboard route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/trips/search
 * @desc    Search for trips by origin, destination, and/or date
 * @access  Private (User)
 * @query   {string} [origin] - Case-insensitive partial match for trip origin
 * @query   {string} [destination] - Case-insensitive partial match for trip destination
 * @query   {string} [date] - Date in YYYY-MM-DD format to filter trips by departure date
 * @query   {number} [page=1] - Page number for pagination (default: 1)
 * @query   {number} [limit=10] - Number of results per page (default: 10, max: 50)
 
// ?origin=Alexandria
// ?destination=Cairo
// ?date=2025-05-26 
// ?origin=Alexandria&destination=Cairo
// ?origin=Alexandria&date=2025-05-26
// ?destination=Cairo&date=2025-05-26
// ?origin=Alexandria&destination=Cairo&date=2025-05-26
*/
router.get("/trips/search", auth, customerOnly, async (req, res) => {
  try {
    // Extract and validate query parameters
    let { origin, destination, date, page = 1, limit = 10 } = req.query;

    // Convert page and limit to numbers and validate
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit) || 10));

    // Build query with status filter
    const query = { status: "scheduled" };

    // Add origin filter if provided
    if (origin && typeof origin === "string" && origin.trim()) {
      query.origin = { $regex: origin.trim(), $options: "i" };
    }

    // Add destination filter if provided
    if (destination && typeof destination === "string" && destination.trim()) {
      query.destination = { $regex: destination.trim(), $options: "i" };
    }

    // Add date filter if provided
    if (date) {
      try {
        const searchDate = new Date(date);
        if (isNaN(searchDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format. Please use YYYY-MM-DD",
          });
        }

        // Set time to start of day (00:00:00)
        const startOfDay = new Date(searchDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        // Set time to end of day (23:59:59.999)
        const endOfDay = new Date(searchDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Add date range to query
        query.departureDate = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    }

    // Validate that at least one search parameter is provided
    if (!query.origin && !query.destination && !query.departureDate) {
      return res.status(400).json({
        success: false,
        message:
          "At least one search parameter is required (origin, destination, or date)",
      });
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // First, get the matching trips with basic info
    const tripsQuery = Trip.find(query, {
      _id: 1,
      origin: 1,
      destination: 1,
      departureDate: 1,
      departureTime: 1,
      arrivalDate: 1,
      arrivalTime: 1,
      cost: 1,
      seatsAvailable: 1,
      bus: 1,
      companyID: 1,
      status: 1,
    })
      .sort({ departureDate: 1, departureTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get the count for pagination
    const countQuery = Trip.countDocuments(query);

    // Execute both queries in parallel
    const [trips, total] = await Promise.all([tripsQuery, countQuery]);

    // If no trips found, return empty result
    if (trips.length === 0) {
      return res.json({
        success: true,
        count: 0,
        total: 0,
        totalPages: 0,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        searchParams: {
          origin: origin || null,
          destination: destination || null,
          date: date || null,
        },
        trips: [],
      });
    }

    // Get unique company IDs from the trips
    const companyIds = [...new Set(trips.map((trip) => trip.companyID))];

    // Find all companies in a single query
    const companies = await Company.find(
      { companyID: { $in: companyIds } },
      "companyID companyName phone email logo"
    ).lean();

    // Create a map of companyID to company data for quick lookup
    const companyMap = companies.reduce((acc, company) => {
      acc[company.companyID] = company;
      return acc;
    }, {});

    // Get unique bus IDs from the trips
    const busIds = [...new Set(trips.map((trip) => trip.bus).filter(Boolean))];

    // Find all buses in a single query
    const buses = await Bus.find(
      { _id: { $in: busIds } },
      "busNumber type capacity amenities"
    ).lean();

    // Create a map of bus _id to bus data for quick lookup
    const busMap = buses.reduce((acc, bus) => {
      acc[bus._id.toString()] = bus;
      return acc;
    }, {});

    // Enrich trips with company and bus data
    const enrichedTrips = trips.map((trip) => {
      const company = companyMap[trip.companyID] || null;
      const bus = trip.bus ? busMap[trip.bus.toString()] : null;

      return {
        id: trip._id,
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate,
        departureTime: trip.departureTime,
        arrivalDate: trip.arrivalDate,
        arrivalTime: trip.arrivalTime,
        price: trip.cost,
        availableSeats: trip.seatsAvailable,
        bus: bus,
        company: company,
        status: trip.status,
      };
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    // Format the response with enriched trips
    const response = {
      success: true,
      count: enrichedTrips.length,
      total,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      searchParams: {
        origin: origin || null,
        destination: destination || null,
        date: date || null,
      },
      trips: enrichedTrips,
    };

    // Cache the response for 1 minute
    const cacheKey = `search_${JSON.stringify(req.query)}`;
    dashboardCache.set(cacheKey, response, 60); // Cache for 60 seconds

    res.json(response);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching for trips",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/trips/:tripId/available-seats
 * @desc    Get available seats for a trip
 * @access  Private (User)
 */
router.get("/trips/:tripId/available-seats",
  auth,
  customerOnly,
  async (req, res) => {
    try {
      const { tripId } = req.params;

      // Get trip with bus details
      const trip = await Trip.findById(tripId).populate("bus", "seats");

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      // Get all non-cancelled bookings for this trip
      const bookings = await Booking.find({
        tripID: tripId, // Note: Changed from 'trip' to 'tripID' to match your schema
        status: { $ne: "cancelled" },
      }).select("passengers.seatNumber assignedSeats");

      // Extract all taken seat numbers from both passengers and assignedSeats
      const takenSeats = bookings
        .flatMap((booking) => {
          const fromPassengers = booking.passengers.map((p) => p.seatNumber);
          const fromAssigned = booking.assignedSeats || [];
          return [...fromPassengers, ...fromAssigned];
        })
        .filter((seat) => seat !== undefined && seat !== null)
        .filter((seat, index, self) => self.indexOf(seat) === index); // Remove duplicates
      console.log("Taken seats:", takenSeats); // Debug log

      // Generate available seats (1 to bus.seats)
      const availableSeats = [];
      for (let i = 1; i <= trip.bus.seats; i++) {
        if (!takenSeats.includes(i)) {
          availableSeats.push(i);
        }
      }

      res.json({
        success: true,
        data: {
          availableSeats,
          totalSeats: trip.bus.seats,
          availableCount: availableSeats.length,
          takenSeats, // Added for debugging
        },
      });
    } catch (error) {
      console.error("Error fetching available seats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching available seats",
        error: error.message, // Added for debugging
      });
    }
  }
);

// Helper middleware to validate JSON
const validateJson = (req, res, next) => {
  if (req.is("application/json")) {
    next();
  } else {
    res.status(400).json({
      success: false,
      message: "Content-Type must be application/json",
    });
  }
};

/**
 * @route   POST /api/user/Add-credit-card
 * @desc    Add a new credit card for the authenticated user
 * @access  Private (User)
 * @body    {string} cardNumber - 16-digit card number
 * @body    {string} expiryMonth - 2-digit month (01-12)
 * @body    {string} expiryYear - 4-digit year
 * @body    {string} cvv - 3 or 4 digit CVV
 * @body    {string} cardHolderName - Name on the card
 * @body    {boolean} [isDefault=false] - Whether to set as default payment method
 */
router.post('/Add-credit-card', auth, customerOnly, [
  check('cardNumber', 'Card number is required and must be 16 digits')
    .isLength({ min: 16, max: 16 })
    .isNumeric()
    .withMessage('Card number must contain only numbers'),
  check('expiryMonth', 'Expiry month is required (MM format)')
    .isLength({ min: 2, max: 2 })
    .isNumeric()
    .withMessage('Expiry month must be a number')
    .custom(v => v >= 1 && v <= 12)
    .withMessage('Expiry month must be between 01 and 12'),
  check('expiryYear', 'Expiry year is required (YYYY format)')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('Expiry year must be a number')
    .custom(v => v >= new Date().getFullYear())
    .withMessage('Expiry year cannot be in the past'),
  check('cvv', 'CVV is required (3-4 digits)')
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('CVV must contain only numbers'),
  check('cardHolderName', 'Cardholder name is required')
    .trim()
    .notEmpty()
    .withMessage('Cardholder name cannot be empty'),
  check('isDefault', 'isDefault must be a boolean')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Only use transactions in production (requires replica set)
  const useTransactions = process.env.NODE_ENV === 'production';
  const session = useTransactions ? await mongoose.startSession() : null;

  if (useTransactions) {
    session.startTransaction();
  }

  try {
    const {
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardHolderName,
      isDefault = false
    } = req.body;
    
    // Get user ID from either req.user._id (ObjectId) or req.user.id (string)
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Clean the card number (remove all non-digit characters)
    const cleanCardNumber = cardNumber.toString().replace(/\D/g, '');
    
    if (!cleanCardNumber) {
      if (useTransactions) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid card number format',
        error: 'INVALID_CARD_NUMBER'
      });
    }
    
    // Extract last 4 digits and create hash
    const last4 = cleanCardNumber.slice(-4);
    const cardNumberHash = crypto.createHash('sha256')
      .update(cleanCardNumber + (process.env.CARD_HASH_SALT || 'default-salt'))
      .digest('hex');
    
    // Check if card with same last 4 digits already exists for this user
    const existingCard = await CreditCard.findOne({
      user: userId,
      cardNumberLast4: last4
    }).session(useTransactions ? session : null);

    if (existingCard) {
      if (useTransactions) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'A card ending with these last 4 digits already exists in your account.'
      });
    }
    
    console.log('Adding new card with last 4 digits:', last4);
    
    // Format expiry year to 2 digits if needed
    const formattedExpiryYear = expiryYear.length === 2 ? expiryYear : expiryYear.slice(-2);
    const brand = detectCardBrand(cleanCardNumber);
    
    // Validate expiry year (20 years in the future max)
    const currentYear = new Date().getFullYear() % 100;
    const expiryYearNum = parseInt(formattedExpiryYear, 10);

    if (expiryYearNum < currentYear || expiryYearNum > (currentYear + 20)) {
      if (useTransactions) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        message: 'Expiry year must be valid and not more than 20 years in the future'
      });
    }

    // Generate IV for encryption
    const iv = crypto.randomBytes(16).toString('hex');

    // Create new credit card with all required fields
    const creditCardData = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      cardNumber: cleanCardNumber, // Will be encrypted by pre-save hook
      cardNumberLast4: last4,
      cardNumberHash: cardNumberHash,
      expiryMonth: expiryMonth.padStart(2, '0'),
      expiryYear: formattedExpiryYear,
      cvv: cvv, // Will be encrypted by pre-save hook
      cardHolderName: cardHolderName.toUpperCase().trim(),
      brand,
      balance: 1000000, // Default balance of 1,000,000 SYP
      isDefault,
      iv: iv // Required for encryption
    };
    
    const creditCard = new CreditCard(creditCardData);
    const saveOptions = useTransactions ? { session } : {};

    // If setting as default or this is the first card
    if (isDefault) {
      // Update other cards to not be default
      await CreditCard.updateMany(
        { user: userId, _id: { $ne: creditCard._id } },
        { $set: { isDefault: false } },
        saveOptions
      );
      
      // Update customer's defaultPaymentMethod
      await Customer.findByIdAndUpdate(
        userId,
        { $set: { defaultPaymentMethod: creditCard._id } },
        saveOptions
      );
    }
    // Save the new card
    await creditCard.save(saveOptions);
    
    // Update customer's creditCards array and set default if needed
    const customer = await Customer.findById(userId).session(session || null);
    if (customer) {
      // Add card to customer's credit cards if not already there
      if (!customer.creditCards.some(id => id.toString() === creditCard._id.toString())) {
        customer.creditCards.push(creditCard._id);
        
        // If this is the first card or no default is set, make it default
        if (!customer.defaultPaymentMethod || isDefault) {
          customer.defaultPaymentMethod = creditCard._id;
          creditCard.isDefault = true;
          await creditCard.save(saveOptions);
        }
        
        await customer.save(saveOptions);
      }
    }
    
    if (useTransactions) {
      await session.commitTransaction();
    }

    // Return the saved card (without sensitive data)
    const savedCard = creditCard.toObject();
    delete savedCard.cardNumber;
    delete savedCard.cvv;
    delete savedCard.iv;

    res.status(201).json({
      success: true,
      message: 'Credit card added successfully',
      card: savedCard
    });
  } catch (error) {
    if (useTransactions && session) {
      await session.abortTransaction();
    }
    
    console.error(`[${req.requestId || 'no-request-id'}] Error adding credit card:`, error);
    
    // Log additional error details for debugging
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    } else if (error.code === 11000) {
      console.error('Duplicate key error - Card already exists for this user');
      console.error('Error details:', {
        userId: req.user?._id || req.user?.id || 'unknown',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding credit card',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (useTransactions && session) {
      await session.endSession();
    }
  }
});

/**
 * @route   GET /api/user/Show-credit-cards
 * @desc    Get all credit cards for the authenticated user
 * @access  Private (User)
 */
router.get("/Show-credit-cards", auth, customerOnly, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from auth middleware

    // Find all credit cards for the user, including deleted ones
    const cards = await CreditCard.find({
      user: userId,
    })
      .select("-cardNumber -cvv -iv -cvvIv -__v") // Exclude sensitive data
      .sort({ isDefault: -1, createdAt: -1 }) // Default card first, then by newest
      .lean();

    // Format the response
    const formattedCards = cards.map((card) => ({
      _id: card._id,
      last4: card.cardNumberLast4,
      brand: card.brand,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardHolderName: card.cardHolderName,
      balance: card.balance,
      isDefault: card.isDefault,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedCards.length,
      data: formattedCards,
    });
  } catch (error) {
    console.error("Error fetching credit cards:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving credit cards",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   DELETE /api/user/delete-credit-card/:cardId
 * @desc    Remove a credit card from the user's account
 * @access  Private (User)
 * @param   {string} cardId - The ID of the credit card to remove
 */
router.delete( "/delete-credit-card/:cardId",
  auth,
  customerOnly,
  async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user._id || req.user.id;

    try {
      // 1. Verify the card exists and belongs to the user
      const card = await CreditCard.findOne({
        _id: cardId,
        user: userId,
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          message:
            "Credit card not found or you do not have permission to delete it.",
        });
      }

      // 2. Get the customer document
      const customer = await Customer.findById(userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found.",
        });
      }

      // 3. If this is the default card, find another card to set as default
      if (
        customer.defaultPaymentMethod &&
        customer.defaultPaymentMethod.toString() === cardId
      ) {
        // Find another card to set as default
        const anotherCard = await CreditCard.findOne({
          user: userId,
          _id: { $ne: cardId },
        });

        if (anotherCard) {
          customer.defaultPaymentMethod = anotherCard._id;
        } else {
          customer.defaultPaymentMethod = null;
        }
      }

      // 4. Remove the card from customer's creditCards array
      customer.creditCards = customer.creditCards.filter(
        (cardRef) => cardRef.toString() !== cardId
      );

      // 5. Save customer changes
      await customer.save();

      // 6. Delete the credit card
      await CreditCard.findByIdAndDelete(cardId);

      res.status(200).json({
        success: true,
        message: "Credit card removed successfully",
        data: {
          cardId: cardId,
          newDefaultCard: customer.defaultPaymentMethod,
        },
      });
    } catch (error) {
      console.error("Error removing credit card:", error);
      res.status(500).json({
        success: false,
        message: "Error removing credit card",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/user/Set-default-card/:cardId
 * @desc    Set a credit card as default for the authenticated user
 * @access  Private (User)
 * @param   {string} cardId - The ID of the credit card to set as default
 */
router.put("/Set-default-card/:cardId", auth, customerOnly, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid card ID",
      });
    }

    // Check if card with same last 4 digits already exists for this user
    const existingCard = await CreditCard.findOne({
      user: userId,
      cardNumberLast4: cardId
    });

    if (existingCard) {
      return res.status(400).json({
        success: false,
        message: 'A card with these last 4 digits already exists in your account.'
      });
    }

    // Find the card and verify it belongs to the user
    const card = await CreditCard.findOne({
      _id: cardId,
      user: userId,
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Credit card not found",
      });
    }

    // If already default, no need to do anything
    if (card.isDefault) {
      return res.json({
        success: true,
        message: "This is already your default card",
        card,
      });
    }

    // Set all user's cards to not default
    await CreditCard.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );

    // Set the selected card as default
    card.isDefault = true;
    await card.save();

    // Get the updated card with all fields
    const updatedCard = await CreditCard.findById(cardId)
      .select("-cardNumber -cvv -iv -cvvIv -__v")
      .lean();

    res.json({
      success: true,
      message: "Default credit card updated successfully",
      card: updatedCard,
    });
  } catch (error) {
    console.error("Error updating default card:", error);
    res.status(500).json({
      success: false,
      message: "Error updating default credit card",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Helper function to hash card number consistently
function hashCardNumber(cardNumber) {
  if (!cardNumber) return null;
  // Ensure consistent formatting - remove all non-digit characters
  const cleanNumber = cardNumber.toString().replace(/\D/g, '');
  
  // Create a consistent hash using the salt from environment or a default one
  const salt = process.env.CARD_HASH_SALT || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(cleanNumber + salt)
    .digest('hex');
}

// Helper function to detect card brand
function detectCardBrand(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, "");

  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^6(?:011|5)/.test(cleaned)) return "discover";

  return "other";
}

/**
 * @route   POST /api/user/book-trip
 * @desc    Book a trip online with automatic credit card payment
 * @access  Private (User)
 * @body    {string} tripID - ID of the trip to book
 * @body    {array} passengers - Array of passenger details
 * @body    {string} passengers[].firstName - Passenger's first name
 * @body    {string} passengers[].lastName - Passenger's last name
 * @body    {string} passengers[].gender - Passenger's gender (male/female)
 * @body    {string} passengers[].phone - Passenger's phone number
 */
router.post("/book-trip", auth, customerOnly, async (req, res) => {
  try {
    const { tripID, noOfSeats, passengers } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log("Booking request:", {
      tripID,
      noOfSeats,
      passengersCount: passengers?.length,
      userEmail,
    });

    // Validate trip exists
    const trip = await Trip.findById(tripID);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Validate number of seats
    if (!noOfSeats || noOfSeats < 1) {
      return res.status(400).json({
        success: false,
        message: "Number of seats must be at least 1",
      });
    }

    // Validate passengers array
    if (!Array.isArray(passengers) || passengers.length !== noOfSeats) {
      return res.status(400).json({
        success: false,
        message: "Passengers array must match number of seats",
      });
    }

    // Get available seats
    const availableSeats = await trip.getNextAvailableSeats(noOfSeats);
    console.log("Available seats:", availableSeats);

    if (availableSeats.length < noOfSeats) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableSeats.length} seats available`,
      });
    }

    // Get customer with default credit card
    const customer = await Customer.findById(userId).populate({
      path: 'defaultPaymentMethod',
      model: 'CreditCard'
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const creditCard = customer.defaultPaymentMethod;

    if (!creditCard) {
      console.error(`No default credit card found for user: ${userId}`);
      return res.status(400).json({
        success: false,
        message: "لا توجد بطاقة ائتمان معتمدة. يرجى إضافة بطاقة ائتمان من صفحة الإعدادات",
        code: "NO_CREDIT_CARD"
      });
    }

    // Calculate total amount
    const totalAmount = trip.cost * noOfSeats;
    
    // Verify credit card has sufficient balance
    if (creditCard.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `الرصيد غير كافي. المطلوب: ${totalAmount} ل.س، المتاح: ${creditCard.balance} ل.س`,
        code: "INSUFFICIENT_BALANCE"
      });
    }

    // Create booking with assigned seats
    const booking = new Booking({
      userEmail: userEmail,
      tripID: trip._id,
      passengers: passengers.map((p, index) => ({
        ...p,
        seatNumber: availableSeats[index],
      })),
      noOfSeats,
      assignedSeats: availableSeats,
      totalAmount,
      status: "confirmed",
      bookingType: "online",
      paymentStatus: "pending",
    });

    // Create payment record
    const payment = new Payment({
      bookingID: booking._id,
      user: userId,
      userEmail: userEmail,
      amount: totalAmount,
      currency: "SYP",
      status: "pending",
      paymentMethod: "credit_card",
      creditCard: creditCard._id,
      cardDetails: {
        brand: creditCard.brand,
        last4: creditCard.cardNumberLast4,
      },
    });

    // Only use transactions in production where replica set is configured
    const useTransactions = process.env.NODE_ENV === 'production';
    let session = null;

    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Save both booking and payment
      const saveOptions = useTransactions ? { session } : {};
      
      await booking.save(saveOptions);
      payment.bookingID = booking._id;
      await payment.save(saveOptions);

      // Update credit card balance
      creditCard.balance -= totalAmount;
      await creditCard.save(saveOptions);

      // Update trip's available seats
      trip.seatsAvailable -= noOfSeats;
      await trip.save(saveOptions);

      // Update booking with payment ID
      booking.paymentID = payment._id;
      booking.paymentStatus = "paid";
      await booking.save(saveOptions);

      // Update payment status
      payment.status = "completed";
      await payment.save(saveOptions);

      // Commit the transaction if using transactions
      if (useTransactions) {
        await session.commitTransaction();
      }
    } catch (error) {
      // If anything fails, abort the transaction if using transactions
      if (useTransactions && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // Clear any cached data that might be affected by this booking
    clearUserDashboardCache(userId);

    // Return success response
    const responseData = {
      success: true,
      message: "تم تأكيد الحجز بنجاح",
      data: {
        booking: {
          _id: booking._id,
          status: booking.status,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
          passengers: booking.passengers,
          assignedSeats: booking.assignedSeats,
          createdAt: booking.createdAt
        },
        creditCard: {
          balance: creditCard.balance,
          last4: creditCard.cardNumberLast4,
          brand: creditCard.brand,
        },
      },
    };

    console.log('Booking successful:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
  } catch (error) {
    console.error("Error booking trip:", error);
    res.status(500).json({
      success: false,
      message: "فشل في معالجة الحجز",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/Show-profile
 * @desc    Get user profile
 * @access  Private (User)
 */
router.get("/Show-profile", auth, customerOnly, async (req, res) => {
  try {
    // Get user ID from the request (trying different possible locations)
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in request",
      });
    }

    console.log("Looking for user with ID:", userId); // Debug log

    // Find customer by ID and exclude password from the response
    const customer = await Customer.findById(userId).select("-password -__v");

    if (!customer) {
      console.log("Customer not found with ID:", userId); // Debug log
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/user/Edit-profile
 * @desc    Update user profile
 * @access  Private (User)
 */
router.put( "/Edit-profile",
  [
    auth,
    customerOnly,
    check("firstName", "First name is required").optional().trim().notEmpty(),
    check("lastName", "Last name is required").optional().trim().notEmpty(),
    check("email", "Please include a valid email").optional().isEmail(),
    check("phone", "Please include a valid phone number")
      .optional()
      .trim()
      .notEmpty(),
    check("country", "Country is required").optional().trim().notEmpty(),
    check("age", "Please enter a valid age").optional().isInt({ min: 1 }),
    check("gender").optional().isIn(["male", "female"]),
    check(
      "currentPassword",
      "Current password is required when changing password"
    )
      .if((req) => req.body.newPassword)
      .notEmpty(),
    check("newPassword", "New password must be at least 6 characters long")
      .if((req) => req.body.newPassword)
      .isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Get user ID from the request (trying different possible locations)
      const userId = req.user?._id || req.user?.id || req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID not found in request",
        });
      }
      const updateData = { ...req.body };

      // If new password is provided, verify current password and hash the new one
      if (updateData.newPassword) {
        const customer = await Customer.findById(userId);

        // Verify current password
        const isMatch = await bcrypt.compare(
          updateData.currentPassword,
          customer.password
        );
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.newPassword, salt);

        // Remove fields we don't want to save
        delete updateData.newPassword;
        delete updateData.currentPassword;
      }

      // If email is being updated, check if it's already in use
      if (updateData.email) {
        const existingCustomer = await Customer.findOne({
          email: updateData.email,
          _id: { $ne: userId },
        });
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
      }

      // Update customer
      const updatedCustomer = await Customer.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password -__v");

      // Clear dashboard cache after profile update
      clearUserDashboardCache(userId);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedCustomer,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/user/confirmed-bookings
 * @desc    Get user's confirmed bookings
 * @access  Private (User)
 */
router.get("/confirmed-bookings", auth, customerOnly, async (req, res) => {
  try {
    // Get user ID from the request
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in request",
      });
    }

    // Find all confirmed bookings for the user
    const bookings = await Booking.aggregate([
      {
        $match: {
          userEmail: req.user.email,
          status: "confirmed"
        }
      },
      {
        $lookup: {
          from: "trips",
          localField: "tripID",
          foreignField: "_id",
          as: "trip"
        }
      },
      {
        $unwind: {
          path: "$trip",
          preserveNullAndEmptyArrays: true // Keep bookings even if trip is not found
        }
      },
      {
        $lookup: {
          from: "buses",
          localField: "trip.bus",
          foreignField: "_id",
          as: "trip.bus"
        }
      },
      {
        $unwind: {
          path: "$trip.bus",
          preserveNullAndEmptyArrays: true // Keep bookings even if bus is not found
        }
      },
      // First, get the companyID from the trip or bus
      {
        $addFields: {
          'trip.companyID': {
            $ifNull: [
              { $toInt: '$trip.companyID' },
              { $toInt: '$trip.bus.companyID' }
            ]
          }
        }
      },
      // Lookup company information using the numeric companyID
      {
        $lookup: {
          from: 'companies',
          let: { companyId: '$trip.companyID' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$companyID', { $toInt: '$$companyId' }]
                }
              }
            },
            {
              $project: {
                _id: 0,
                id: '$companyID',
                name: '$companyName',
                logo: 1
              }
            }
          ],
          as: 'companyInfo'
        }
      },
      // Add company information to the trip object
      {
        $addFields: {
          'trip.company': {
            $cond: {
              if: { $gt: [{ $size: '$companyInfo' }, 0] },
              then: { $arrayElemAt: ['$companyInfo', 0] },
              else: {
                id: null,
                name: 'Unknown Company',
                logo: null
              }
            }
          }
        }
      },
      // Remove the temporary companyInfo array
      { $project: { companyInfo: 0 } },
      {
        $project: {
          _id: 1,
          bookingId: '$_id',
          passengers: 1,
          totalAmount: 1,
          paymentStatus: 1,
          status: 1,
          bookingDate: 1,
          hasValidTrip: { $ifNull: ['$trip._id', false] },
          trip: {
            id: '$trip._id',
            companyID: '$trip.companyID',
            company: {
              id: '$trip.company.id',
              name: '$trip.company.name',
              logo: '$trip.company.logo'
            },
            busNumber: '$trip.busNumber',
            origin: '$trip.origin',
            destination: '$trip.destination',
            departureDate: '$trip.departureDate',
            departureTime: '$trip.departureTime',
            arrivalDate: '$trip.arrivalDate',
            arrivalTime: '$trip.arrivalTime',
            cost: '$trip.cost',
            status: '$trip.status',
            bus: {
              type: '$trip.bus.type',
              capacity: '$trip.bus.capacity'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Helper function to format currency
    const formatCurrency = (amount) => {
      if (amount == null) return '0';
      return new Intl.NumberFormat('ar-SY', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Format the response
    const formattedBookings = bookings.map((booking) => {
      if (!booking.hasValidTrip) {
        return {
          ...booking,
          trip: null,
          status: "invalid_trip",
          message: 'Trip information is no longer available'
        };
      }

      const formattedCost = formatCurrency(booking.trip.cost);
      
      return {
        bookingId: booking._id,
        trip: {
          id: booking.trip._id,
          companyID: booking.trip.companyID,
          company: booking.trip.company, // Include company data
          busNumber: booking.trip.busNumber,
          busType: booking.trip.bus?.type,
          capacity: booking.trip.bus?.capacity,
          origin: booking.trip.origin,
          destination: booking.trip.destination,
          departureDate: booking.trip.departureDate,
          departureTime: booking.trip.departureTime,
          arrivalDate: booking.trip.arrivalDate,
          arrivalTime: booking.trip.arrivalTime,
          cost: booking.trip.cost,
          formattedCost: formattedCost,
          status: booking.trip.status,
        },
        passengers: booking.passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          seatNumber: p.seatNumber,
          gender: p.gender,
        })),
        totalAmount: booking.totalAmount,
        formattedTotalAmount: formatCurrency(booking.totalAmount),
        paymentStatus: booking.paymentStatus,
        bookingDate: booking.createdAt,
        bookingStatus: booking.status
      };
    });

    // Log the first booking's data for debugging
    if (formattedBookings.length > 0) {
      console.log('First booking data (before sending):', JSON.stringify({
        booking: formattedBookings[0],
        trip: formattedBookings[0].trip,
        company: formattedBookings[0].trip?.company,
        companyID: formattedBookings[0].trip?.companyID
      }, null, 2));
    }

    const responseData = {
      success: true,
      count: formattedBookings.length,
      data: formattedBookings,
    };

    console.log('Sending response with data:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching confirmed trips:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching confirmed trips",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/user/cancel-booking/:bookingId
 * @desc    Cancel a booking (within 48 hours of departure)
 * @access  Private (User)
 */
router.put("/cancel-booking/:bookingId", auth, customerOnly, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in request",
      });
    }

    // 1. Find the booking with trip details
    const booking = await Booking.findById(bookingId).populate({
      path: "tripID",
      select: "departureDate departureTime seatsAvailable",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 2. Verify booking ownership
    if (booking.userEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking",
      });
    }

    // 3. Check if booking is already cancelled
    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is already cancelled",
      });
    }

    // 4. Check if trip is within 48 hours of departure
    const now = new Date();
    const departureTime = new Date(booking.tripID.departureDate);
    departureTime.setHours(
      parseInt(booking.tripID.departureTime.split(":")[0])
    );
    departureTime.setMinutes(
      parseInt(booking.tripID.departureTime.split(":")[1])
    );

    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture <= 48) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن إلغاء الحجز قبل 48 ساعة من موعد الرحلة",
        hoursUntilDeparture: Math.floor(hoursUntilDeparture),
      });
    }

    // 5. Calculate refund amount (90% of total amount)
    const refundAmount = Math.floor(booking.totalAmount * 0.9);
    console.log("Processing cancellation:", {
      bookingId: booking._id,
      originalAmount: booking.totalAmount,
      refundAmount,
      paymentStatus: booking.paymentStatus,
      hasPaymentId: !!booking.paymentID,
    });

    // 6. Update booking status to cancelled
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledBy = {
      type: "user",
      userId: userId,
      reason: (req.body && req.body.reason) || "User requested cancellation",
    };
    booking.refundStatus = "pending";
    booking.refundAmount = refundAmount;
    booking.refundRequestedAt = new Date();

    // 7. Update trip's available seats
    await Trip.findByIdAndUpdate(booking.tripID._id, {
      $inc: { seatsAvailable: booking.noOfSeats },
    });

    // 8. Process refund only if payment was made and payment record exists
    if (booking.paymentStatus === "paid" && booking.paymentID) {
      try {
        console.log("Processing refund for payment:", booking.paymentID);

        // Find the payment
        const payment = await Payment.findById(booking.paymentID);
        if (!payment) {
          console.log("Payment record not found, marking refund as failed");
          booking.refundStatus = "failed";
          booking.refundNotes = "Payment record not found";
          await booking.save();
          return res.status(200).json({
            success: true,
            message:
              "Booking cancelled successfully, but refund could not be processed",
            booking: {
              id: booking._id,
              status: booking.status,
              refundStatus: booking.refundStatus,
              refundNotes: booking.refundNotes,
            },
          });
        }

        // Process refund based on payment method
        if (payment.paymentMethod === "credit_card" && payment.creditCard) {
          // Find the credit card used for this payment
          const creditCard = await CreditCard.findById(payment.creditCard);
          if (!creditCard) {
            throw new Error("Credit card not found");
          }

          console.log("Processing refund to card:", {
            cardId: creditCard._id,
            currentBalance: creditCard.balance,
            refundAmount,
          });

          // Update the card's balance with 90% refund
          creditCard.balance = (creditCard.balance || 0) + refundAmount;
          await creditCard.save();

          // Update payment status
          payment.status = "refunded";
          payment.refundAmount = refundAmount;
          payment.refundedAt = new Date();
          await payment.save();

          // Update booking refund status
          booking.refundStatus = "processed";
          booking.refundProcessedAt = new Date();
          booking.refundPaymentMethod = "credit_card";
          booking.refundReference = `REF-${Date.now()}`;
        } else if (payment.paymentMethod === "cash") {
          // For cash payments, just mark as refunded
          payment.status = "refunded";
          payment.refundAmount = refundAmount;
          payment.refundedAt = new Date();
          await payment.save();

          booking.refundStatus = "processed";
          booking.refundProcessedAt = new Date();
          booking.refundPaymentMethod = "cash";
          booking.refundReference = `REF-${Date.now()}`;
        }
      } catch (error) {
        console.error("Refund processing error:", error);
        booking.refundStatus = "failed";
        booking.refundNotes = error.message;
      }
    } else {
      console.log(
        "No refund processing needed - payment not made or no payment record"
      );
      booking.refundStatus = "not_required";
      booking.refundNotes = "No payment was made for this booking";
    }

    // 9. Save the booking with updated status
    await booking.save();

    // 10. Return success response
    res.status(200).json({
      success: true,
      message: "تم إلغاء الحجز بنجاح",
      booking: {
        id: booking._id,
        status: booking.status,
        refundStatus: booking.refundStatus,
        refundAmount: booking.refundAmount,
        refundNotes: booking.refundNotes,
      },
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إلغاء الحجز",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/notifications/company-cancelled-trips
 * @desc    Get all company-cancelled trips for the logged-in user
 * @access  Private (User)
 */
router.get( "/notifications/company-cancelled-trips",
  auth,
  customerOnly,
  async (req, res) => {
    try {
      const userEmail = req.user.email;

      // Find all cancelled trips for this user
      const cancelledBookings = await Booking.find({
        userEmail: userEmail,
        bookingType: "online",
        status: "company-cancelled",
      })
        .populate(
          "tripID",
          "departureCity arrivalCity departureTime arrivalTime tripNumber"
        )
        .sort({ updatedAt: -1 }) // Most recent first
        .select(
          "_id passengers noOfSeats assignedSeats status paymentStatus totalAmount refundStatus refundNotes refundProcessedAt"
        );

      // Format the response
      const notifications = cancelledBookings.map((booking) => ({
        _id: booking._id, // This is the booking ID
        bookingId: booking._id, // Explicitly include booking ID
        tripId: booking.tripID?._id || booking.tripID, // Include trip ID (could be string or object)
        tripNumber: booking.tripID?.tripNumber,
        departureCity: booking.tripID?.departureCity,
        arrivalCity: booking.tripID?.arrivalCity,
        departureTime: booking.tripID?.departureTime,
        arrivalTime: booking.tripID?.arrivalTime,
        passengers: booking.passengers,
        noOfSeats: booking.noOfSeats,
        assignedSeats: booking.assignedSeats,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        refundStatus: booking.refundStatus,
        refundNotes: booking.refundNotes,
        processedAt: booking.refundProcessedAt,
        bookingDate: booking.createdAt,
      }));

      res.json({
        success: true,
        count: notifications.length,
        notifications,
      });
    } catch (error) {
      console.error("Error fetching cancelled trips:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch cancelled trips",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/user/notifications
 * @desc    Get user's notifications
 * @access  Private (User)
 */
router.get("/notifications", auth, customerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Notification.countDocuments({
      userEmail: req.user.email,
    });

    // Get paginated notifications
    const notifications = await Notification.find({
      userEmail: req.user.email,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   PUT /api/user/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (User)
 */
router.put("/notifications/:id/read", auth, customerOnly, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userEmail: req.user.email,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   PUT /api/user/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (User)
 */
router.put("/notifications/read-all", auth, customerOnly, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userEmail: req.user.email,
        isRead: false,
      },
      { isRead: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});



// Public route to get all trips with company info (no authentication required)
router.get("/trips/public", async (req, res) => {
  try {
    // Build trip query from filters
    const tripQuery = buildTripQuery(req.query);

    // Get filtered trips
    const trips = await Trip.find(tripQuery)
      .sort({ departureDate: 1, departureTime: 1 })
      .lean();

    // Get unique company IDs from the trips
    const companyIds = [...new Set(trips.map((trip) => trip.companyID))];

    // Get company information
    const companies = await Company.find(
      { companyID: { $in: companyIds } },
      "companyID companyName logo"
    ).lean();

    // Create a map for quick company lookup
    const companyMap = companies.reduce((acc, company) => {
      acc[company.companyID] = company;
      return acc;
    }, {});

    // Attach company info to each trip
    const tripsWithCompany = trips.map((trip) => ({
      ...trip,
      id: trip._id,
      company: companyMap[trip.companyID] || null,
    }));

    // Simple pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTrips = tripsWithCompany.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTrips,
      pagination: {
        total: tripsWithCompany.length,
        page: page,
        limit: limit,
        pages: Math.ceil(tripsWithCompany.length / limit),
      },
      filters: {
        applied: Object.keys(tripQuery).length > 1,
        active: {
          date: req.query.date || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
          origin: req.query.origin || null,
          destination: req.query.destination || null,
          minPrice: req.query.minPrice || null,
          maxPrice: req.query.maxPrice || null,
          busType: req.query.busType || null,
          company: req.query.company || null,
          timeOfDay: req.query.timeOfDay || null,
          minSeats: req.query.minSeats || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in public trips route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get available seats for a trip
router.get("/trips/:tripId/available-seats",
  auth,
  customerOnly,
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      // Get all booked seats for this trip
      const bookings = await Booking.find({ tripID: trip._id });
      const bookedSeats = bookings.reduce((acc, booking) => {
        return acc.concat(booking.seats);
      }, []);

      // Calculate available seats (total seats minus booked seats)
      const totalSeats = trip.totalSeats || 50; // Default to 50 seats if not specified
      const availableSeats = totalSeats - bookedSeats.length;

      res.json({
        success: true,
        data: {
          availableSeats,
          bookedSeats: bookedSeats.length,
          totalSeats,
        },
      });
    } catch (error) {
      console.error("Error getting available seats:", error);
      res.status(500).json({
        success: false,
        message: "Error getting available seats",
      });
    }
  }
);

/**
 * @route   DELETE /api/user/delete-credit-card/:cardId
 * @desc    Delete a credit card
 * @access  Private (User)
 */
router.delete("/delete-credit-card/:cardId", auth, customerOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { cardId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find the card to ensure it exists and belongs to the user
    console.log(`Looking for card ${cardId} for user ${userId}`);
    const card = await CreditCard.findOne({
      _id: cardId,
      user: userId,
    }).session(session);

    if (!card) {
      console.log('Card not found or does not belong to user');
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Credit card not found or you don't have permission to delete it",
      });
    }
    console.log('Found card:', { cardId: card._id, userId: card.user });

    // Remove the card ID from the customer's creditCards array
    console.log('Removing card from customer.creditCards array');
    const updateResult = await Customer.updateOne(
      { _id: userId },
      { $pull: { creditCards: cardId } },
      { session }
    );
    console.log('Update result:', updateResult);

    // If this was the default card, update the defaultPaymentMethod
    console.log('Checking if card was default payment method');
    const customer = await Customer.findById(userId).session(session);
    console.log('Customer defaultPaymentMethod:', customer.defaultPaymentMethod);
    if (customer.defaultPaymentMethod?.toString() === cardId) {
      console.log('Card was default payment method, updating to null');
      customer.defaultPaymentMethod = null;
      await customer.save({ session });
    }

    // Delete the card
    console.log('Deleting credit card document');
    const deleteResult = await CreditCard.deleteOne({ _id: cardId }).session(session);
    console.log('Delete result:', deleteResult);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Credit card deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting credit card:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete credit card",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/credit-cards/default
 * @desc    Get the user's default credit card
 * @access  Private (User)
 */
router.get("/credit-cards/default", auth, customerOnly, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log("Fetching default credit card for user:", userId);

    // First check if customer has any credit cards
    const customer = await Customer.findById(userId).populate("creditCards");
    console.log("Customer credit cards:", customer?.creditCards?.length || 0);

    if (!customer) {
      console.log("Customer not found");
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // If customer has no credit cards at all
    if (!customer.creditCards || customer.creditCards.length === 0) {
      console.log("Customer has no credit cards");
      return res.status(404).json({
        success: false,
        message: "No credit cards found for customer",
      });
    }

    // Get the default credit card
    const defaultCard = await CreditCard.findOne({
      user: userId,
      isDefault: true,
    }).select("-cardNumber -cvv -iv -cvvIv -__v");

    console.log("Default card found:", !!defaultCard);

    if (!defaultCard) {
      // If no default card is set but user has cards, set the first one as default
      const firstCard = await CreditCard.findOne({ user: userId })
        .select("-cardNumber -cvv -iv -cvvIv -__v")
        .sort({ createdAt: 1 });

      if (firstCard) {
        console.log("Setting first card as default");
        firstCard.isDefault = true;
        await firstCard.save();

        // Update user's defaultPaymentMethod
        user.defaultPaymentMethod = firstCard._id;
        await user.save();

        return res.json({
          success: true,
          message: "Default credit card set",
          data: firstCard,
        });
      }
    }

    if (!defaultCard) {
      console.log("No default card found and no cards to set as default");
      return res.status(404).json({
        success: false,
        message: "No default credit card found",
      });
    }

    res.json({
      success: true,
      data: defaultCard,
    });
  } catch (error) {
    console.error("Error fetching default credit card:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving default credit card",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/user/credit-cards/debug
 * @desc    Debug endpoint to check credit card status
 * @access  Private (User)
 */
router.get("/credit-cards/debug", auth, customerOnly, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log("Debug: Checking credit cards for user:", userId);

    // Get user with all credit cards
    const user = await User.findById(userId)
      .populate("creditCards")
      .populate("defaultPaymentMethod");

    console.log("Debug: User found:", !!user);
    console.log(
      "Debug: User credit cards array:",
      user?.creditCards?.length || 0
    );
    console.log(
      "Debug: User default payment method:",
      !!user?.defaultPaymentMethod
    );

    // Get all credit cards directly
    const allCards = await CreditCard.find({ user: userId })
      .select("-cardNumber -cvv -iv -cvvIv -__v")
      .lean();

    console.log("Debug: Direct credit card query count:", allCards.length);
    console.log(
      "Debug: Credit cards:",
      allCards.map((card) => ({
        id: card._id,
        last4: card.cardNumberLast4,
        isDefault: card.isDefault,
        brand: card.brand,
        balance: card.balance,
      }))
    );

    // Check if any card is marked as default
    const defaultCard = allCards.find((card) => card.isDefault);
    console.log("Debug: Default card found:", !!defaultCard);

    // If no default card but cards exist, set the first one as default
    if (!defaultCard && allCards.length > 0) {
      console.log("Debug: Setting first card as default");
      const firstCard = allCards[0];

      // Update the card
      await CreditCard.findByIdAndUpdate(firstCard._id, { isDefault: true });

      // Update user's default payment method
      await User.findByIdAndUpdate(userId, {
        defaultPaymentMethod: firstCard._id,
      });

      console.log("Debug: Default card set to:", firstCard._id);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user?._id,
          hasCreditCards: user?.creditCards?.length > 0,
          defaultPaymentMethod: user?.defaultPaymentMethod?._id,
        },
        creditCards: allCards,
        defaultCard: defaultCard || (allCards.length > 0 ? allCards[0] : null),
      },
    });
  } catch (error) {
    console.error("Debug: Error checking credit cards:", error);
    res.status(500).json({
      success: false,
      message: "Error checking credit cards",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/user/credit-cards/fix
 * @desc    Debug endpoint to fix credit card settings
 * @access  Private (User)
 */
router.post("/credit-cards/fix", auth, customerOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id || req.user.id;
    console.log("Fixing credit cards for user:", userId);

    // Get user with all credit cards
    const user = await User.findById(userId)
      .populate("creditCards")
      .populate("defaultPaymentMethod")
      .session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get all credit cards
    const allCards = await CreditCard.find({ user: userId }).session(session);
    console.log("Found credit cards:", allCards.length);

    if (allCards.length === 0) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "No credit cards found",
      });
    }

    // Find or set default card
    let defaultCard = allCards.find((card) => card.isDefault);
    if (!defaultCard) {
      console.log("No default card found, setting first card as default");
      defaultCard = allCards[0];
      defaultCard.isDefault = true;
      await defaultCard.save({ session });
    }

    // Update user's default payment method
    user.defaultPaymentMethod = defaultCard._id;
    await user.save({ session });

    // Update all cards' isDefault status
    await CreditCard.updateMany(
      { user: userId, _id: { $ne: defaultCard._id } },
      { $set: { isDefault: false } },
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();

    // Get updated card data
    const updatedCards = await CreditCard.find({ user: userId })
      .select("-cardNumber -cvv -iv -cvvIv -__v")
      .lean();

    res.json({
      success: true,
      message: "Credit card settings fixed",
      data: {
        defaultCard: updatedCards.find((card) => card.isDefault),
        allCards: updatedCards,
        userDefaultPaymentMethod: user.defaultPaymentMethod,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error fixing credit cards:", error);
    res.status(500).json({
      success: false,
      message: "Error fixing credit cards",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
});

// Get all active companies for filter
router.get("/companies/active", async (req, res) => {
  try {
    const companies = await Company.find(
      { status: "active" },
      "companyID companyName"
    )
      .sort({ companyName: 1 })
      .lean();

    res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Error fetching active companies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Export the router
module.exports = router;
