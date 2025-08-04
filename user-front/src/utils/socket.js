import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.pingInterval = null;
    this.roomTimeout = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.lastConnectionLog = 0;
    this.connectionLogThrottle = 5000; // Only log connection status every 5 seconds
  }

  // Connect to Socket.IO server
  connect() {
    if (this.socket && this.isConnected) {
      return; // Already connected
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    
    // Get user data from localStorage
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Validate token before sending
    const validToken = token && token !== 'null' && token !== 'undefined' && token.trim() !== '' ? token : null;
    
    // Only send userId if we have a valid token
    const validUserId = validToken ? (user._id || user.id || null) : null;
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced from 5 to 3
      reconnectionDelay: 2000, // Increased from 1000 to 2000ms
      timeout: 20000,
      auth: {
        // Add user authentication if available
        userId: validUserId,
        token: validToken
      }
    });

    this.socket.on('connect', () => {
      const now = Date.now();
      if (now - this.lastConnectionLog > this.connectionLogThrottle) {
        this.lastConnectionLog = now;
      }
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.triggerConnectionUpdate();
      this.startPingInterval();
    });

    this.socket.on('disconnect', (reason) => {
      const now = Date.now();
      if (now - this.lastConnectionLog > this.connectionLogThrottle) {
        this.lastConnectionLog = now;
      }
      this.isConnected = false;
      this.triggerConnectionUpdate();
      this.stopPingInterval();
      
      // Handle connection limits
      if (reason === 'io server disconnect') {
        // Don't immediately reconnect to avoid loops
        setTimeout(() => {
          if (this.socket && !this.isConnected) {
            this.socket.connect();
          }
        }, 3000); // Increased from 2000 to 3000ms
      }
    });

    this.socket.on('connect_error', (error) => {
      const now = Date.now();
      if (now - this.lastConnectionLog > this.connectionLogThrottle) {
        this.lastConnectionLog = now;
      }
      this.isConnected = false;
      this.triggerConnectionUpdate();
      this.stopPingInterval();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      const now = Date.now();
      if (now - this.lastConnectionLog > this.connectionLogThrottle) {
        this.lastConnectionLog = now;
      }
      this.isConnected = true;
      this.triggerConnectionUpdate();
      this.startPingInterval();
    });

    this.socket.on('reconnect_error', (error) => {
      const now = Date.now();
      if (now - this.lastConnectionLog > this.connectionLogThrottle) {
        this.lastConnectionLog = now;
      }
      this.isConnected = false;
      this.triggerConnectionUpdate();
    });

    // Handle connection warning (instead of error)
    this.socket.on('connection-warning', (data) => {
      // Show user-friendly warning
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('socket-warning', {
          detail: {
            type: 'connection-warning',
            message: data.message,
            data
          }
        }));
      }
    });

    // Handle room warning (instead of error)
    this.socket.on('room-warning', (data) => {
      // Show user-friendly warning
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('socket-warning', {
          detail: {
            type: 'room-warning',
            message: data.message,
            data
          }
        }));
      }
    });

    // Handle successful room join
    this.socket.on('room-joined', (data) => {
      // Set up room timeout warning
      this.setupRoomTimeout(data.timeoutMinutes);
      
      // Show user info about room limits
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('socket-info', {
          detail: {
            type: 'room-joined',
            message: `Connected to trip room. You will be automatically disconnected after ${data.timeoutMinutes} minutes of inactivity.`,
            data
          }
        }));
      }
    });

    // Listen for test responses
    this.socket.on('test-response', (data) => {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        // Reduced logging frequency
      }
    });

    // Listen for pong responses (reduced logging)
    this.socket.on('pong', () => {
      // Only log pong in development and occasionally
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Reduced from 0.05 to 0.01
        // console.log('🏓 Received pong from server');
      }
    });

    // Handle user blocked event
    this.socket.on('user-blocked', (data) => {
      this.isConnected = false;
      this.triggerConnectionUpdate();
      
      // Show user-friendly blocking message
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('socket-blocked', {
          detail: {
            type: 'user-blocked',
            message: data.message,
            reason: data.reason,
            remainingTime: data.remainingTime,
            data
          }
        }));
      }
    });

    // Check initial connection status after a short delay
    setTimeout(() => {
      const connected = this.socket.connected;
      this.isConnected = connected;
      this.triggerConnectionUpdate();
    }, 500);
  }

  // Start ping interval to keep connection alive
  startPingInterval() {
    this.stopPingInterval(); // Clear any existing interval
    
    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
        // Reduced ping logging
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) { // Reduced from 0.05 to 0.02
          // console.log('🏓 Sending ping to server');
        }
      }
    }, 60000); // Increased from 30 seconds to 60 seconds to reduce traffic
  }

  // Stop ping interval
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Setup room timeout warning
  setupRoomTimeout(timeoutMinutes) {
    // Clear any existing timeout
    if (this.roomTimeout) {
      clearTimeout(this.roomTimeout);
    }
    
    // Set warning 1 minute before timeout
    const warningTime = (timeoutMinutes - 1) * 60 * 1000;
    
    this.roomTimeout = setTimeout(() => {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('socket-warning', {
          detail: {
            type: 'room-timeout-warning',
            message: 'You will be disconnected from the trip room in 1 minute due to inactivity.',
            timeoutMinutes
          }
        }));
      }
    }, warningTime);
  }

  // Trigger connection status update
  triggerConnectionUpdate() {
    // Only log connection updates occasionally to reduce spam
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      // console.log('🔄 Triggering connection update. isConnected:', this.isConnected);
    }
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('socket-connection-change', {
      detail: { isConnected: this.isConnected }
    }));
  }

  // Get connection status
  getConnectionStatus() {
    // Also check the actual socket connection status
    const actualConnected = this.socket ? this.socket.connected : false;
    // Only log connection status checks occasionally
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      // console.log('🔍 getConnectionStatus - isConnected:', this.isConnected, 'socket.connected:', actualConnected);
    }
    return this.isConnected && actualConnected;
  }

  // Disconnect from Socket.IO server
  disconnect() {
    this.stopPingInterval();
    if (this.roomTimeout) {
      clearTimeout(this.roomTimeout);
      this.roomTimeout = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      this.joinedRooms.clear();
    }
  }

  // Track joined rooms to prevent duplicates
  joinedRooms = new Set();

  // Join a trip room for real-time updates
  joinTrip(tripId) {
    if (this.socket && this.isConnected && !this.joinedRooms.has(tripId)) {
      this.socket.emit('join-trip', tripId);
      this.joinedRooms.add(tripId);
      // console.log(`Joined trip room: ${tripId}`);
    }
  }

  // Leave a trip room
  leaveTrip(tripId) {
    if (this.socket && this.isConnected && this.joinedRooms.has(tripId)) {
      this.socket.emit('leave-trip', tripId);
      this.joinedRooms.delete(tripId);
      // console.log(`Left trip room: ${tripId}`);
    }
  }

  // Listen for booking updates
  onBookingUpdated(callback) {
    if (this.socket) {
      // Remove any existing listener first
      this.socket.off('booking-updated');
      
      this.socket.on('booking-updated', (data) => {
        // console.log('🎯 Socket received booking-updated event:', data);
        callback(data);
      });
      this.listeners.set('booking-updated', callback);
    }
  }

  // Listen for new bookings
  onNewBooking(callback) {
    if (this.socket) {
      // Remove any existing listener first
      this.socket.off('new-booking');
      
      this.socket.on('new-booking', (data) => {
        // console.log('🎯 Socket received new-booking event:', data);
        callback(data);
      });
      this.listeners.set('new-booking', callback);
    }
  }

  // Remove specific listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      this.listeners.delete(event);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event, callback);
      });
      this.listeners.clear();
    }
  }
}

// Create a singleton instance
const socketManager = new SocketManager();

export default socketManager; 