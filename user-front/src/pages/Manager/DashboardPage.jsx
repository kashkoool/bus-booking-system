// src/pages/manager/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import MangerLayout from '../../layouts/MangerLayout';
import { 
  FaUsers, 
  FaBuilding, 
  FaBus, 
  FaMoneyBillWave,
  FaCalendarCheck,
  FaRoute,
  FaChartLine,
  FaChartPie,
  FaSpinner,
  FaFileExcel,
  FaDownload
} from 'react-icons/fa';
import { companyApi } from '../../utils/api';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Helper function to handle file downloads
const downloadFile = async (url, filename) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(url, {
      responseType: 'blob', // Important
      headers: { Authorization: `Bearer ${token}` }
    });

    // Create a link to trigger the download
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(new Blob([response.data]));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error);
    alert(`Could not download the report. Please try again. Error: ${error.message}`);
  }
};

// Reports Component
const ExportReports = () => {
  const [loading, setLoading] = useState(null);

  const handleExport = async (reportType) => {
    setLoading(reportType);
    let url, filename;
    switch (reportType) {
      case 'staff':
        url = 'http://localhost:5001/api/company/export/staff';
        filename = 'staff_report.pdf';
        break;
      case 'trips':
        url = 'http://localhost:5001/api/company/export/trips';
        filename = 'trips_report.pdf';
        break;
      case 'bookings':
        url = 'http://localhost:5001/api/company/export/bookings';
        filename = 'bookings_report.pdf';
        break;
      case 'financials':
        url = 'http://localhost:5001/api/company/export/financial-summary';
        filename = 'financial_summary.pdf';
        break;
      default:
        setLoading(null);
        return;
    }
    await downloadFile(url, filename);
    setLoading(null);
  };

  const reports = [
    { type: 'staff', title: 'تقرير الموظفين', icon: FaUsers },
    { type: 'trips', title: 'تقرير الرحلات', icon: FaRoute },
    { type: 'bookings', title: 'تقرير الحجوزات', icon: FaCalendarCheck },
    { type: 'financials', title: 'ملخص مالي', icon: FaChartLine }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">التقارير</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleExport('staff')}
          disabled={loading === 'staff'}
          className="bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg transition-colors duration-200 flex flex-col items-center"
        >
          <span className="text-lg font-medium">تقرير الموظفين</span>
          <span className="text-sm opacity-90 mt-1">عرض تفاصيل جميع الموظفين وبياناتهم</span>
        </button>
        
        <button
          onClick={() => handleExport('trips')}
          disabled={loading === 'trips'}
          className="bg-green-700 hover:bg-green-800 text-white p-4 rounded-lg transition-colors duration-200 flex flex-col items-center"
        >
          <span className="text-lg font-medium">تقرير الرحلات</span>
          <span className="text-sm opacity-90 mt-1">تفاصيل الرحلات المجدولة والمكتملة</span>
        </button>
        
        <button
          onClick={() => handleExport('bookings')}
          disabled={loading === 'bookings'}
          className="bg-purple-700 hover:bg-purple-800 text-white p-4 rounded-lg transition-colors duration-200 flex flex-col items-center"
        >
          <span className="text-lg font-medium">تقرير الحجوزات</span>
          <span className="text-sm opacity-90 mt-1">إحصائيات الحجوزات وحالة الدفع</span>
        </button>
        
        <button
          onClick={() => handleExport('financials')}
          disabled={loading === 'financials'}
          className="bg-orange-700 hover:bg-orange-800 text-white p-4 rounded-lg transition-colors duration-200 flex flex-col items-center"
        >
          <span className="text-lg font-medium">ملخص مالي</span>
          <span className="text-sm opacity-90 mt-1">الإيرادات والمصروفات والأرباح</span>
        </button>
      </div>
      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            جاري تحميل التقرير...
          </div>
        </div>
      )}
    </div>
  );
};

const MangerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    overview: {
      totalBookings: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      upcomingTrips: 0,
      busCount: 0,
      staffCount: 0
    },
    monthlyData: [],
    recentBookings: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Fetching company statistics...');
        
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/company/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Company stats:', response.data);
        
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          throw new Error(response.data.message || 'Failed to fetch statistics');
        }
      } catch (err) {
        console.error('Error fetching company statistics:', err);
        const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل إحصائيات الشركة';
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        setError(`خطأ: ${errorMessage} (${err.response?.status || 'No status'})`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <MangerLayout>
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
          <span className="mr-3">جاري التحميل...</span>
        </div>
      </MangerLayout>
    );
  }

  if (error) {
    return (
      <MangerLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">خطأ!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </MangerLayout>
    );
  }

  // Stats cards configuration for company dashboard
  const statsCards = [
    { 
      title: 'إجمالي الحجوزات', 
      value: stats.overview.totalBookings.toLocaleString('ar-EG'), 
      icon: FaCalendarCheck, 
      color: 'bg-blue-100 text-blue-600',
      trend: 'جميع الحجوزات المؤكدة'
    },
    { 
      title: 'إجمالي الإيرادات', 
      value: `${stats.overview.totalRevenue.toLocaleString('ar-EG')} ل.س`, 
      icon: FaMoneyBillWave, 
      color: 'bg-green-100 text-green-600',
      trend: 'جميع الإيرادات'
    },
    { 
      title: 'الإيرادات الشهرية', 
      value: `${stats.overview.monthlyRevenue.toLocaleString('ar-EG')} ل.س`, 
      icon: FaChartLine, 
      color: 'bg-purple-100 text-purple-600',
      trend: 'إيرادات الشهر الحالي'
    },
    { 
      title: 'الإيرادات السنوية', 
      value: `${stats.overview.yearlyRevenue.toLocaleString('ar-EG')} ل.س`, 
      icon: FaChartPie, 
      color: 'bg-yellow-100 text-yellow-600',
      trend: 'إيرادات السنة الحالية'
    },
    { 
      title: 'الرحلات القادمة', 
      value: (stats.overview.upcomingTrips || 0).toString(), 
      icon: FaRoute, 
      color: 'bg-red-100 text-red-600',
      trend: 'الرحلات المجدولة'
    },
    { 
      title: 'عدد الحافلات', 
      value: (stats.overview.busCount || 0).toString(), 
      icon: FaBus, 
      color: 'bg-indigo-100 text-indigo-600',
      trend: 'الحافلات المسجلة'
    },
    { 
      title: 'عدد الموظفين', 
      value: (stats.overview.staffCount || 0).toString(), 
      icon: FaUsers, 
      color: 'bg-teal-100 text-teal-600',
      trend: 'الموظفون في الشركة'
    },
    { 
      title: 'متوسط الإيرادات', 
      value: `${Math.round(stats.overview.totalBookings > 0 ? stats.overview.totalRevenue / stats.overview.totalBookings : 0).toLocaleString('ar-EG')} ل.س`, 
      icon: FaBuilding, 
      color: 'bg-orange-100 text-orange-600',
      trend: 'متوسط الحجز الواحد'
    }
  ];

  // Format date to Arabic
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  // Format time to 12-hour format in Arabic
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get month names in Arabic
  const getMonthName = (monthNumber) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[monthNumber - 1] || '';
  };

  const chartLabels = stats.monthlyData.map(d => getMonthName(d.month));

  const revenueChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'الإيرادات',
        data: stats.monthlyData.map(d => d.revenue),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const bookingsChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'الحجوزات',
        data: stats.monthlyData.map(d => d.bookings),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <MangerLayout>
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-right">لوحة تحكم الشركة</h1>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div key={index} className={`p-6 rounded-xl ${card.color} shadow text-right`}>
              <div className="flex flex-row-reverse justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
                  <p className="text-xs mt-2">
                    <span className="text-green-600">{card.trend}</span>
                  </p>
                </div>
                <div className="p-3 rounded-full bg-white bg-opacity-30">
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Reports Section */}
        <div className="mb-8">
          <ExportReports />
        </div>
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-xl shadow text-right">
            <div className="flex flex-row-reverse justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">الإيرادات الشهرية</h2>
              <div className="flex items-center text-sm text-green-600">
                <FaChartLine className="ml-1" />
                <span>السنة الحالية</span>
              </div>
            </div>
            <div className="h-64">
              <Line options={chartOptions} data={revenueChartData} />
            </div>
          </div>
          {/* Bookings Chart */}
          <div className="bg-white p-6 rounded-xl shadow text-right">
            <div className="flex flex-row-reverse justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">الحجوزات الشهرية</h2>
              <div className="flex items-center text-sm text-blue-600">
                <FaChartPie className="ml-1" />
                <span>السنة الحالية</span>
              </div>
            </div>
            <div className="h-64">
              <Bar options={chartOptions} data={bookingsChartData} />
            </div>
          </div>
        </div>
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow overflow-hidden text-right">
          <div className="p-6">
            <div className="flex flex-row-reverse justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">أحدث الحجوزات</h2>
              <button className="text-blue-600 text-sm font-medium">عرض الكل</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الرحلة</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد المسافرين</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">الإجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.trip ? `${booking.trip.origin} - ${booking.trip.destination}` : 'رحلة غير محددة'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.trip ? formatDate(booking.trip.departureDate) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {booking.passengers} مسافر
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {booking.amount} ل.س
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(booking.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="#" className="text-blue-600 hover:text-blue-900">التفاصيل</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MangerLayout>
  );
};

export default MangerDashboard;
