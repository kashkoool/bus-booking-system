import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaSpinner, 
  FaRoute,
  FaCalendarAlt,
  FaBus,
  FaMapMarkerAlt,
  FaClock,
  FaFilter
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';

const TripSearchPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    origin: '',
    destination: '',
    date: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrips();
  }, [currentPage, filters]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('http://localhost:5001/api/staff/trips/search', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data && response.data.success) {
        setTrips(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalTrips(response.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('فشل في تحميل الرحلات');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTrips();
  };

  const clearFilters = () => {
    setFilters({
      origin: '',
      destination: '',
      date: '',
      status: ''
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'مجدولة';
      case 'in-progress':
        return 'قيد التنفيذ';
      case 'completed':
        return 'مكتملة';
      case 'cancelled':
        return 'ملغية';
      default:
        return status;
    }
  };

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">البحث عن الرحلات</h1>
          <p className="text-gray-600">البحث والتصفية في رحلات الشركة</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نقطة الانطلاق
                </label>
                <input
                  type="text"
                  value={filters.origin}
                  onChange={(e) => handleFilterChange('origin', e.target.value)}
                  placeholder="مثال: دمشق"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوجهة
                </label>
                <input
                  type="text"
                  value={filters.destination}
                  onChange={(e) => handleFilterChange('destination', e.target.value)}
                  placeholder="مثال: حلب"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">جميع الحالات</option>
                  <option value="scheduled">مجدولة</option>
                  <option value="in-progress">قيد التنفيذ</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغية</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FaSearch className="mr-2" />
                بحث
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                <FaFilter className="mr-2" />
                مسح الفلاتر
              </button>
            </div>
          </form>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              تم العثور على <span className="font-semibold">{totalTrips}</span> رحلة
            </p>
            {loading && (
              <div className="flex items-center text-gray-600">
                <FaSpinner className="animate-spin mr-2" />
                جاري التحميل...
              </div>
            )}
          </div>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Trip Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <FaRoute className="text-green-600 mr-2" />
                    <h3 className="font-semibold text-gray-800">
                      {trip.origin} → {trip.destination}
                    </h3>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                    {getStatusText(trip.status)}
                  </span>
                </div>

                {/* Trip Details */}
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaCalendarAlt className="mr-2 text-gray-400" />
                    <span>{formatDate(trip.departureDate)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FaClock className="mr-2 text-gray-400" />
                    <span>{formatTime(trip.departureTime)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FaBus className="mr-2 text-gray-400" />
                    <span>الباص: {trip.bus?.busNumber || 'غير محدد'}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                    <span>المقاعد المتاحة: {trip.seatsAvailable}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">سعر التذكرة:</span>
                      <span className="font-semibold text-green-600">{trip.cost} ل.س</span>
                    </div>
                  </div>
                </div>

                {/* Trip Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      رقم الرحلة: {trip.tripNumber || 'غير محدد'}
                    </span>
                    <button
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                      onClick={() => {
                        // Navigate to trip details or booking page
                        console.log('View trip details:', trip._id);
                      }}
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {trips.length === 0 && !loading && (
          <div className="text-center py-12">
            <FaRoute className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد رحلات</h3>
            <p className="mt-1 text-sm text-gray-500">
              جرب تغيير معايير البحث أو الفلاتر
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </nav>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default TripSearchPage; 