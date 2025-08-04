import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaEye, FaSyncAlt, FaTrash, FaBan, FaUndo, FaChair,FaBus } from 'react-icons/fa';
import axios from 'axios';
import ManagerLayout from '../../../layouts/MangerLayout';

const syrianCities = [
  'كل المدن', 'دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'الرقة', 'دير الزور', 'الحسكة', 'القامشلي', 'طرطوس', 'إدلب'
];

const TripsListPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [showSeatsModal, setShowSeatsModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [seatsInput, setSeatsInput] = useState('');
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [seatsError, setSeatsError] = useState('');
  const [seatsSuccess, setSeatsSuccess] = useState('');
  const [seatDetails, setSeatDetails] = useState(null);
  const [loadingSeatDetails, setLoadingSeatDetails] = useState(false);
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

  const handleDelete = async (tripId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه الرحلة؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/shared/trip/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(trips.filter(trip => trip._id !== tripId));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل في حذف الرحلة');
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

  const fetchSeatDetails = async (tripId) => {
    try {
      setLoadingSeatDetails(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5001/api/company/trip/${tripId}/seats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setSeatDetails(response.data.trip);
      } else {
        setSeatsError('فشل في تحميل تفاصيل المقاعد');
      }
    } catch (err) {
      setSeatsError(err.response?.data?.message || err.message || 'فشل في تحميل تفاصيل المقاعد');
    } finally {
      setLoadingSeatDetails(false);
    }
  };

  const handleOpenSeatsModal = async (trip) => {
    setSelectedTrip(trip);
    setSeatsInput(trip.seatsAvailable || '');
    setShowSeatsModal(true);
    setSeatsError('');
    setSeatsSuccess('');
    setSeatDetails(null);
    await fetchSeatDetails(trip._id);
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
    <ManagerLayout>
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
              to="/manager/trips/add"
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
                    <td className="px-6 py-4 whitespace-nowrap">{trip.bus?.busNumber || '---'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{trip.status || '---'}</td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button
                        onClick={() => navigate(`/manager/trip/view/${trip._id}`)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="عرض التفاصيل"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => navigate(`/manager/trip/edit/${trip._id}`)}
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
                      <button
                        onClick={() => handleOpenSeatsModal(trip)}
                        className="text-purple-600 hover:text-purple-900 p-1"
                        title="تعديل المقاعد المتاحة"
                      >
                        <FaChair />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Modal for updating seats */}
        {showSeatsModal && selectedTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 left-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowSeatsModal(false)}
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4 text-gray-800">تعديل المقاعد المتاحة للرحلة</h2>
              <div className="mb-2 text-gray-700">
                <strong>الرحلة:</strong> {selectedTrip.title || `${selectedTrip.origin} - ${selectedTrip.destination}`}
              </div>
              
              {/* Seat Details Section */}
              {loadingSeatDetails ? (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></span>
                    <span className="text-gray-600">جاري تحميل تفاصيل المقاعد...</span>
                  </div>
                </div>
              ) : seatDetails ? (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3">معلومات المقاعد الحالية</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">إجمالي المقاعد:</span>
                      <span className="font-medium">{seatDetails.totalSeats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المقاعد المحجوزة:</span>
                      <span className="font-medium text-red-600">{seatDetails.seatsBooked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المقاعد المحجوزة مؤقتاً:</span>
                      <span className="font-medium text-yellow-600">{seatDetails.seatsHeld}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المقاعد المتاحة:</span>
                      <span className="font-medium text-green-600">{seatDetails.seatsAvailable}</span>
                    </div>
                  </div>
                </div>
              ) : null}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSeatsLoading(true);
                  setSeatsError('');
                  setSeatsSuccess('');
                  try {
                    const token = localStorage.getItem('token');
                    const response = await axios.put(
                      `http://localhost:5001/api/company/trip/${selectedTrip._id}/update-seats`,
                      { seatsAvailable: Number(seatsInput) },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (response.data && response.data.success) {
                      setSeatsSuccess('تم تحديث المقاعد بنجاح!');
                      setTrips(trips => trips.map(t => t._id === selectedTrip._id ? { ...t, seatsAvailable: Number(seatsInput) } : t));
                      // Refresh seat details after successful update
                      await fetchSeatDetails(selectedTrip._id);
                      setTimeout(() => {
                        setShowSeatsModal(false);
                      }, 1000);
                    } else {
                      setSeatsError(response.data?.message || 'فشل في تحديث المقاعد');
                    }
                  } catch (err) {
                    setSeatsError(err.response?.data?.message || err.message || 'فشل في تحديث المقاعد');
                  } finally {
                    setSeatsLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="text-gray-700">عدد المقاعد المتاحة الجديد</span>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={seatsInput}
                    onChange={e => setSeatsInput(e.target.value)}
                    required
                  />
                </label>
                {seatsError && <div className="text-red-600 text-sm">{seatsError}</div>}
                {seatsSuccess && <div className="text-green-600 text-sm">{seatsSuccess}</div>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
                    onClick={() => setShowSeatsModal(false)}
                    disabled={seatsLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={seatsLoading}
                  >
                    {seatsLoading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default TripsListPage; 