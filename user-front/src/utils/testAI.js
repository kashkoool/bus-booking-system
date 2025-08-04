// Test file to verify ML5.js is working
export const testML5 = async () => {
  try {
    console.log('Testing ML5.js...');
    
    // Check if ML5 is available
    // eslint-disable-next-line no-undef
    if (typeof ml5 === 'undefined') {
      console.error('ML5.js is not loaded!');
      return false;
    }
    
    console.log('ML5.js is loaded successfully!');
    // eslint-disable-next-line no-undef
    console.log('Available ML5.js functions:', Object.keys(ml5));
    
    // Check if neuralNetwork function exists
    // eslint-disable-next-line no-undef
    if (typeof ml5.neuralNetwork !== 'function') {
      console.error('ml5.neuralNetwork is not a function!');
      // eslint-disable-next-line no-undef
      console.log('Available functions:', Object.keys(ml5));
      return false;
    }
    
    console.log('ml5.neuralNetwork function is available!');
    
    // Create a neural network model for regression
    // eslint-disable-next-line no-undef
    const model = ml5.neuralNetwork({
      task: 'regression',
      debug: true
    });
    
    // Test data
    const testData = [
      { input: { x: 0, y: 1 }, output: { value: 10 } },
      { input: { x: 1, y: 1 }, output: { value: 15 } },
      { input: { x: 2, y: 1 }, output: { value: 20 } },
      { input: { x: 3, y: 1 }, output: { value: 25 } },
      { input: { x: 4, y: 1 }, output: { value: 30 } }
    ];
    
    console.log('Adding training data to model...');
    
    // Add training data
    testData.forEach(data => {
      model.addData(data.input, data.output);
    });
    
    console.log('Training neural network model...');
    
    // Train the model
    await new Promise((resolve, reject) => {
      model.train({
        epochs: 10,
        batchSize: 2
      }, () => {
        console.log('Test neural network model trained successfully!');
        resolve();
      });
    });
    
    console.log('Making test prediction...');
    
    // Test prediction
    const prediction = await new Promise((resolve, reject) => {
      model.predict({ x: 5, y: 1 }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result[0].value);
        }
      });
    });
    
    console.log('Test prediction:', prediction);
    console.log('ML5.js neural network test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('ML5.js test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}; 