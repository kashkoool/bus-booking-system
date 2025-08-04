const express = require('express');
const router = express.Router();
const { predictDemand, predictMultipleRoutes, getDemandTrends } = require('../controllers/demandController');
const { auth } = require('../middleware/authMiddleware');
const { managerOnly, adminOnly } = require('../middleware/roleMiddleware');
const Trip = require('../models/Trip');

/**
 * @route   GET /api/demand/predict
 * @desc    Predict demand for a specific route and date
 * @access  Private (Manager/Admin)
 * @query   {string} origin - Starting point
 * @query   {string} destination - Destination
 * @query   {string} date - Date to predict for (YYYY-MM-DD)
 */
router.get('/predict', auth, managerOnly, async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    // Validate required parameters
    if (!origin || !destination || !date) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and date are required'
      });
    }

    // Validate date format
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Check if date is in the future
    if (targetDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in the future'
      });
    }

    const result = await predictDemand(origin, destination, targetDate);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in demand prediction route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/demand/predict-multiple
 * @desc    Predict demand for multiple routes
 * @access  Private (Manager/Admin)
 * @body    {Array} routes - Array of route objects with origin and destination
 * @body    {string} date - Date to predict for (YYYY-MM-DD)
 */
router.post('/predict-multiple', auth, managerOnly, async (req, res) => {
  try {
    const { routes, date } = req.body;

    // Validate required parameters
    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Routes array is required and must not be empty'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Validate each route
    for (const route of routes) {
      if (!route.origin || !route.destination) {
        return res.status(400).json({
          success: false,
          message: 'Each route must have origin and destination'
        });
      }
    }

    // Validate date format
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const result = await predictMultipleRoutes(routes, targetDate);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in multiple demand prediction route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/demand/trends
 * @desc    Get demand trends for a route over time
 * @access  Private (Manager/Admin)
 * @query   {string} origin - Starting point
 * @query   {string} destination - Destination
 * @query   {number} days - Number of days to analyze (default: 30)
 */
router.get('/trends', auth, managerOnly, async (req, res) => {
  try {
    const { origin, destination, days = 30 } = req.query;

    // Validate required parameters
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    // Validate days parameter
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days must be a number between 1 and 365'
      });
    }

    const result = await getDemandTrends(origin, destination, daysNum);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('Error in demand trends route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/demand/insights
 * @desc    Get general demand insights and statistics
 * @access  Private (Manager/Admin)
 */
router.get('/insights', auth, managerOnly, async (req, res) => {
  try {
    // This endpoint can provide general insights about demand patterns
    // For now, we'll return a basic structure
    res.json({
      success: true,
      insights: {
        message: 'Demand insights endpoint - ready for implementation',
        availableFeatures: [
          'Route-specific demand prediction',
          'Multi-route analysis',
          'Historical trend analysis',
          'Seasonal pattern detection'
        ]
      }
    });

  } catch (error) {
    console.error('Error in demand insights route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/demand/cities
 * @desc    Get all available cities (origins and destinations)
 * @access  Public
 */
router.get('/cities', async (req, res) => {
  try {
    // Get all unique origins and destinations from trips
    const origins = await Trip.distinct('origin');
    const destinations = await Trip.distinct('destination');
    
    // Combine and remove duplicates
    const allCities = [...new Set([...origins, ...destinations])];
    
    // Sort alphabetically
    allCities.sort();
    
    res.json({
      success: true,
      data: allCities,
      message: 'Cities retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities',
      error: error.message
    });
  }
});

module.exports = router; 