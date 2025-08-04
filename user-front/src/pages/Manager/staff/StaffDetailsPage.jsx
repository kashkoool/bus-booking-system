// src/pages/admin/companies/staff/StaffDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaIdCard,
  FaBus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaToggleOn,
  FaToggleOff,
  FaCheckCircle,
  FaExclamationTriangle,
  FaVenusMars,
  FaCalendarAlt,
  FaBuilding,
  FaShieldAlt,
  FaCar
} from 'react-icons/fa';
import axios from 'axios';
import AdminLayout from '../../../layouts/AdminLayout';

const BASE_URL = 'http://localhost:5000';

const StaffDetailsPage = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // جلب بيانات الموظف من الخادم
  useEffect(() => {
    const fetchStaffDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/api/manger/staff/${staffId}/view`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          setStaff(response.data);
        } else {
          throw new Error('هيكل البيانات غير متوقع. الرجاء التحقق من نقطة النهاية.');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء جلب بيانات الموظف';
        setError(errorMsg);
        console.error('Error fetching staff details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffDetails();
  }, [staffId]);

  // دالة لتغيير حالة الموظف (تفعيل/تعطيل)
  const toggleStaffStatus = async () => {
    try {
      setTogglingStatus(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const status = staff.status === 'active' ? 'inactive' : 'active';
      
      await axios.patch(
        `${BASE_URL}/api/manger/${staffId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // تحديث حالة الموظف في الواجهة
      setStaff(prev => ({ ...prev, status: status }));
      setSuccessMessage(`تم ${staff.status === 'active' ? 'تعطيل' : 'تفعيل'} الموظف بنجاح`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء تغيير حالة الموظف';
      setError(errorMsg);
    } finally {
      setTogglingStatus(false);
    }
  };

  // دالة لحذف الموظف
  const deleteStaff = async () => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا الموظف؟ سيتم حذف جميع البيانات المرتبطة به.')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${BASE_URL}/api/manager/staff/${staffId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccessMessage('تم حذف الموظف بنجاح');
        setTimeout(() => {
          navigate(-1); // العودة للصفحة السابقة (قائمة الموظفين)
        }, 1500);
      } else {
        throw new Error(response.data.message || 'فشل في حذف الموظف');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'فشل في حذف الموظف';
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
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-3 text-gray-600">جاري تحميل بيانات الموظف...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!staff) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">
            <FaUser className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">الموظف غير موجود</h2>
          <p className="text-gray-600 mb-6">لم يتم العثور على موظف بالمعرف المطلوب</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
              <FaUser className="mr-2 text-blue-600" />
              تفاصيل الموظف: {staff.firstName} {staff.lastName}
            </h1>
            <p className="mt-1 text-gray-600">عرض كافة المعلومات المتعلقة بالموظف</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Link 
              to={`/manager/staff/edit/${staffId}`}
              className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-md"
            >
              <FaEdit className="mr-2" />
              تعديل الموظف
            </Link>
            <button
              onClick={deleteStaff}
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
                  حذف الموظف
                </>
              )}
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              <FaArrowLeft className="mr-2" />
              العودة
            </button>
          </div>
        </div>

        {/* بطاقة معلومات الموظف */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex flex-col md:flex-row">
              {/* صورة الموظف (افتراضية) */}
              <div className="md:w-1/4 flex justify-center md:justify-start mb-6 md:mb-0">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-dashed border-blue-200 rounded-xl w-48 h-48 flex items-center justify-center text-gray-500">
                  <FaUser className="text-5xl text-blue-400" />
                </div>
              </div>
              
              {/* تفاصيل الموظف */}
              <div className="md:w-3/4 md:pl-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{staff.firstName} {staff.lastName}</h2>
                  
                  {/* زر حالة الموظف */}
                  <button
                    onClick={toggleStaffStatus}
                    disabled={togglingStatus}
                    className={`mt-2 md:mt-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      staff.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } transition-colors ${togglingStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {togglingStatus ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></span>
                        جاري التحميل...
                      </>
                    ) : staff.status === 'active' ? (
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
                    <FaEnvelope className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                      <p className="text-gray-700">
                        <a href={`mailto:${staff.email}`} className="text-blue-600 hover:underline">
                          {staff.email}
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  {staff.phone && (
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <FaPhone className="text-blue-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">الهاتف</p>
                        <p className="text-gray-700">
                          <a href={`tel:${staff.phone}`} className="text-blue-600 hover:underline">
                            {staff.phone}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaShieldAlt className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">الدور</p>
                      <p className="text-gray-700 capitalize">{staff.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaVenusMars className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">الجنس</p>
                      <p className="text-gray-700">{staff.gender === 'male' ? 'ذكر' : staff.gender === 'female' ? 'أنثى' : staff.gender}</p>
                    </div>
                  </div>
                  
                  {staff.age && (
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <FaCalendarAlt className="text-blue-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">العمر</p>
                        <p className="text-gray-700">{staff.age} سنة</p>
                      </div>
                    </div>
                  )}
                  
                  {staff.address && (
                    <div className="flex items-start bg-gray-50 p-3 rounded-lg">
                      <FaMapMarkerAlt className="text-blue-500 ml-2 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">العنوان</p>
                        <p className="text-gray-700">{staff.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {staff.drivingLicenseNumber && (
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <FaCar className="text-blue-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-500">رقم رخصة القيادة</p>
                        <p className="text-gray-700">{staff.drivingLicenseNumber}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaBuilding className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">الشركة</p>
                      <p className="text-gray-700">
                        {staff.company?.name || 'غير معين'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <FaCalendarAlt className="text-blue-500 ml-2" />
                    <div>
                      <p className="text-sm text-gray-500">تاريخ التسجيل</p>
                      <p className="text-gray-700">{formatDate(staff.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                {/* الحافلات المخصصة */}
                {staff.assignedBuses && staff.assignedBuses.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center mb-2">
                      <FaBus className="text-blue-500 ml-2" />
                      <p className="text-sm text-gray-500">الحافلات المخصصة</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {staff.assignedBuses.map(bus => (
                        <div key={bus._id} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <div className="flex items-center">
                            <FaBus className="text-blue-600 mr-2" />
                            <h3 className="font-medium text-gray-800">{bus.plateNumber}</h3>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="flex items-center">
                              <span className="ml-2">النوع:</span> 
                              <span className="font-medium">{bus.model}</span>
                            </p>
                            <p className="flex items-center mt-1">
                              <span className="ml-2">السعة:</span> 
                              <span className="font-medium">{bus.capacity} مقعد</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffDetailsPage;