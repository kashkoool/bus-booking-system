import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(
        "http://localhost:5001/api/user/confirmed-bookings"
      );
      setBookings(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch bookings");
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Memoize user display name to prevent unnecessary re-renders
  const userDisplayName = useMemo(() => {
    if (!user) return '';
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || user.email || 'User';
  }, [user]);

  // Memoize profile data to prevent unnecessary re-renders
  const profileData = useMemo(() => [
    { label: "Name", value: userDisplayName },
    { label: "Email", value: user?.email || "N/A" },
    { label: "Phone", value: user?.phone || "N/A" },
    { label: "Country", value: user?.country || "N/A" }
  ], [userDisplayName, user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-screen px-0 mx-0 py-8 animate-fadein"
      style={{
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* User Profile Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Profile Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileData.map((item, index) => (
            <div key={index}>
              <p className="text-sm font-medium text-gray-500">{item.label}</p>
              <p className="mt-1 text-lg text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Bookings</h2>
        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.trip?.origin} → {booking.trip?.destination}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.trip?.departureTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(booking.trip?.departureDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${booking.totalAmount?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Dashboard);