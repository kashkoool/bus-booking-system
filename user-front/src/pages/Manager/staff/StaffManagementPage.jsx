// src/pages/manager/staff/StaffManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserTie, 
  FaUser,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSort,
  FaFilter,
  FaCar,
  FaPlus,
  FaEye
} from 'react-icons/fa';
import ManagerLayout from '../../../layouts/MangerLayout';
import { companyApi } from '../../../utils/api';

const StaffManagementPage = () => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [togglingStatus, setTogglingStatus] = useState({}); // لحالة التبديل لكل موظف
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Fetch staff members from the server
  const fetchStaffMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      const response = await companyApi.getStaff();
      console.log('Staff API Response:', response.data);
      const staffData = response.data?.data || [];
      console.log('Staff Data:', staffData);
      setStaffMembers(staffData);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load staff data';
      setError(errorMsg);
      console.error('Error fetching staff members:', err);
      
      // Set empty array if 404 (endpoint not found)
      if (err.response?.status === 404) {
        setStaffMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  // البحث والتصفية
  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = 
      staff.username?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      staff.phone?.includes(searchTerm);
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && staff.status === 'active') ||
      (filterStatus === 'suspended' && staff.status === 'suspended');
    
    return matchesSearch && matchesStatus;
  });

  // الترتيب
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const valA = a[sortConfig.key] || '';
    const valB = b[sortConfig.key] || '';
    
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

  // Toggle staff status between active and suspended
  const toggleStaffStatus = async (staffId, currentStatus) => {
    try {
      // Toggle between 'active' and 'suspended'
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      
      // Update toggling state for this staff member
      setTogglingStatus(prev => ({ ...prev, [staffId]: true }));
      
      // Send status update to the backend
      const response = await companyApi.updateStaff(staffId, { 
        status: newStatus
      });
      
      if (response.data?.success) {
        // Update the staff member in the UI with the new status
        setStaffMembers(prev => prev.map(staff => 
          staff._id === staffId ? { 
            ...staff,
            status: newStatus
          } : staff
        ));
        
        setSuccessMessage(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعليق'} الحساب بنجاح`);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error toggling staff status:', err);
      const errorMsg = err.response?.data?.message || 'حدث خطأ أثناء تحديث حالة الموظف';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      // Reset toggling state
      setTogglingStatus(prev => ({ ...prev, [staffId]: false }));
    }
  };

  // Delete staff member
  const deleteStaff = async (staffId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموظف؟ سيتم حذف جميع البيانات المرتبطة به.')) {
      return;
    }
    
    try {
      const response = await companyApi.deleteStaff(staffId);
      if (response.data?.success) {
        setStaffMembers(staffMembers.filter(staff => staff._id !== staffId));
        setSuccessMessage('تم حذف الموظف بنجاح');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
      const errorMsg = err.response?.data?.message || err.message || 'فشل في حذف الموظف';
      setError(errorMsg);
    }
  };

  // عرض تفاصيل الموظف
  const viewStaffDetails = (staffId) => {
    navigate(`/manager/staff/${staffId}`);
  };
  
  // تحرير الموظف
  const editStaff = (staffId, e) => {
    if (e) e.stopPropagation();
    navigate(`/manager/staff/edit/${staffId}`);
  };
  
  // إضافة موظف جديد
  const addNewStaff = () => {
    navigate('/manager/staff/add');
  };

  // الحسابات للترقيم الصفحي
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedStaff.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);

  // تغيير الصفحة
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // الحصول على أيقونة لنوع الموظف
  const getStaffTypeIcon = (type) => {
    switch (type) {
      case 'driver':
        return <FaCar className="text-blue-500" />;
      case 'supervisor':
        return <FaUser className="text-green-500" />;
      case 'accountant':
        return <FaUser className="text-purple-500" />;
      default:
        return <FaUser className="text-gray-500" />;
    }
  };

  // Get staff type text in Arabic
  const getStaffTypeText = (type) => {
    switch (type) {
      case 'driver':
        return 'سائق';
      case 'supervisor':
        return 'مشرف';
      case 'accountant':
        return 'محاسب';
      case 'employee':
        return 'موظف';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-3 text-gray-600">Loading staff data...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">إدارة الموظفين</h1>
            <p className="mt-1 text-gray-600">عرض وإدارة جميع موظفي شركتك</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={addNewStaff}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <FaPlus className="ml-2" />
              إضافة موظف جديد
            </button>
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
                  placeholder="ابحث بالاسم، البريد، أو الهاتف..."
                  className="block w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* تصفية حسب الحالة */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">حالة الموظف</label>
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
                  <option value="active">نشط فقط</option>
                  <option value="suspended">موقوف</option>
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

        {/* جدول الموظفين */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الاسم
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('email')}
                  >
                    <div className="flex items-center justify-end">
                      <span>البريد الإلكتروني</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الهاتف
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع الموظف
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('createdAt')}
                  >
                    <div className="flex items-center justify-end">
                      <span>تاريخ التسجيل</span>
                      <FaSort className="mr-1 text-gray-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((staff) => (
                    <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-100 border border-gray-300 rounded-full w-10 h-10 flex items-center justify-center text-gray-500">
                            <FaUserTie className="text-gray-400" />
                          </div>
                          <div className="mr-3">
                            <div className="text-sm font-medium text-gray-900">{staff.username || 'غير محدد'}</div>
                            <div className="text-sm text-gray-500">{staff.gender === 'male' ? 'ذكر' : staff.gender === 'female' ? 'أنثى' : 'غير محدد'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStaffTypeIcon(staff.staffType)}
                          <span className="mr-2 text-sm text-gray-700">
                            {getStaffTypeText(staff.staffType || 'employee')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          console.log('Staff member:', staff.username, 'createdAt:', staff.createdAt);
                          try {
                            if (!staff.createdAt) return 'غير محدد';
                            const date = new Date(staff.createdAt);
                            if (isNaN(date.getTime())) return 'تاريخ غير صالح';
                            return date.toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              calendar: 'gregory',
                              numberingSystem: 'arab'
                            });
                          } catch (error) {
                            console.error('Error formatting date:', error);
                            return 'خطأ في التاريخ';
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStaffStatus(staff._id, staff.status)}
                          disabled={togglingStatus[staff._id]}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                            staff.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        >
                          <span
                            className={`${
                              staff.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                          <span className="sr-only">
                            {staff.status === 'active' ? 'نشط' : 'موقوف'}
                          </span>
                        </button>
                        <span className="mr-2 text-sm text-gray-600">
                          {staff.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewStaffDetails(staff._id)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={(e) => editStaff(staff._id, e)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 transition-colors"
                            title="تعديل"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => deleteStaff(staff._id)}
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
                        <FaUserTie className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد موظفون</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          لم يتم العثور على موظفين يطابقون معايير البحث
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setSortConfig({ key: null, direction: 'ascending' });
                          }}
                          className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          عرض جميع الموظفين
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
                      {indexOfLastItem > sortedStaff.length ? sortedStaff.length : indexOfLastItem}
                    </span>{' '}
                    من <span className="font-medium">{sortedStaff.length}</span> موظفين
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

export default StaffManagementPage;