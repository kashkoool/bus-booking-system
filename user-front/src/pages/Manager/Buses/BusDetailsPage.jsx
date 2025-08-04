// src/pages/manager/bus/BusDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaBus, 
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaToggleOn,
  FaToggleOff,
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCar,
  FaUser,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaRoute,
  FaTicketAlt,
  FaCog,
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import ManagerLayout from '../../../layouts/MangerLayout';

const BASE_URL = 'http://localhost:5001';

const BusDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // جلب بيانات الباص من الخادم
  useEffect(() => {
    const fetchBusDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/api/manger/bus/${id}/view`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          setBus(response.data);
        } else {
          throw new Error('هيكل البيانات غير متوقع. الرجاء التحقق من نقطة النهاية.');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء جلب بيانات الباص';
        setError(errorMsg);
        console.error('Error fetching bus details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusDetails();
  }, [id]);

  // دالة لتغيير حالة الباص (تفعيل/تعطيل)
  const toggleBusStatus = async () => {
    try {
      setTogglingStatus(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `${BASE_URL}/api/manger/bus/${id}/activation`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // تحديث حالة الباص في الواجهة
      setBus(prev => ({ ...prev, isActive: !prev.isActive }));
      setSuccessMessage(`تم ${bus.isActive ? 'تعطيل' : 'تفعيل'} الباص بنجاح`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء تغيير حالة الباص';
      setError(errorMsg);
    } finally {
      setTogglingStatus(false);
    }
  };

  // دالة لحذف الباص
  const deleteBus = async () => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا الباص؟ سيتم حذف جميع البيانات المرتبطة به بما في ذلك الرحلات.')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${BASE_URL}/api/manger/bus/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.message === "تم حذف الباص والسائق بنجاح") {
        setSuccessMessage('تم حذف الباص بنجاح');
        setTimeout(() => {
          navigate('/manager/bus/show');
        }, 1500);
      } else {
        throw new Error(response.data.message || 'فشل في حذف الباص');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'فشل في حذف الباص';
      setError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-3 text-gray-600">جاري تحميل بيانات الباص...</p>
        </div>
      </ManagerLayout>
    );
  }

  if (!bus) {
    return (
      <ManagerLayout>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">
            <FaBus className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">الباص غير موجود</h2>
          <p className="text-gray-600 mb-6">لم يتم العثور على باص بالمعرف المطلوب</p>
          <button 
            onClick={() => navigate('/manger/bus/show')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة إلى قائمة الباصات
          </button>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaCheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* العنوان وأزرار الإجراءات */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaBus className="mr-2 text-blue-600" />
              تفاصيل الباص: {bus.busNumber}
            </h1>
            <p className="mt-1 text-gray-600">عرض كافة المعلومات المتعلقة بالباص</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Link 
              to={`/manager/bus/edit/${id}`}
              className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-md"
            >
              <FaEdit className="mr-2" />
              تعديل الباص
            </Link>
            <button
              onClick={deleteBus}
              disabled={deleting}
              className={`flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md ${
                deleting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {deleting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  جاري الحذف...
                </>
              ) : (
                <>
                  <FaTrash className="mr-2" />
                  حذف الباص
                </>
              )}
            </button>
            <button 
              onClick={() => navigate('/manager/bus/show')}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              <FaArrowLeft className="mr-2" />
              العودة
            </button>
          </div>
        </div>

        {/* بطاقة معلومات الباص */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* صورة الباص (افتراضية) */}
              <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-dashed border-blue-200 rounded-xl w-48 h-48 flex items-center justify-center text-gray-500">
                  <FaBus className="text-5xl text-blue-400" />
                </div>
              </div>
              
              {/* تفاصيل الباص */}
              <div className="md:w-3/4 md:pl-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{bus.busNumber}</h2>
                  
                  {/* زر حالة الباص */}
                  <button
                    onClick={toggleBusStatus}
                    disabled={togglingStatus}
                    className={`mt-2 md:mt-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      bus.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } transition-colors ${togglingStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {togglingStatus ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></span>
                        جاري التحميل...
                      </>
                    ) : bus.isActive ? (
                      <>
                        <FaToggleOn className="mr-1" /> نشط
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="mr-1" /> غير نشط
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaCar className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">موديل الباص</p>
                      <p className="text-gray-700 font-medium">{bus.model}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaCalendarAlt className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">سنة الصنع</p>
                      <p className="text-gray-700 font-medium">{bus.year}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaUser className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">السعة</p>
                      <p className="text-gray-700 font-medium">{bus.capacity} مقعد</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaCog className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">الحالة</p>
                      <p className="text-gray-700 font-medium">{bus.isActive ? "نشط" : "غير نشط"}</p>
                    </div>
                  </div>
                  
                  {bus.createdAt && (
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <FaCalendarAlt className="text-blue-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">تاريخ الإضافة</p>
                        <p className="text-gray-700">{formatDate(bus.createdAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {bus.updatedAt && (
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <FaClock className="text-blue-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">آخر تحديث</p>
                        <p className="text-gray-700">{formatDate(bus.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* معلومات السائق */}
                {bus.driver && (
                  <div className="mt-6">
                    <div className="flex items-center mb-2">
                      <FaUser className="text-blue-500 ml-2" />
                      <h3 className="text-lg font-semibold text-gray-800">السائق المسؤول</h3>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-center">
                        <FaUser className="text-blue-600 mr-2" />
                        <h3 className="font-medium text-gray-800">{bus.driver.firstName} {bus.driver.lastName}</h3>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center">
                          <FaPhone className="text-blue-500 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">الهاتف</p>
                            <p className="text-gray-700">
                              <a href={`tel:${bus.driver.phone}`} className="text-blue-600 hover:underline">
                                {bus.driver.phone}
                              </a>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <FaEnvelope className="text-blue-500 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                            <p className="text-gray-700">
                              <a href={`mailto:${bus.driver.email}`} className="text-blue-600 hover:underline">
                                {bus.driver.email}
                              </a>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <FaCalendarAlt className="text-blue-500 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">العمر</p>
                            <p className="text-gray-700">{bus.driver.age} سنة</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <FaCog className="text-blue-500 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">الحالة</p>
                            <p className="text-gray-700">{bus.driver.status === 'active' ? 'نشط' : 'غير نشط'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* الرحلات */}
                {bus.trips && bus.trips.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center mb-2">
                      <FaRoute className="text-blue-500 ml-2" />
                      <h3 className="text-lg font-semibold text-gray-800">الرحلات المرتبطة</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              نقطة البداية
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              نقطة النهاية
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              تاريخ الرحلة
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              عدد التذاكر المباعة
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              الحالة
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bus.trips.map(trip => (
                            <tr key={trip._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{trip.origin}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{trip.destination}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{formatDate(trip.startTime)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <FaTicketAlt className="text-green-500 mr-1" />
                                  <span className="text-sm text-gray-900">
                                    {trip.bookedSeats || 0} / {bus.capacity}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  trip.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : trip.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {trip.status === 'completed' ? 'مكتملة' : 
                                   trip.status === 'cancelled' ? 'ملغاة' : 
                                   'مجدولة'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
};

export default BusDetailsPage;