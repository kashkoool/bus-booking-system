import React from 'react';

const TestPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-800 mb-4">✅ Test Page Working!</h1>
        <p className="text-green-700">If you can see this, routing is working correctly.</p>
        <p className="text-sm text-gray-600 mt-2">Current URL: {window.location.href}</p>
      </div>
    </div>
  );
};

export default TestPage; 