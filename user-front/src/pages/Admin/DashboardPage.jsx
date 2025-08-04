// src/pages/admin/DashboardPage.js
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { 
  FaUsers, 
  FaBuilding, 
  FaBus, 
  FaMoneyBillWave,
  FaCalendarCheck,
  FaRoute,
  FaUserTie
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get admin stats
        const [statsRes, companiesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/admin/showcompanies', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setStats({
          ...statsRes.data,
          companies: {
            total: companiesRes.data.length,
            active: companiesRes.data.filter(c => c.status === 'active').length,
            suspended: companiesRes.data.filter(c => c.status === 'suspended').length
          }
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load dashboard data');
        }
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, navigate]);

  // Stats cards data
  const statsCards = stats ? [
    { 
      title: 'Total Users', 
      value: stats.totalUsers || 0, 
      icon: FaUsers, 
      color: 'bg-blue-100 text-blue-600',
      change: stats.userGrowthRate ? `${stats.userGrowthRate}%` : '0%'
    },
    { 
      title: 'Total Companies', 
      value: stats.companies?.total || 0, 
      icon: FaBuilding, 
      color: 'bg-green-100 text-green-600' 
    },
    { 
      title: 'الحافلات النشطة', 
      value: stats.buses?.active || 0, 
      icon: FaBus, 
      color: 'bg-yellow-100 text-yellow-600' 
    },
    { 
      title: 'الحجوزات اليوم', 
      value: stats.bookings.today.toLocaleString('ar-EG'), 
      icon: FaCalendarCheck, 
      color: 'bg-purple-100 text-purple-600' 
    },
    { 
      title: 'الإيرادات الشهرية', 
      value: `${stats.bookings.monthlyRevenue.toLocaleString('ar-EG')} ل.س`, 
      icon: FaMoneyBillWave, 
      color: 'bg-indigo-100 text-indigo-600' 
    },
    { 
      title: 'الرحلات النشطة', 
      value: stats.trips.active.toLocaleString('ar-EG'), 
      icon: FaRoute, 
      color: 'bg-red-100 text-red-600' 
    }
  ] : [];

  // تنسيق التاريخ بالعربية
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // حساب الوقت المنقضي منذ الحجز
  const timeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " سنة";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " شهر";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " يوم";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " ساعة";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " دقيقة";
    }
    return Math.floor(seconds) + " ثانية";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div
        className="min-h-screen w-full px-2 sm:px-4 md:px-8 py-6 animate-fadein"
        style={{
          margin: 0,
          paddingTop: '0',
          paddingBottom: '0',
          boxSizing: 'border-box',
          direction: 'rtl',
        }}
      >
        <div className="space-y-6">
          {/* العنوان */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم الإدارية</h1>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ar-SA', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          
          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map((card, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <card.icon className="text-xl" />
                  </div>
                  <div className="mr-4">
                    <h3 className="text-gray-500 text-sm">{card.title}</h3>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* الرسوم البيانية والأقسام الأخرى */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">توزيع المستخدمين</h2>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>العملاء: {stats.users.customers}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>الموظفين: {stats.users.staff}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>مدراء الشركات: {stats.users.companyManagers}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span>المشرفين: {stats.users.admins}</span>
                </div>
              </div>
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center text-gray-500">
                رسم بياني لتوزيع المستخدمين
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">أحدث الحجوزات</h2>
              <div className="space-y-4">
                {stats.latestBookings.map((booking, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div className="mr-3">
                        <p className="font-medium">{booking.customer}</p>
                        <p className="text-sm text-gray-500">{booking.trip}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{booking.amount.toLocaleString('ar-EG')} ر.س</p>
                      <p className="text-sm text-gray-500">منذ {timeSince(booking.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;