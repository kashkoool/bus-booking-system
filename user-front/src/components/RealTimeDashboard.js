import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { toast } from 'react-toastify';

const RealTimeDashboard = () => {
  const { isConnected, lastNewBooking, lastBookingUpdate } = useSocket();
  const [bookingActivity, setBookingActivity] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeTrips: 0
  });

  useEffect(() => {
    if (lastNewBooking) {
      // Add new booking to activity
      setBookingActivity(prev => [
        {
          id: lastNewBooking.bookingId,
          type: 'new_booking',
          tripId: lastNewBooking.tripId,
          userEmail: lastNewBooking.userEmail,
          amount: lastNewBooking.totalAmount,
          timestamp: lastNewBooking.timestamp
        },
        ...prev.slice(0, 9) // Keep only last 10 activities
      ]);

      // Update stats
      setStats(prev => ({
        ...prev,
        totalBookings: prev.totalBookings + 1,
        totalRevenue: prev.totalRevenue + lastNewBooking.totalAmount
      }));

      // Show notification
      toast.success(`حجز جديد: ${lastNewBooking.userEmail}`, {
        position: "top-left",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [lastNewBooking]);

  useEffect(() => {
    if (lastBookingUpdate) {
      // Add booking update to activity
      setBookingActivity(prev => [
        {
          id: `${lastBookingUpdate.bookingId}-update`,
          type: 'booking_update',
          tripId: lastBookingUpdate.tripId,
          seatsBooked: lastBookingUpdate.assignedSeats.length,
          seatsAvailable: lastBookingUpdate.seatsAvailable,
          timestamp: lastBookingUpdate.timestamp
        },
        ...prev.slice(0, 9) // Keep only last 10 activities
      ]);
    }
  }, [lastBookingUpdate]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SYP'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          لوحة التحكم الفورية
        </h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'متصل' : 'غير متصل'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">إجمالي الحجوزات</p>
              <p className="text-2xl font-bold text-blue-800">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-green-800">{formatAmount(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">الرحلات النشطة</p>
              <p className="text-2xl font-bold text-purple-800">{stats.activeTrips}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">النشاط الفوري</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {bookingActivity.length > 0 ? (
            bookingActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    activity.type === 'new_booking' ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {activity.type === 'new_booking' 
                        ? `حجز جديد من ${activity.userEmail}`
                        : `تحديث حجز - ${activity.seatsBooked} مقعد`
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      رحلة: {activity.tripId}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {activity.amount && (
                    <p className="text-sm font-medium text-green-600">
                      {formatAmount(activity.amount)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">لا يوجد نشاط حديث</p>
            </div>
          )}
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 text-sm">
              فقد الاتصال بالخادم. جاري إعادة الاتصال...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeDashboard; 