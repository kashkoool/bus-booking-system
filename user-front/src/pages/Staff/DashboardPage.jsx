import React, { useState, useEffect } from 'react';
import StaffLayout from '../../layouts/StaffLayout';
import { 
  FaUser,
  FaBus,
  FaRoute,
  FaCalendarAlt,
  FaClock,
  FaSpinner,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const StaffDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffInfo, setStaffInfo] = useState({
    profile: {},
    upcomingTrips: [],
    recentActivity: []
  });
  const { user: staff } = useAuth();

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        console.log('Fetching staff data...');
        
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/staff/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Staff dashboard data:', response.data);
        
        if (response.data.success) {
          setStaffInfo(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch staff data');
        }
      } catch (err) {
        console.error('Error fetching staff data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل بيانات الموظف';
        setError(`خطأ: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, []);

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="animate-spin text-4xl text-green-600" />
          <span className="mr-3">جاري التحميل...</span>
        </div>
      </StaffLayout>
    );
  }

  if (error) {
    return (
      <StaffLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">خطأ!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </StaffLayout>
    );
  }

  // Format date to Arabic
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  // Format time to 12-hour format in Arabic
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <StaffLayout>
      <div
        className="min-h-screen w-full px-2 sm:px-4 md:px-8 py-6 animate-fadein"
        style={{
          margin: 0,
          paddingTop: '0',
          paddingBottom: '0',
          boxSizing: 'border-box',
        }}
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-6">مرحباً بك في لوحة تحكم الموظف</h1>
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20 mr-4">
              <FaUser className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                مرحباً {staff?.username || 'الموظف'}
              </h2>
              <p className="text-green-100">
                مرحباً بك في نظام إدارة الرحلات. يمكنك من هنا الوصول إلى جميع المهام المطلوبة.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <FaBus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">الباصات</h3>
                <p className="text-sm text-gray-600">عرض معلومات الباصات المتاحة</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <FaRoute className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">الرحلات</h3>
                <p className="text-sm text-gray-600">عرض الرحلات المجدولة</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 mr-4">
                <FaCalendarAlt className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">الجدول</h3>
                <p className="text-sm text-gray-600">عرض جدول العمل الخاص بك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-green-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <FaUser className="mr-2" />
                المعلومات الشخصية
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">اسم المستخدم:</span>
                  <span className="font-medium">{staff?.username || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">البريد الإلكتروني:</span>
                  <span className="font-medium">{staff?.email || 'غير محدد'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <FaInfoCircle className="mr-2" />
                الإجراءات السريعة
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <button className="w-full text-right py-3 px-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 flex items-center justify-between">
                  <span className="text-blue-700 font-medium">عرض الرحلات اليوم</span>
                  <FaRoute className="text-blue-600" />
                </button>
                <button className="w-full text-right py-3 px-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 flex items-center justify-between">
                  <span className="text-green-700 font-medium">الباصات المتاحة</span>
                  <FaBus className="text-green-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gray-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <FaClock className="mr-2" />
              النشاطات الأخيرة
            </h2>
          </div>
          <div className="p-6">
            {staffInfo.recentActivity && staffInfo.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {staffInfo.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaInfoCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد نشاطات حديثة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffDashboard; 