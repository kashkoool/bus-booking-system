// src/pages/manager/buses/BusesListPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companyApi } from '../../../utils/api';
import { 
  FaBus, 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaToggleOn, 
  FaToggleOff,
  FaSort,
  FaFilter,
  FaUserAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import ManagerLayout from '../../../layouts/MangerLayout';

const BusesListPage = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [togglingStatus, setTogglingStatus] = useState({});
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // جلب بيانات الباصات من الخادم
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        
        const response = await companyApi.getBuses();

        // التحقق من هيكل البيانات المرتجع
        let busesData = [];
        
        if (Array.isArray(response.data)) {
          busesData = response.data;
        } else if (response.data && Array.isArray(response.data.buses)) {
          // Fallback in case the backend changes the response structure
          busesData = response.data.buses;
        } else {
          console.log("هيكل البيانات غير متوقع:", response.data);
          throw new Error('هيكل البيانات غير متوقع. الرجاء التحقق من نقطة النهاية.');
        }
        
        setBuses(busesData);
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'فشل في تحميل بيانات الباصات';
        setError(errorMsg);
        console.error('Error fetching buses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
  }, []);

  // البحث والتصفية
  const filteredBuses = buses.filter(bus => {
    const matchesSearch = 
      bus.busNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      bus.model?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      (bus.driver && `${bus.driver.firstName} ${bus.driver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && bus.isActive) ||
      (filterStatus === 'inactive' && !bus.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // الترتيب
  const sortedBuses = [...filteredBuses].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let valA, valB;
    
    if (sortConfig.key === 'driver') {
      valA = a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : '';
      valB = b.driver ? `${b.driver.firstName} ${b.driver.lastName}` : '';
    } else {
      valA = a[sortConfig.key] || '';
      valB = b[sortConfig.key] || '';
    }
    
    if (valA < valB) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (valA > valB) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // تغيير الترتيب
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // التبديل بين حالات النشاط
  const toggleBusStatus = async (busId, currentStatus) => {
    try {
      // تحديث حالة التبديل لهذا الباص
      setTogglingStatus(prev => ({ ...prev, [busId]: true }));
      
      await companyApi.toggleBusStatus(busId);
      
      // تحديث حالة الباص في الواجهة
      setBuses(buses.map(bus => 
        bus._id === busId ? { ...bus, isActive: !currentStatus } : bus
      ));
      
      setSuccessMessage(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} الباص بنجاح`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling bus status:', err);
      const errorMsg = err.response?.data?.message || 'فشل في تغيير حالة الباص';
      setError(errorMsg);
    } finally {
      // إعادة تعيين حالة التبديل
      setTogglingStatus(prev => ({ ...prev, [busId]: false }));
    }
  };

  // حذف الباص
  const deleteBus = async (busId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا الباص؟ سيتم حذف جميع البيانات المرتبطة به بما في ذلك الرحلات.')) {
      return;
    }
    
    try {
      await companyApi.deleteBus(busId);
      setBuses(buses.filter(bus => bus._id !== busId));
      setSuccessMessage('تم حذف الباص بنجاح');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting bus:', err);
      const errorMsg = err.response?.data?.message || err.message || 'فشل في حذف الباص';
      setError(errorMsg);
    }
  };

  // عرض تفاصيل الباص
  const viewBusDetails = (busId) => {
    navigate(`/manager/bus/view/${busId}`);
  };

  // تحرير الباص
  const editBus = (busId) => {
    navigate(`/manager/buses/edit/${busId}`);
  };

  // الحسابات للترقيم الصفحي
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedBuses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedBuses.length / itemsPerPage);

  // تغيير الصفحة
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-3 text-gray-600">جاري تحميل بيانات الباصات...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        {/* العنوان وأزرار الإجراءات */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الباصات</h1>
            <p className="mt-1 text-gray-600">عرض وإدارة جميع باصات شركتك في النظام</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link 
              to="/manager/buses/add" 
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <FaPlus className="ml-2" />
              إضافة باص جديد
            </Link>
          </div>
        </div>

        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
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
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* أدوات البحث والتصفية */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* حقل البحث */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">بحث</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="ابحث برقم الباص، الموديل، أو اسم السائق..."
                  className="block w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* تصفية حسب الحالة */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">حالة الباص</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  className="appearance-none block w-full py-2.5 pl-3 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="active">نشطة فقط</option>
                  <option value="inactive">غير نشطة</option>
                </select>
              </div>
            </div>
            
            {/* زر التصفية */}
            <div className="flex-1 flex justify-end">
              <div className="flex flex-col w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1 invisible">زر</label>
                <button
                  className="flex items-center justify-center w-full py-2.5 px-4 border border-blue-500 rounded-lg text-blue-600 hover:bg-blue-50 bg-white transition-colors shadow-sm hover:shadow-md"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setSortConfig({ key: null, direction: 'ascending' });
                  }}
                >
                  <FaFilter className="mr-2" />
                  إعادة تعيين الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* جدول الباصات */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('busNumber')}
                  >
                    <div className="flex items-center justify-end">
                      <span>رقم الباص</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('model')}
                  >
                    <div className="flex items-center justify-end">
                      <span>موديل الباص</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('seats')}
                  >
                    <div className="flex items-center justify-end">
                      <span>السعة</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('driver')}
                  >
                    <div className="flex items-center justify-end">
                      <span>السائق</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((bus) => (
                    <tr key={bus._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaBus className="text-blue-500 mr-2" />
                          <div className="text-sm font-medium text-gray-900">{bus.busNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bus.model}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-semibold">{bus.seats ? bus.seats: 'غير محدد'}</span> مقعد
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bus.driver ? (
                          <div>
                            <div className="flex items-center">
                              <FaUserAlt className="text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {bus.driver.firstName} {bus.driver.lastName}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {bus.driver.phone}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-500">
                            <FaExclamationTriangle className="mr-2" />
                            <span className="text-sm">لا يوجد سائق</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewBusDetails(bus._id)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => editBus(bus._id)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 transition-colors"
                            title="تعديل"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteBus(bus._id)}
                            className="text-red-600 hover:text-red-900 p-1 transition-colors"
                            title="حذف"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="text-gray-500 py-8">
                        <FaBus className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد باصات</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          لم يتم العثور على باصات تطابق معايير البحث
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setSortConfig({ key: null, direction: 'ascending' });
                          }}
                          className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          عرض جميع الباصات
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* الترقيم الصفحي */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    عرض <span className="font-medium">{indexOfFirstItem + 1}</span> إلى{' '}
                    <span className="font-medium">
                      {indexOfLastItem > sortedBuses.length ? sortedBuses.length : indexOfLastItem}
                    </span>{' '}
                    من <span className="font-medium">{sortedBuses.length}</span> باص
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      السابق
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === number
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      التالي
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
};

export default BusesListPage;