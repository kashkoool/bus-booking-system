import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Initialize notification state from localStorage
  const [notificationState, setNotificationState] = useState(() => {
    if (typeof window === 'undefined') return { read: new Set(), deleted: new Set() };
    const stored = localStorage.getItem('notificationState');
    const parsed = stored ? JSON.parse(stored) : { read: [], deleted: [] };
    return {
      read: new Set(parsed.read || []),
      deleted: new Set(parsed.deleted || [])
    };
  });

  // Memoize fetchNotifications to prevent unnecessary re-renders
  const memoizedFetchNotifications = useCallback(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        let notifications = [];
        
        // Handle notifications based on user role
        if (user.role === 'manager') {
          // For managers, use the company notifications endpoint
          try {
            const response = await axios.get(
              `http://localhost:5001/api/company/notifications`,
              { 
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                // Don't throw error for 404, just return empty array
                validateStatus: status => status < 500
              }
            );
            // Handle both response formats: notifications array or data.notifications
            notifications = response.data.notifications || response.data.data?.notifications || response.data.docs || [];
            console.log('Raw notifications from API:', notifications);
          } catch (error) {
            console.warn("Manager notifications not available:", error.message);
            notifications = [];
          }
        } else if (user.role === 'staff') {
          // For staff, use the staff notifications endpoint
          try {
            const response = await axios.get(
              `http://localhost:5001/api/staff/notifications`,
              { 
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                // Don't throw error for 404, just return empty array
                validateStatus: status => status < 500
              }
            );
            // Handle both response formats: notifications array or data.notifications
            notifications = response.data.notifications || response.data.data?.notifications || response.data.docs || [];
            console.log('Raw staff notifications from API:', notifications);
          } catch (error) {
            console.warn("Staff notifications not available:", error.message);
            notifications = [];
          }
        } else {
          // For regular users, use the user notifications endpoint
          const response = await axios.get(
            "http://localhost:5001/api/user/notifications/company-cancelled-trips",
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          notifications = response.data.notifications || [];
        }

        // Process each notification
        const notificationsWithDetails = notifications
          .filter(notification => !notificationState.deleted.has(notification._id?.toString()))
          .map(notification => {
              const passenger = notification.passengers?.[0] || {};
              const processedAt = notification.processedAt 
                ? new Date(notification.processedAt) 
                : new Date(notification.bookingDate || notification.createdAt || Date.now());

              // For manager/staff notifications, use the backend's isRead status
              // since the backend automatically marks them as read when fetched
              const isRead = user.role === 'manager' || user.role === 'staff' 
                ? notification.isRead || false
                : notificationState.read.has(notification._id?.toString() || '');

              return {
                ...notification,
                message: notification.message || 'تم إلغاء حجز رحلتك',
                isRead: isRead,
                type: notification.type || 'trip_cancellation',
                createdAt: notification.processedAt || notification.bookingDate || new Date().toISOString(),
                formattedDate: processedAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }),
                passengerName: `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim() || 'مسافر',
                seatNumber: passenger.seatNumber || 'غير محدد',
                amount: notification.totalAmount ? `${notification.totalAmount} ر.س` : 'غير محدد',
                refundStatus: notification.refundStatus || 'مكتمل',
                bookingId: notification.bookingId || notification._id,
                tripId: notification.tripId
              };
            });

        setNotifications(notificationsWithDetails);
        
        // For manager/staff, count unread based on backend isRead status
        // For regular users, use local storage logic
        const unreadCount = user.role === 'manager' || user.role === 'staff'
          ? notificationsWithDetails.filter(n => !n.isRead).length
          : notificationsWithDetails.filter(n => !notificationState.read.has(n._id?.toString() || '')).length;
        

        setUnreadCount(unreadCount);

        // For managers, don't automatically mark notifications as read
        // Let them stay unread until user clicks on them or removes them
      } catch (error) {
        console.error("Error fetching notifications:", error);
        // Don't show error for 403 as it's expected for some roles
        if (error.response?.status !== 403) {
          console.error("Error details:", error.response?.data || error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    return fetchNotifications;
  }, [user, notificationState]);

  // Fetch notifications when component mounts or user changes
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = memoizedFetchNotifications();
    fetchNotifications();
    
    // Set up polling for real-time updates - reduced frequency to 5 minutes
    const interval = setInterval(fetchNotifications, 300000); // Poll every 5 minutes instead of 60 seconds
    
    // Cleanup function to clear interval
    return () => {
      clearInterval(interval);
    };
  }, [memoizedFetchNotifications, user]);

  // Save notification state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('notificationState', JSON.stringify({
      read: Array.from(notificationState.read),
      deleted: Array.from(notificationState.deleted)
    }));
  }, [notificationState]);

  const markAsRead = async (notificationId) => {
    try {
      // For manager/staff, update both UI and local state
      if (user.role === 'manager' || user.role === 'staff') {
        // Update local state to persist the read status
        const updatedState = {
          ...notificationState,
          read: new Set([...notificationState.read, notificationId])
        };
        setNotificationState(updatedState);
        
        // Update UI immediately
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        
        // Note: Backend auto-marks notifications as read when fetched, so no need for separate call
        return;
      }

      // For regular users, update local state and storage
      const updatedState = {
        ...notificationState,
        read: new Set([...notificationState.read, notificationId])
      };
      
      setNotificationState(updatedState);
      
      // Update UI
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = () => {
    try {
      // Mark all current notifications as read
      const updatedState = {
        ...notificationState,
        read: new Set([...notificationState.read, ...notifications.map(n => n._id)])
      };
      
      setNotificationState(updatedState);
      
      // Update UI
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const removeNotification = (notificationId, e) => {
    e.stopPropagation(); // Prevent triggering markAsRead
    try {
      // Add to deleted set
      const updatedState = {
        ...notificationState,
        deleted: new Set([...notificationState.deleted, notificationId])
      };
      
      setNotificationState(updatedState);
      
      // Update UI
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => prev - (notificationState.read.has(notificationId) ? 0 : 1));
    } catch (error) {
      console.error("Error removing notification:", error);
    }
  };

  const clearAllNotifications = () => {
    try {
      // Add all notifications to deleted set
      const updatedState = {
        read: new Set(notificationState.read),
        deleted: new Set([...notificationState.deleted, ...notifications.map(n => n._id)])
      };
      
      setNotificationState(updatedState);
      
      // Update UI
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "trip_cancellation":
        return "🚫";
      case "booking_confirmation":
        return "✅";
      case "payment":
        return "💰";
      default:
        return "📢";
    }
  };

  const formatNotificationMessage = (notification) => {
    if (notification.type === 'trip_cancellation') {
      const statusText = 'مكتمل';
      const refundAmount = notification.amount || '0 ر.س';
      
      return (
        <div className="space-y-2">
          <div className="bg-red-50 border border-red-100 p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-semibold text-red-800">
                {notification.message}
              </h4>
              <span className="text-xs text-gray-500">
                {notification.formattedDate}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-xs text-gray-500">المسافر</span>
                    <span className="font-medium">{notification.passengerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">رقم المقعد</span>
                    <span className="font-medium">{notification.seatNumber}</span>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <div>
                    <span className="block text-xs text-gray-500">المبلغ المسترد</span>
                    <span className="font-medium text-green-600">{refundAmount}</span>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {statusText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <p className="text-sm text-gray-600 mt-1">{notification.message}</p>;
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">الإشعارات</h3>
              <div className="flex space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                    title="حذف الكل"
                  >
                    حذف الكل
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                جاري تحميل الإشعارات...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer group relative ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <button
                    onClick={(e) => removeNotification(notification._id, e)}
                    className="absolute left-2 top-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف الإشعار"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-800">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      {formatNotificationMessage(notification)}
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.formattedDate}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
