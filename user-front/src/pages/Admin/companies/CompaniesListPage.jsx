import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaBuilding, 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaToggleOn, 
  FaToggleOff,
  FaSort,
  FaFilter,
  FaExclamationTriangle,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaBell
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import AdminLayout from '../../../layouts/AdminLayout';
import NotificationModal from '../../../components/admin/NotificationModal';

const API_BASE_URL = 'http://localhost:5001/api/admin';

const CompaniesListPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingStatus, setTogglingStatus] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Fetch companies from the server
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/showcompanies`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data && Array.isArray(response.data)) {
          // Transform data to match the expected format
          const formattedCompanies = response.data.map(company => ({
            id: company._id,
            name: company.companyName,
            email: company.email,
            phone: company.phone,
            status: company.status || 'pending',
            createdAt: company.createdAt,
            manager: company.username || 'N/A',
            address: company.address || 'N/A',
            companyID: company.companyID || 'N/A',
            logo: company.logo || null,
            isActive: company.status === 'active'
          }));
          setCompanies(formattedCompanies);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
        const errorMessage = error.response?.data?.message || 'Failed to fetch companies';
        setError(errorMessage);
        
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [navigate]);

  // Toggle company status (active/suspended)
  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      setTogglingStatus(prev => ({ ...prev, [companyId]: true }));
      const token = localStorage.getItem('token');
      
      // Determine the action based on current status
      const endpoint = currentStatus === 'active' 
        ? `${API_BASE_URL}/companies/${companyId}/suspend`
        : `${API_BASE_URL}/companies/${companyId}/activate`;
      
      await axios.put(
        endpoint,
        {},
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        }
      );
      
      // Update local state
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      setCompanies(companies.map(company => 
        company.id === companyId 
          ? { 
              ...company, 
              status: newStatus, 
              isActive: newStatus === 'active' 
            } 
          : company
      ));
      
      toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} الشركة بنجاح`);
    } catch (error) {
      console.error('Error toggling company status:', error);
      const errorMessage = error.response?.data?.message || 'فشل في تحديث حالة الشركة';
      
      if (error.response?.status === 401) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
      toast.error(errorMessage);
    } finally {
      setTogglingStatus(prev => ({ ...prev, [companyId]: false }));
    }
  };

  // Delete a company
  const deleteCompany = async (companyId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه الشركة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      setDeletingId(companyId);
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_BASE_URL}/Deletecompanies/${companyId}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update local state
      setCompanies(companies.filter(company => company.id !== companyId));
      toast.success('تم حذف الشركة بنجاح');
    } catch (error) {
      console.error('Error deleting company:', error);
      const errorMessage = error.response?.data?.message || 'فشل في حذف الشركة';
      toast.error(errorMessage);
      
      if (error.response?.status === 401) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting and filtering
  const getSortedAndFilteredItems = () => {
    let filteredCompanies = [...companies];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filteredCompanies = filteredCompanies.filter(company => 
        filterStatus === 'active' ? company.status === 'active' : company.status === 'suspended'
      );
    }
    
    // Apply search
    if (searchTerm) {
      filteredCompanies = filteredCompanies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.phone.includes(searchTerm) ||
        (company.companyID && company.companyID.toString().toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filteredCompanies.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle potential undefined values
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredCompanies;
  };

  // Pagination logic
  const sortedAndFilteredCompanies = getSortedAndFilteredItems();
  const totalPages = Math.ceil(sortedAndFilteredCompanies.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAndFilteredCompanies.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle company selection
  const handleSelectCompany = (companyId) => {
    setSelectedCompanies(prevSelected => {
      if (prevSelected.includes(companyId)) {
        return prevSelected.filter(id => id !== companyId);
      } else {
        return [...prevSelected, companyId];
      }
    });
  };

  // Handle select all companies on the current page
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allCompanyIdsOnPage = currentItems.map(c => c.companyID);
      setSelectedCompanies(allCompanyIdsOnPage);
    } else {
      setSelectedCompanies([]);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-2xl text-blue-500 mr-2" />
          <span>Loading companies...</span>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">إدارة الشركات</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setNotificationModalOpen(true)}
              disabled={selectedCompanies.length === 0}
              className="flex items-center bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FaBell className="ml-2" />
              <span>إرسال إشعار ({selectedCompanies.length})</span>
            </button>
            <Link
              to="/admin/companies/add"
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="ml-2" />
              <span>إضافة شركة</span>
            </Link>
          </div>
        </div>

        {/* Search and filter section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">بحث</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ابحث عن شركة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حالة الشركة</label>
              <select
                className="block w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">الكل</option>
                <option value="active">نشطة</option>
                <option value="suspended">موقوفة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Companies table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    <input 
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      onChange={handleSelectAll}
                      checked={currentItems.length > 0 && selectedCompanies.length === currentItems.length}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center justify-end">
                      اسم الشركة
                      <FaSort className="mr-1" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المعرف
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    البريد الإلكتروني
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الهاتف
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الحالة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    تاريخ الإنشاء
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">إجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((company) => (
                    <tr key={company.id} className={`hover:bg-gray-50 ${selectedCompanies.includes(company.companyID) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedCompanies.includes(company.companyID)}
                          onChange={() => handleSelectCompany(company.companyID)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full overflow-hidden">
                            {company.logo ? (
                              <img 
                                src={`http://localhost:5001${company.logo}`}
                                alt={company.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`h-full w-full flex items-center justify-center ${company.logo ? 'hidden' : 'flex'}`}>
                              <FaBuilding className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            <div className="text-sm text-gray-500">{company.manager}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.companyID}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {company.status === 'active' ? 'نشطة' : 'موقوفة'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(company.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => toggleCompanyStatus(company.id, company.status)}
                            disabled={togglingStatus[company.id]}
                            className={`p-1 rounded ${
                              company.status === 'active'
                                ? 'text-yellow-600 hover:text-yellow-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={company.status === 'active' ? 'تعطيل' : 'تفعيل'}
                          >
                            {togglingStatus[company.id] ? (
                              <FaSpinner className="animate-spin" />
                            ) : company.status === 'active' ? (
                              <FaToggleOff className="h-5 w-5" />
                            ) : (
                              <FaToggleOn className="h-5 w-5" />
                            )}
                          </button>
                          <Link
                            to={`/admin/companies/${company.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="عرض التفاصيل"
                          >
                            <FaEye className="h-5 w-5" />
                          </Link>
                          <Link
                            to={`/admin/companies/edit/${company.id}`}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="تعديل"
                          >
                            <FaEdit className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => deleteCompany(company.id)}
                            disabled={deletingId === company.id}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="حذف"
                          >
                            {deletingId === company.id ? (
                              <FaSpinner className="animate-spin h-5 w-5" />
                            ) : (
                              <FaTrash className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      لا توجد شركات متاحة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    عرض <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> إلى{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, sortedAndFilteredCompanies.length)}
                    </span>{' '}
                    من <span className="font-medium">{sortedAndFilteredCompanies.length}</span> نتائج
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">السابق</span>
                      <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">التالي</span>
                      <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <NotificationModal 
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setNotificationModalOpen(false);
          setSelectedCompanies([]);
        }}
        companyIds={selectedCompanies}
      />
    </AdminLayout>
  );
};

export default CompaniesListPage;
