import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const SocketErrorHandler = () => {
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Handle socket errors
    const handleSocketError = (event) => {
      const { type, message, data } = event.detail;
      
      console.error('Socket error:', { type, message, data });
      
      switch (type) {
        case 'connection-limit':
          toast.error(message, {
            position: "top-center",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        case 'room-limit':
          toast.warning(message, {
            position: "top-center",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        default:
          toast.error(message || 'Socket connection error', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
      }
      
      setErrorCount(prev => prev + 1);
    };

    // Handle socket warnings (instead of errors)
    const handleSocketWarning = (event) => {
      const { type, message, data } = event.detail;
      
      console.warn('Socket warning:', { type, message, data });
      
      switch (type) {
        case 'connection-warning':
          toast.warning(message, {
            position: "top-center",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        case 'room-warning':
          toast.warning(message, {
            position: "top-center",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        case 'room-timeout-warning':
          toast.warning(message, {
            position: "top-center",
            autoClose: 60000, // Show for 1 minute
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        default:
          toast.warning(message || 'Socket warning', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
      }
    };

    // Handle socket info
    const handleSocketInfo = (event) => {
      const { type, message, data } = event.detail;
      
      console.log('Socket info:', { type, message, data });
      
      switch (type) {
        case 'room-joined':
          toast.info(message, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        default:
          toast.info(message || 'Socket info', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
      }
    };

    // Handle socket blocked events
    const handleSocketBlocked = (event) => {
      const { type, message, reason, remainingTime, data } = event.detail;
      
      console.error('Socket blocked:', { type, message, reason, remainingTime, data });
      
      switch (type) {
        case 'user-blocked':
          toast.error(message, {
            position: "top-center",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
          
        default:
          toast.error(message || 'You have been blocked from booking', {
            position: "top-center",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
      }
    };

    // Add event listeners
    window.addEventListener('socket-error', handleSocketError);
    window.addEventListener('socket-warning', handleSocketWarning);
    window.addEventListener('socket-info', handleSocketInfo);
    window.addEventListener('socket-blocked', handleSocketBlocked);

    // Cleanup function
    return () => {
      window.removeEventListener('socket-error', handleSocketError);
      window.removeEventListener('socket-warning', handleSocketWarning);
      window.removeEventListener('socket-info', handleSocketInfo);
      window.removeEventListener('socket-blocked', handleSocketBlocked);
    };
  }, []);

  // Show error count in development
  if (process.env.NODE_ENV === 'development' && errorCount > 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        <strong className="font-bold">Socket Errors: </strong>
        <span className="block sm:inline">{errorCount}</span>
      </div>
    );
  }

  return null;
};

export default SocketErrorHandler; 