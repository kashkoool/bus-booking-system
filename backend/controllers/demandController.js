const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

/**
 * Predict demand for a specific route and date
 * @param {string} origin - Starting point
 * @param {string} destination - Destination
 * @param {Date} date - Date to predict for
 * @returns {Object} Prediction results
 */
const predictDemand = async (origin, destination, date) => {
  try {
    // Get the day of week (0 = Sunday, 6 = Saturday)
    // Convert JS getDay() (0=Sunday) to MongoDB $dayOfWeek (1=Sunday, 7=Saturday)
    const targetDayOfWeek = ((new Date(date).getDay() + 1) % 7) || 7;
    const targetDate = new Date(date);
    
    // Get historical data for the last 3 months for this route
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const historicalBookings = await Booking.aggregate([
      {
        $lookup: {
          from: 'trips',
          localField: 'tripID',
          foreignField: '_id',
          as: 'trip'
        }
      },
      {
        $unwind: '$trip'
      },
      {
        $match: {
          'trip.origin': origin,
          'trip.destination': destination,
          'trip.departureDate': { $gte: threeMonthsAgo },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$trip.departureDate' } },
            dayOfWeek: { $dayOfWeek: '$trip.departureDate' }
          },
          bookings: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // DEBUG: Log all historical bookings found
    console.log('--- Demand Prediction Debug ---');
    console.log('Route:', origin, '→', destination);
    console.log('Target date:', targetDate);
    console.log('Historical bookings:', historicalBookings);

    // Calculate average bookings for the same day of week
    const sameDayBookings = historicalBookings.filter(
      booking => booking._id.dayOfWeek === targetDayOfWeek
    );

    // DEBUG: Log same day bookings
    console.log('Same day bookings:', sameDayBookings);

    const avgBookings = sameDayBookings.length > 0 
      ? sameDayBookings.reduce((sum, day) => sum + day.bookings, 0) / sameDayBookings.length
      : 0;

    // Calculate trend (simple linear regression)
    const trend = calculateTrend(historicalBookings);

    // Apply seasonal factors
    const seasonalFactor = getSeasonalFactor(targetDate);
    
    // Final prediction
    const predictedDemand = Math.round(avgBookings * seasonalFactor * (1 + trend));

    // Get confidence level based on data availability
    const confidence = calculateConfidence(sameDayBookings.length, historicalBookings.length);

    // DEBUG: Log averages and factors
    console.log('Average bookings:', avgBookings);
    console.log('Trend:', trend);
    console.log('Seasonal factor:', seasonalFactor);

    // DEBUG: Log final prediction
    console.log('Final prediction:', {
      predictedDemand,
      confidence,
      dataPoints: historicalBookings.length,
      sameDayDataPoints: sameDayBookings.length
    });

    const prediction = {
      route: `${origin} → ${destination}`,
      date: targetDate.toISOString().split('T')[0],
      predictedBookings: Math.max(0, predictedDemand),
      averageBookings: Math.round(avgBookings),
      confidence: confidence,
      seasonalFactor: seasonalFactor,
      trend: trend,
      dataPoints: historicalBookings.length,
      sameDayDataPoints: sameDayBookings.length
    };

    return {
      success: true,
      data: {
        ...prediction,
        historicalData: {
          totalBookings: historicalBookings.reduce((sum, day) => sum + day.bookings, 0),
          averageRevenue: historicalBookings.length > 0 
            ? Math.round(historicalBookings.reduce((sum, day) => sum + day.totalAmount, 0) / historicalBookings.length)
            : 0,
          peakDay: findPeakDay(historicalBookings),
          lowDay: findLowDay(historicalBookings)
        }
      }
    };

  } catch (error) {
    console.error('Error predicting demand:', error);
    return {
      success: false,
      message: 'Failed to predict demand',
      error: error.message
    };
  }
};

/**
 * Calculate trend based on historical data
 */
const calculateTrend = (historicalData) => {
  if (historicalData.length < 2) return 0;
  
  // Simple trend calculation (positive = increasing, negative = decreasing)
  const recent = historicalData.slice(-7); // Last 7 data points
  const older = historicalData.slice(0, 7); // First 7 data points
  
  const recentAvg = recent.reduce((sum, day) => sum + day.bookings, 0) / recent.length;
  const olderAvg = older.reduce((sum, day) => sum + day.bookings, 0) / older.length;
  
  if (olderAvg === 0) return 0;
  return (recentAvg - olderAvg) / olderAvg;
};

/**
 * Get seasonal factor based on date
 */
const getSeasonalFactor = (date) => {
  const month = date.getMonth();
  const dayOfWeek = date.getDay();
  
  // Weekend factor (higher demand on weekends)
  const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
  
  // Seasonal factors (example: higher demand in summer months)
  let seasonalFactor = 1.0;
  if (month >= 5 && month <= 8) { // Summer months
    seasonalFactor = 1.2;
  } else if (month === 11 || month === 0) { // December/January
    seasonalFactor = 1.4; // Holiday season
  }
  
  return weekendFactor * seasonalFactor;
};

/**
 * Calculate confidence level
 */
const calculateConfidence = (sameDayDataPoints, totalDataPoints) => {
  if (totalDataPoints === 0) return 'Low';
  if (sameDayDataPoints === 0) return 'Low';
  
  const dataQuality = Math.min(sameDayDataPoints / 10, 1); // More data = higher confidence
  const consistency = totalDataPoints > 20 ? 0.9 : totalDataPoints > 10 ? 0.7 : 0.5;
  
  const confidence = (dataQuality + consistency) / 2;
  
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
};

/**
 * Find peak booking day
 */
const findPeakDay = (historicalData) => {
  if (historicalData.length === 0) return null;
  
  const peak = historicalData.reduce((max, day) => 
    day.bookings > max.bookings ? day : max
  );
  
  return {
    date: peak._id.date,
    bookings: peak.bookings
  };
};

/**
 * Find low booking day
 */
const findLowDay = (historicalData) => {
  if (historicalData.length === 0) return null;
  
  const low = historicalData.reduce((min, day) => 
    day.bookings < min.bookings ? day : min
  );
  
  return {
    date: low._id.date,
    bookings: low.bookings
  };
};

/**
 * Get demand predictions for multiple routes
 */
const predictMultipleRoutes = async (routes, date) => {
  const predictions = [];
  
  for (const route of routes) {
    const prediction = await predictDemand(route.origin, route.destination, date);
    if (prediction.success) {
      predictions.push(prediction.prediction);
    }
  }
  
  return {
    success: true,
    predictions: predictions.sort((a, b) => b.predictedBookings - a.predictedBookings)
  };
};

/**
 * Get demand trends for a route over time
 */
const getDemandTrends = async (origin, destination, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const historicalBookings = await Booking.aggregate([
      {
        $lookup: {
          from: 'trips',
          localField: 'tripID',
          foreignField: '_id',
          as: 'trip'
        }
      },
      {
        $unwind: '$trip'
      },
      {
        $match: {
          'trip.origin': origin,
          'trip.destination': destination,
          'trip.departureDate': { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$trip.departureDate' } }
          },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return {
      success: true,
      trends: historicalBookings.map(day => ({
        date: day._id.date,
        bookings: day.bookings
      }))
    };

  } catch (error) {
    console.error('Error getting demand trends:', error);
    return {
      success: false,
      message: 'Failed to get demand trends',
      error: error.message
    };
  }
};

module.exports = {
  predictDemand,
  predictMultipleRoutes,
  getDemandTrends
}; 