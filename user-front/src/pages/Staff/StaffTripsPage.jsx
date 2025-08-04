import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaSyncAlt, FaBan, FaUndo } from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';

const syrianCities = [
  'كل المدن', 'دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'الرقة', 'دير الزور', 'الحسكة', 'القامشلي', 'طرطوس', 'إدلب'
];

const StaffTripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const navigate = useNavigate();

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/shared/All-trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setTrips(response.data.trips);
      } else {
        setError('فشل في تحميل بيانات الرحلات');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل في تحميل بيانات الرحلات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = async (tripId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد إلغاء هذه الرحلة؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/shared/cancel-trip/${tripId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(trips => trips.map(trip => trip._id === tripId ? { ...trip, status: 'cancelled' } : trip));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل في إلغاء الرحلة');
    }
  };

  const handleRevert = async (tripId) => {
    if (!window.confirm('هل تريد إعادة جدولة هذه الرحلة؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/shared/revert-trip/${tripId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(trips => trips.map(trip => trip._id === tripId ? { ...trip, status: 'scheduled' } : trip));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل في إعادة جدولة الرحلة');
    }
  };

  // Filtered trips based on selected origin/destination
  const filteredTrips = trips.filter(trip => {
    return (
      (originFilter === 'كل المدن' || !originFilter || trip.origin === originFilter) &&
      (destinationFilter === 'كل المدن' || !destinationFilter || trip.destination === destinationFilter)
    );
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">قائمة الرحلات</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setRefreshing(true); fetchTrips(); }}
              className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={refreshing}
            >
              <FaSyncAlt className="mr-2" />
              تحديث
            </button>
            <Link
              to="/staff/trip/add"
              className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="mr-2" />
              إضافة رحلة جديدة
            </Link>
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من (المدينة)</label>
            <select
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg"
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value)}
            >
              {syrianCities.map(city => (
                <option key={city} value={city === 'كل المدن' ? '' : city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى (المدينة)</label>
            <select
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg"
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
            >
              {syrianCities.map(city => (
                <option key={city} value={city === 'كل المدن' ? '' : city}>{city}</option>
              ))}
            </select>
          </div>
          {(originFilter || destinationFilter) && (
            <button
              className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
              onClick={() => { setOriginFilter(''); setDestinationFilter(''); }}
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></span>
            <span className="mr-3 text-gray-600">جاري تحميل بيانات الرحلات...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-red-700">{error}</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم الرحلة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">من</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إلى</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ المغادرة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الباص</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">لا توجد رحلات</td>
                  </tr>
                ) : filteredTrips.map(trip => (
                  <tr key={trip._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{trip.title || `${trip.origin} - ${trip.destination}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{trip.origin}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{trip.destination}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(trip.departureDate).toLocaleString('ar-EG')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{trip.bus && typeof trip.bus === 'object' ? trip.bus.busNumber : (trip.bus || '---')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        trip.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {trip.status || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button
                        onClick={() => navigate(`/staff/trip/edit/${trip._id}`)}
                        className="text-yellow-600 hover:text-yellow-900 p-1"
                        title="تعديل"
                      >
                        <FaEdit />
                      </button>
                      {trip.status !== 'cancelled' ? (
                        <button
                          onClick={() => handleCancel(trip._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="إلغاء الرحلة"
                        >
                          <FaBan />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevert(trip._id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="إعادة جدولة الرحلة"
                        >
                          <FaUndo />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default StaffTripsPage; 