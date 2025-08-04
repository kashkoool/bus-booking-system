// AI-powered demand prediction using ML5.js
class AIPredictionService {
  constructor() {
    this.model = null;
    this.isModelReady = false;
    this.isML5Available = false;
  }

  // Check if ML5.js is available
  checkML5Availability() {
    // eslint-disable-next-line no-undef
    this.isML5Available = typeof ml5 !== 'undefined' && ml5.neuralNetwork;
    return this.isML5Available;
  }

  // Initialize the ML model
  async initializeModel() {
    try {
      if (!this.checkML5Availability()) {
        console.warn('ML5.js is not available, falling back to statistical methods');
        this.isModelReady = false;
        return false;
      }

      // Create a neural network model for regression
      // eslint-disable-next-line no-undef
      this.model = ml5.neuralNetwork({
        task: 'regression',
        debug: true
      });
      this.isModelReady = true;
      console.log('ML5.js neural network model initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing ML5.js model:', error);
      this.isModelReady = false;
      return false;
    }
  }

  // Prepare training data from trends
  prepareTrainingData(trends) {
    if (!trends || trends.length === 0) {
      return [];
    }

    return trends.map((trend, index) => ({
      input: {
        index: index / trends.length, // Normalize index
        dayOfWeek: trend.dayOfWeek / 6, // Normalize day of week (0-6)
        isHoliday: trend.isHoliday ? 1 : 0
      },
      output: {
        bookings: trend.averageBookings / 100 // Normalize bookings (assuming max ~100)
      }
    }));
  }

  // Train the model with historical data
  async trainModel(trends) {
    if (!this.isModelReady || !this.checkML5Availability()) {
      console.warn('Model not ready or ML5.js not available');
      return false;
    }

    try {
      const trainingData = this.prepareTrainingData(trends);
      
      if (trainingData.length < 3) {
        console.warn('Insufficient training data, need at least 3 data points');
        return false;
      }

      // Add training data to the model
      trainingData.forEach(data => {
        this.model.addData(data.input, data.output);
      });

      // Train the model
      return new Promise((resolve, reject) => {
        this.model.train({
          epochs: 50,
          batchSize: 4
        }, () => {
          console.log('Neural network model trained successfully with', trainingData.length, 'data points');
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Error training model:', error);
      return false;
    }
  }

  // Make AI prediction
  async predict(trends, route, date) {
    try {
      // Check if ML5.js is available
      if (!this.checkML5Availability()) {
        console.log('ML5.js not available, using statistical prediction');
        return this.statisticalPrediction(trends, route, date);
      }

      // Initialize model if not ready
      if (!this.isModelReady) {
        const initialized = await this.initializeModel();
        if (!initialized) {
          return this.statisticalPrediction(trends, route, date);
        }
      }

      // Train model with trends data
      const trained = await this.trainModel(trends);
      if (!trained) {
        return this.statisticalPrediction(trends, route, date);
      }

      // Prepare input for prediction
      const dayOfWeek = new Date(date).getDay();
      const isHoliday = this.isHoliday(date);
      const inputIndex = trends.length; // Next index after training data

      // Make prediction
      return new Promise((resolve, reject) => {
        this.model.predict({
          index: inputIndex / (trends.length + 1), // Normalize index
          dayOfWeek: dayOfWeek / 6, // Normalize day of week
          isHoliday: isHoliday ? 1 : 0
        }, (error, result) => {
          if (error) {
            console.error('AI prediction error:', error);
            resolve(this.statisticalPrediction(trends, route, date));
          } else {
            // Denormalize the prediction
            const aiPrediction = Math.max(0, Math.round(result[0].bookings * 100));
            const confidence = this.calculateAIConfidence(trends);
            
            resolve({
              prediction: aiPrediction,
              confidence: confidence,
              method: 'AI (ML5.js Neural Network)',
              details: {
                aiPrediction: aiPrediction,
                statisticalPrediction: this.statisticalPrediction(trends, route, date).prediction,
                confidence: confidence
              }
            });
          }
        });
      });

    } catch (error) {
      console.error('Error in AI prediction:', error);
      return this.statisticalPrediction(trends, route, date);
    }
  }

  // Statistical prediction as fallback
  statisticalPrediction(trends, route, date) {
    if (!trends || trends.length === 0) {
      return {
        prediction: 0,
        confidence: 'Low',
        method: 'Statistical (No Data)',
        details: {
          aiPrediction: 0,
          statisticalPrediction: 0,
          confidence: 'Low'
        }
      };
    }

    const dayOfWeek = new Date(date).getDay();
    const isHoliday = this.isHoliday(date);
    
    // Find relevant trends
    const relevantTrends = trends.filter(trend => 
      trend.dayOfWeek === dayOfWeek && trend.isHoliday === isHoliday
    );

    if (relevantTrends.length === 0) {
      // Use overall average if no specific day trends
      const average = Math.round(trends.reduce((sum, trend) => sum + trend.averageBookings, 0) / trends.length);
      return {
        prediction: average,
        confidence: 'Medium',
        method: 'Statistical (Average)',
        details: {
          aiPrediction: average,
          statisticalPrediction: average,
          confidence: 'Medium'
        }
      };
    }

    // Calculate weighted average
    const totalBookings = relevantTrends.reduce((sum, trend) => sum + trend.totalBookings, 0);
    const totalTrips = relevantTrends.reduce((sum, trend) => sum + trend.tripCount, 0);
    const prediction = totalTrips > 0 ? Math.round(totalBookings / totalTrips) : 0;

    return {
      prediction: prediction,
      confidence: 'Medium',
      method: 'Statistical (Weighted Average)',
      details: {
        aiPrediction: prediction,
        statisticalPrediction: prediction,
        confidence: 'Medium'
      }
    };
  }

  // Calculate AI confidence based on data quality
  calculateAIConfidence(trends) {
    if (!trends || trends.length < 5) return 'Low';
    if (trends.length < 10) return 'Medium';
    return 'High';
  }

  // Check if date is a holiday (simplified)
  isHoliday(date) {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Weekend
  }
}

export default AIPredictionService; 