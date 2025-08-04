// Utility to disable Hot Module Replacement temporarily
// This helps prevent infinite re-renders during development

const disableHMR = () => {
  if (process.env.NODE_ENV === 'development') {
    // Disable HMR for specific modules that cause issues
    if (module.hot) {
      module.hot.decline();
    }
  }
};

// Disable HMR for socket-related modules
if (typeof module !== 'undefined' && module.hot) {
  module.hot.decline('./src/utils/socket.js');
  module.hot.decline('./src/components/RealTimeBooking.js');
  module.hot.decline('./src/pages/Booking.js');
}

export default disableHMR; 