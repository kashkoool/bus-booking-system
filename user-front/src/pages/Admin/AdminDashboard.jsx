import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  FaBuilding, 
  FaBus, 
  FaMoneyBillWave,
  FaRoute,
  FaCog,
  FaUserCog,
  FaUsers,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaClipboardList
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import AdminLayout from '../../layouts/AdminLayout';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    totalCompanies: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    revenue: 0,
    companies: {
      total: 0,
      active: 0,
      pending: 0,
      suspended: 0
    },
    bookings: {
      total: 0,
      confirmed: 0,
      totalRevenue: 0
    },
    trips: {
      total: 0,
      completed: 0,
      upcoming: 0
    },
    buses: {
      active: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('=== DEBUG: Fetching admin stats ===');
        const response = await axios.get('http://localhost:5001/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('=== DEBUG: Stats API Response ===');
        console.log('Response:', response.data);
        
        if (response.data?.success) {
          const statsData = response.data;
          console.log('=== DEBUG: Parsed Stats Data ===');
          console.log('Stats data:', statsData);
          
          setStats({
            totalUsers: statsData.totalUsers || 0,
            activeUsers: statsData.activeUsers || 0,
            newUsersThisMonth: statsData.newUsersThisMonth || 0,
            totalCompanies: statsData.companies?.total || 0,
            totalBookings: statsData.totalBookings || 0,
            confirmedBookings: statsData.confirmedBookings || 0,
            revenue: statsData.revenue || 0,
            companies: {
              total: statsData.companies?.total || 0,
              active: statsData.companies?.active || 0,
              pending: statsData.companies?.pending || 0,
              suspended: 0 // Not provided by API, defaulting to 0
            },
            bookings: {
              total: statsData.totalBookings || 0,
              confirmed: statsData.confirmedBookings || 0,
              totalRevenue: statsData.revenue || 0
            },
            trips: {
              total: statsData.trips?.total || 0,
              completed: statsData.trips?.completed || 0,
              upcoming: statsData.trips?.upcoming || 0
            },
            buses: {
              active: 0 // Not provided by API, defaulting to 0
            }
          });
        } else {
          console.log('=== DEBUG: API returned success: false ===');
          setError('فشل تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى لاحقًا.');
          toast.error('فشل تحميل بيانات لوحة التحكم');
        }
      } catch (err) {
        console.error('=== DEBUG: Error fetching admin stats ===');
        console.error('Error:', err);
        console.error('Response status:', err.response?.status);
        console.error('Response data:', err.response?.data);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
          setTimeout(() => {
            logout();
          }, 3000);
        } else {
          setError('فشل تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى لاحقًا.');
          toast.error('فشل تحميل بيانات لوحة التحكم');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [logout]);

  // Stats cards
  const statsCards = [
    {
      title: 'إجمالي المستخدمين',
      value: stats.totalUsers,
      icon: FaUsers,
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: `${stats.activeUsers} نشط • ${stats.newUsersThisMonth} جديد`,
      isPositive: true
    },
    {
      title: 'إجمالي الشركات',
      value: stats.companies.total,
      icon: FaBuilding,
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: `${stats.companies.active} نشطة • ${stats.companies.pending} في الانتظار`,
      isPositive: true
    },
    {
      title: 'إجمالي الرحلات',
      value: stats.trips.total,
      icon: FaRoute,
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: `${stats.trips.upcoming} قادمة • ${stats.trips.completed} مكتملة`,
      isPositive: true
    },
    {
      title: 'إجمالي الإيرادات',
      value: `${stats.revenue.toLocaleString()} ل.س`,
      icon: FaMoneyBillWave,
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: `${stats.confirmedBookings} حجز مؤكد`,
      isPositive: true
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل بيانات لوحة التحكم...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">مرحباً بك، {user?.username || 'المشرف'}</h1>
              </div>
              <div className="hidden md:block">
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <FaUsers className="text-4xl text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Buttons */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">التقارير والإحصائيات</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/admin/reports/companies')}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <FaBuilding className="text-2xl mr-3" />
                <div className="text-right">
                  <p className="font-bold text-lg">تقرير الشركات</p>
                  <p className="text-sm opacity-90">إحصائيات الشركات والأداء</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/admin/reports/trips')}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <FaRoute className="text-2xl mr-3" />
                <div className="text-right">
                  <p className="font-bold text-lg">تقرير الرحلات</p>
                  <p className="text-sm opacity-90">تفاصيل الرحلات والحجوزات</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/admin/reports/revenue')}
                className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <FaMoneyBillWave className="text-2xl mr-3" />
                <div className="text-right">
                  <p className="font-bold text-lg">تقرير الإيرادات</p>
                  <p className="text-sm opacity-90">تحليل الإيرادات والأرباح</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg" role="alert">
            <div className="flex">
              <div className="py-1">
                <FaExclamationTriangle className="h-6 w-6 text-red-500 mr-4" />
              </div>
              <div>
                <p className="font-bold">حدث خطأ</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} ${stat.textColor}`}>
                  <stat.icon className="text-2xl" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
              {stat.change && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                      {stat.isPositive ? <FaArrowUp className="ml-1 text-xs" /> : <FaArrowDown className="ml-1 text-xs" />}
                      {stat.change}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Real-time Dashboard */}
        <div className="mb-8">
          
        </div>

        {/* Detailed Statistics Summary */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">ملخص إحصائي مفصل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 group-hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <FaUsers className="text-white text-xl" />
                </div>
                <h4 className="text-lg font-bold text-blue-800 mb-3">المستخدمين</h4>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                    <p className="text-xs text-blue-600 font-medium">إجمالي المستخدمين</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.activeUsers}</p>
                      <p className="text-xs text-blue-600">نشط</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.newUsersThisMonth}</p>
                      <p className="text-xs text-blue-600">جديد</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 group-hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <FaBuilding className="text-white text-xl" />
                </div>
                <h4 className="text-lg font-bold text-blue-800 mb-3">الشركات</h4>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-blue-900">{stats.companies.total}</p>
                    <p className="text-xs text-blue-600 font-medium">إجمالي الشركات</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.companies.active}</p>
                      <p className="text-xs text-blue-600">نشطة</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.companies.pending}</p>
                      <p className="text-xs text-blue-600">في الانتظار</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 group-hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <FaRoute className="text-white text-xl" />
                </div>
                <h4 className="text-lg font-bold text-blue-800 mb-3">الرحلات</h4>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-blue-900">{stats.trips.total}</p>
                    <p className="text-xs text-blue-600 font-medium">إجمالي الرحلات</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.trips.upcoming}</p>
                      <p className="text-xs text-blue-600">قادمة</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.trips.completed}</p>
                      <p className="text-xs text-blue-600">مكتملة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 group-hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <FaMoneyBillWave className="text-white text-xl" />
                </div>
                <h4 className="text-lg font-bold text-blue-800 mb-3">الحجوزات</h4>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-blue-900">{stats.totalBookings}</p>
                    <p className="text-xs text-blue-600 font-medium">إجمالي الحجوزات</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.confirmedBookings}</p>
                      <p className="text-xs text-blue-600">مؤكدة</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-800">{stats.revenue.toLocaleString()}</p>
                      <p className="text-xs text-blue-600">ل.س</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
