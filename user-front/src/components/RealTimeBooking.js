import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'react-toastify';

const RealTimeBooking = ({ tripId, initialSeatsAvailable, onSeatsUpdate }) => {
  const { isConnected, lastBookingUpdate, joinTrip, leaveTrip } = useSocket();
  const [seatsAvailable, setSeatsAvailable] = useState(initialSeatsAvailable || 0);
  const [recentBookings, setRecentBookings] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const lastNotifiedBookingId = useRef(null);
  const prevSeatsAvailableRef = useRef();
  const renderCount = useRef(0);

  // Remove all debug logging to prevent excessive console output
  // const debugLog = useCallback(() => {
  //   renderCount.current++;
  //   if (renderCount.current % 50 === 0) {
  //     console.log('RealTimeBooking render:', renderCount.current, 'tripId:', tripId, 'seatsAvailable:', seatsAvailable);
  //   }
  // }, [tripId, seatsAvailable]);

  // Call debug log on every render
  // debugLog();

  // Update seats when initialSeatsAvailable prop changes
  useEffect(() => {
    if (initialSeatsAvailable !== seatsAvailable) {
      setSeatsAvailable(initialSeatsAvailable || 0);
    }
  }, [initialSeatsAvailable, seatsAvailable]);

  // Optimized connection status check - only run once on mount
  useEffect(() => {
    const checkConnection = () => {
      const socketManager = require('../utils/socket').default;
      const status = socketManager.getConnectionStatus();
      setConnectionStatus(status);
    };
    
    // Check immediately and once more after a delay
    checkConnection();
    const timeoutId = setTimeout(checkConnection, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Memoized trip join/leave functions
  const handleJoinTrip = useCallback(() => {
    if (tripId) {
      joinTrip(tripId);
    }
  }, [tripId, joinTrip]);

  const handleLeaveTrip = useCallback(() => {
    if (tripId) {
      leaveTrip(tripId);
    }
  }, [tripId, leaveTrip]);

  useEffect(() => {
    handleJoinTrip();
    return () => {
      handleLeaveTrip();
    };
  }, [handleJoinTrip, handleLeaveTrip]);

  // Optimized real-time update effect
  useEffect(() => {
    if (lastBookingUpdate && lastBookingUpdate.tripId === tripId) {
      // Only show toast if this bookingId is new
      if (lastNotifiedBookingId.current !== lastBookingUpdate.bookingId) {
        toast.info(`تم حجز ${lastBookingUpdate.assignedSeats.length} مقعد جديد`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        lastNotifiedBookingId.current = lastBookingUpdate.bookingId;
      }
      
      // Only update state if seats actually changed
      if (lastBookingUpdate.seatsAvailable !== seatsAvailable) {
        setSeatsAvailable(lastBookingUpdate.seatsAvailable);
      }
      
      setRecentBookings(prev => {
        const newId = `${lastBookingUpdate.bookingId}-${lastBookingUpdate.timestamp}`;
        // Only add if not already present
        if (prev.some(b => b.id === newId)) return prev;
        return [
          {
            id: newId,
            seats: lastBookingUpdate.assignedSeats,
            timestamp: lastBookingUpdate.timestamp
          },
          ...prev.slice(0, 4)
        ];
      });
      
      // Only call parent callback if seatsAvailable actually changed
      if (onSeatsUpdate && lastBookingUpdate.seatsAvailable !== prevSeatsAvailableRef.current) {
        onSeatsUpdate(lastBookingUpdate.seatsAvailable);
        prevSeatsAvailableRef.current = lastBookingUpdate.seatsAvailable;
      }
    }
  }, [lastBookingUpdate, tripId, onSeatsUpdate, seatsAvailable]);

  // Memoize the main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => {
    if (initialSeatsAvailable <= 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Status */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">الحالة الحالية</h4>
          <div className="text-2xl font-bold text-blue-600">
            {seatsAvailable} مقعد متاح
          </div>
          <p className="text-sm text-blue-600 mt-1">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </p>
        </div>
        {/* Recent Bookings */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">الحجوزات الأخيرة</h4>
          {recentBookings.length > 0 ? (
            <div className="space-y-2">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex justify-between items-center text-sm">
                  <span className="text-green-700">
                    {booking.seats.length} مقعد
                  </span>
                  <span className="text-green-600">
                    {new Date(booking.timestamp).toLocaleTimeString('ar-SA')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600 text-sm">لا توجد حجوزات حديثة</p>
          )}
        </div>
      </div>
    );
  }, [seatsAvailable, recentBookings, initialSeatsAvailable]);

  // Memoize connection warning
  const connectionWarning = useMemo(() => {
    if (connectionStatus) return null;
    
    return (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-800 text-sm">
            لا يمكن الاتصال بالخادم. قد لا تتلقى التحديثات الفورية.
          </span>
        </div>
      </div>
    );
  }, [connectionStatus]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {mainContent}
      {connectionWarning}
    </div>
  );
};

export default RealTimeBooking; 