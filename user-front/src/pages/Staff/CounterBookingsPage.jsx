import React, { useState, useEffect } from 'react';
import { 
  FaCreditCard, 
  FaSearch, 
  FaSpinner, 
  FaEye,
  FaCalendarAlt,
  FaRoute,
  FaUser,
  FaMoneyBillWave
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';
import { toast } from 'react-toastify';

const CounterBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [transactionIdSearch, setTransactionIdSearch] = useState('');
  const [searchingByTransactionId, setSearchingByTransactionId] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [currentPage, searchQuery]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/staff/show-counter-bookings', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: 10,
          search: searchQuery
        }
      });

      if (response.data && response.data.success) {
        setBookings(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching counter bookings:', error);
      setError('فشل في تحميل الحجوزات النقدية');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBookings();
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
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
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  // Cancel booking handler
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/staff/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم إلغاء الحجز بنجاح');
      setShowModal(false);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل في إلغاء الحجز');
    }
  };

  // Search by transaction ID
  const handleTransactionIdSearch = async (e) => {
    e.preventDefault();
    if (!transactionIdSearch.trim()) return;
    setSearchingByTransactionId(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/staff/search-booking', {
        headers: { Authorization: `Bearer ${token}` },
        params: { transactionId: transactionIdSearch.trim() }
      });
      if (response.data && response.data.success) {
        setSelectedBooking({
          ...response.data.booking.payment,
          booking: response.data.booking
        });
        setShowModal(true);
      } else {
        setError('لم يتم العثور على الحجز');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'لم يتم العثور على الحجز');
    } finally {
      setSearchingByTransactionId(false);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <StaffLayout>
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-4xl text-green-600" />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">الحجوزات النقدية</h1>
          <p className="text-gray-600">عرض جميع الحجوزات التي تمت في المكتب</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Transaction ID Search */}
        <div className="mb-6">
          <form onSubmit={handleTransactionIdSearch} className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="بحث برقم المعاملة..."
              value={transactionIdSearch}
              onChange={e => setTransactionIdSearch(e.target.value)}
              className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
              disabled={searchingByTransactionId}
            >
              {searchingByTransactionId ? 'جاري البحث...' : 'بحث برقم المعاملة'}
            </button>
          </form>
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث برقم المعاملة أو رقم الحجز..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم المعاملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرحلة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المسافرين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الدفع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.transactionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.booking?.trip ? (
                        <div>
                          <div className="font-medium">
                            {booking.booking.trip.origin} → {booking.booking.trip.destination}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDate(booking.booking.trip.departureDate)} - {formatTime(booking.booking.trip.departureTime)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">غير متوفر</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{booking.booking?.noOfSeats || 0} مسافر</div>
                        {booking.booking?.passengers && (
                          <div className="text-gray-500 text-xs">
                            {booking.booking.passengers.map((p, i) => 
                              `${p.firstName} ${p.lastName}`
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium text-green-600">
                        {booking.amount} {booking.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.paidAt ? formatDate(booking.paidAt) : 'غير متوفر'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewBooking(booking)}
                        className="text-green-600 hover:text-green-900 flex items-center"
                      >
                        <FaEye className="mr-1" />
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bookings.length === 0 && !loading && (
            <div className="text-center py-12">
              <FaCreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد حجوزات نقدية</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'لم يتم العثور على أي حجوزات نقدية بعد'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
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

        {/* Booking Details Modal */}
        {showModal && selectedBooking && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">تفاصيل الحجز</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Transaction Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">معلومات المعاملة</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">رقم المعاملة:</span>
                        <span className="font-medium mr-2">{selectedBooking.transactionId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">المبلغ:</span>
                        <span className="font-medium text-green-600 mr-2">
                          {selectedBooking.amount} {selectedBooking.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">الحالة:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${getStatusColor(selectedBooking.status)}`}>
                          {getStatusText(selectedBooking.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">تاريخ الدفع:</span>
                        <span className="font-medium mr-2">
                          {selectedBooking.paidAt ? formatDate(selectedBooking.paidAt) : 'غير متوفر'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trip Info */}
                  {selectedBooking.booking?.trip && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">معلومات الرحلة</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">المسار:</span>
                          <span className="font-medium mr-2">
                            {selectedBooking.booking.trip.origin} → {selectedBooking.booking.trip.destination}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">التاريخ:</span>
                          <span className="font-medium mr-2">
                            {formatDate(selectedBooking.booking.trip.departureDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">الوقت:</span>
                          <span className="font-medium mr-2">
                            {formatTime(selectedBooking.booking.trip.departureTime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">الباص:</span>
                          <span className="font-medium mr-2">
                            {selectedBooking.booking.trip.bus?.busNumber || 'غير متوفر'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passengers Info */}
                  {selectedBooking.booking?.passengers && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">المسافرين</h4>
                      <div className="space-y-2">
                        {selectedBooking.booking.passengers.map((passenger, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>
                              {passenger.firstName} {passenger.lastName}
                            </span>
                            <span className="text-gray-600">
                              {passenger.gender === 'male' ? 'ذكر' : 'أنثى'} | {passenger.phone}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking Info */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">معلومات الحجز</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">نوع الحجز:</span>
                        <span className="font-medium mr-2">
                          {selectedBooking.booking?.bookingType === 'counter' ? 'مكتب' : selectedBooking.booking?.bookingType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">عدد المقاعد:</span>
                        <span className="font-medium mr-2">{selectedBooking.booking?.noOfSeats || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">تم بواسطة:</span>
                        <span className="font-medium mr-2">{selectedBooking.booking?.addedBy || 'النظام'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    إغلاق
                  </button>
                  {/* Show cancel button if eligible */}
                  {selectedBooking.booking && ['confirmed', 'pending'].includes(selectedBooking.booking.status) && (
                    <button
                      onClick={() => handleCancelBooking(selectedBooking.booking._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      إلغاء الحجز
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default CounterBookingsPage; 