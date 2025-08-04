import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaSearch, 
  FaSpinner, 
  FaEye,
  FaCalendarAlt,
  FaRoute,
  FaUser,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';
import { toast } from 'react-toastify';

const CounterRefundsPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRefunds();
  }, [currentPage, searchQuery]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/staff/counter-refunds', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: 10,
          search: searchQuery
        }
      });

      if (response.data && response.data.success) {
        setRefunds(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching counter refunds:', error);
      setError('فشل في تحميل طلبات الاسترداد');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRefunds();
  };

  const handleViewRefund = (refund) => {
    setSelectedRefund(refund);
    setShowModal(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedRefund || !selectedRefund._id) return;
    if (!window.confirm('هل أنت متأكد من تأكيد الاسترداد؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/staff/counter-refunds/${selectedRefund._id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم تأكيد الاسترداد بنجاح');
      setShowModal(false);
      fetchRefunds();
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل في تأكيد الاسترداد');
    }
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

  const getRefundStatusColor = (refundStatus) => {
    switch (refundStatus) {
      case 'refunded':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusText = (refundStatus) => {
    switch (refundStatus) {
      case 'refunded':
        return 'تم الاسترداد';
      case 'pending':
        return 'قيد الانتظار';
      case 'processing':
        return 'قيد المعالجة';
      default:
        return 'غير محدد';
    }
  };

  if (loading && refunds.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">استرداد الأموال</h1>
          <p className="text-gray-600">إدارة طلبات الاسترداد للحجوزات الملغية</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث باسم المسافر أو رقم الحجز أو رقم المعاملة..."
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

        {/* Refunds Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم المعاملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المسافرين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرحلة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ المطلوب استرداده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {refund.transactionId || 'غير متوفر'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{refund.noOfSeats} مسافر</div>
                        {refund.passengers && (
                          <div className="text-gray-500 text-xs">
                            {refund.passengers.map((p, i) => 
                              `${p.firstName} ${p.lastName}`
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {refund.tripID ? (
                        <div>
                          <div className="font-medium">
                            {refund.tripID.origin} → {refund.tripID.destination}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDate(refund.tripID.departureDate)} - {formatTime(refund.tripID.departureTime)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">غير متوفر</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium text-red-600">
                        {refund.totalAmount} ل.س
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewRefund(refund)}
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

          {refunds.length === 0 && !loading && (
            <div className="text-center py-12">
              <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات استرداد</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'لم يتم العثور على أي طلبات استرداد بعد'}
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

        {/* Refund Details Modal */}
        {showModal && selectedRefund && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">تفاصيل طلب الاسترداد</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Booking Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">معلومات الحجز</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">رقم المعاملة:</span>
                        <span className="font-medium mr-2">{selectedRefund.transactionId || 'غير متوفر'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">نوع الحجز:</span>
                        <span className="font-medium mr-2">
                          {selectedRefund.bookingType === 'counter' ? 'مكتب' : selectedRefund.bookingType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">عدد المقاعد:</span>
                        <span className="font-medium mr-2">{selectedRefund.noOfSeats}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">المبلغ المطلوب استرداده:</span>
                        <span className="font-medium text-red-600 mr-2">{selectedRefund.totalAmount} ل.س</span>
                      </div>
                    </div>
                  </div>

                  {/* Passengers Info */}
                  {selectedRefund.passengers && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">المسافرين</h4>
                      <div className="space-y-2">
                        {selectedRefund.passengers.map((passenger, index) => (
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

                  {/* Cancellation Info */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">معلومات الإلغاء</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">سبب الإلغاء:</span>
                        <span className="font-medium mr-2">
                          {selectedRefund.cancellation?.reason || 'إلغاء من الشركة'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">تم بواسطة:</span>
                        <span className="font-medium mr-2">
                          {selectedRefund.staffID?.username || 'النظام'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Refund Instructions */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <FaExclamationTriangle className="mr-2 text-yellow-600" />
                      تعليمات الاسترداد
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>• تأكد من هوية العميل قبل إجراء الاسترداد</p>
                      <p>• استرد المبلغ الكامل: <strong>{selectedRefund.totalAmount} ل.س</strong></p>
                      <p>• احتفظ بإيصال الاسترداد</p>
                      <p>• قم بتحديث حالة الاسترداد في النظام</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={handleConfirmRefund}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    disabled={selectedRefund.refundStatus === 'refunded'}
                  >
                    <FaCheckCircle className="mr-2" />
                    تأكيد الاسترداد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default CounterRefundsPage; 