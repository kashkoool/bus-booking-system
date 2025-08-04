import React, { createContext, useContext, useEffect, useState } from 'react';
import socketManager from '../utils/socket';

const SocketContext = createContext();

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastBookingUpdate, setLastBookingUpdate] = useState(null);
  const [lastNewBooking, setLastNewBooking] = useState(null);
  const [bookingActivity, setBookingActivity] = useState([]);

  useEffect(() => {
    // Connect to socket when provider mounts
    socketManager.connect();

    // Update connection status
    const updateConnectionStatus = () => {
      setIsConnected(socketManager.getConnectionStatus());
    };

    // Set up connection status listeners
    if (socketManager.socket) {
      socketManager.socket.on('connect', updateConnectionStatus);
      socketManager.socket.on('disconnect', updateConnectionStatus);
    }

    // Set up booking update listeners
    socketManager.onBookingUpdated((data) => {
      setLastBookingUpdate(data);
      console.log('Booking updated:', data);
    });

    socketManager.onNewBooking((data) => {
      setLastNewBooking(data);
      setBookingActivity(prev => [
        {
          id: data.bookingId,
          type: 'new_booking',
          tripId: data.tripId,
          userEmail: data.userEmail,
          amount: data.totalAmount,
          timestamp: data.timestamp
        },
        ...prev.slice(0, 19) // Keep only last 20 activities
      ]);
      console.log('New booking:', data);
    });

    // Cleanup function
    return () => {
      socketManager.removeAllListeners();
    };
  }, []);

  const joinTrip = (tripId) => {
    socketManager.joinTrip(tripId);
  };

  const leaveTrip = (tripId) => {
    socketManager.leaveTrip(tripId);
  };

  const disconnect = () => {
    socketManager.disconnect();
  };

  const value = {
    isConnected,
    lastBookingUpdate,
    lastNewBooking,
    bookingActivity,
    joinTrip,
    leaveTrip,
    disconnect,
    socketManager
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 