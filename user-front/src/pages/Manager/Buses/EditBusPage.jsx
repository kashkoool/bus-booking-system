// src/pages/manager/bus/EditBusPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaArrowRight, FaBus, FaUser, FaSpinner, FaSave } from 'react-icons/fa';
import axios from 'axios';
import ManagerLayout from '../../../layouts/MangerLayout';
import { useAuth } from '../../../context/AuthContext';

const EditBusPage = () => {
  // Get auth context, including the loading state
  const { user, loading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    busNumber: '',
    busType: 'standard',
    driverId: '',
  });

  const busTypeOptions = [
    { value: 'standard', label: 'عادي' },
    { value: 'premium', label: 'مميز' },
    { value: 'luxury', label: 'فاخر' },
    { value: 'sleeper', label: 'نوم' }
  ];

  const [drivers, setDrivers] = useState([]);
  const [fetchingDrivers, setFetchingDrivers] = useState(false);
  const [fetchingBus, setFetchingBus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Fetch bus data and available drivers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingBus(true);
        setError('');
        setSuccessMessage('');
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in.');
          setFetchingBus(false);
          return;
        }

        // Fetch bus data
        const busResponse = await axios.get(
          `http://localhost:5001/api/company/buses/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (busResponse.data) {
          const bus = busResponse.data;
          setFormData({
            busNumber: bus.busNumber || '',
            busType: bus.busType || 'standard',
            driverId: bus.driver?._id || bus.driver || '',
          });
        }

        // Fetch available drivers
        setFetchingDrivers(true);
        const driversResponse = await axios.get(
          'http://localhost:5001/api/company/staff',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const staffData = driversResponse.data.data || [];
        const driverStaff = staffData.filter(staff => 
          staff.staffType === 'driver' && staff.status === 'active'
        );

        setDrivers(driverStaff);

        // If no driver is currently assigned and there are drivers available, pre-select the first one
        if (!formData.driverId && driverStaff.length > 0) {
          setFormData(prev => ({ ...prev, driverId: driverStaff[0]._id }));
        }

      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'فشل في تحميل البيانات';
        setError(errorMsg);
        console.error('Error fetching data:', err);
      } finally {
        setFetchingBus(false);
        setFetchingDrivers(false);
      }
    };

    // Only fetch data if user data is not loading and user exists
    if (!loading && user && id) {
      fetchData();
    }
  }, [loading, user, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.busNumber.trim()) {
      newErrors.busNumber = 'رقم الباص مطلوب';
    }

    // Only require driver selection if there are drivers available
    if (drivers.length > 0 && !formData.driverId) {
      newErrors.driverId = 'الرجاء اختيار سائق';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submitting) return;
    
    // Validate form
    if (loading) {
      setError('جاري تحميل بيانات المستخدم. يرجى الانتظار.');
      return;
    }

    if (!user) {
      setError('لم يتم العثور على معلومات المستخدم. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }

      const companyID = user.companyID || user._id;
      if (!companyID) {
        throw new Error('Could not determine your company. Please make sure you are properly associated with a company.');
      }

      const data = {
        busNumber: formData.busNumber,
        busType: formData.busType,
        driver: formData.driverId || null
      };

      console.log('Sending bus update data to server:', data);

      const response = await axios.put(
        `http://localhost:5001/api/company/buses/${id}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Update bus response:', response.data);

      if (response.data) {
        setSuccessMessage('تم تحديث الباص بنجاح!');
        setTimeout(() => {
          navigate('/manager/buses');
        }, 1500);
      } else {
        setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error('Error updating bus:', err);
      let errorMessage = 'حدث خطأ أثناء تحديث الباص';

      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'بيانات غير صالحة. يرجى التحقق من المدخلات.';
        } else if (err.response.status === 401) {
          errorMessage = 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.';
        } else if (err.response.status === 404) {
          errorMessage = 'الباص غير موجود.';
        } else if (err.response.status === 500) {
          errorMessage = 'خطأ في الخادم الداخلي. الرجاء المحاولة لاحقاً.';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = 'لم يتم تلقي رد من الخادم. الرجاء التحقق من اتصال الشبكة';
      } else {
        errorMessage = err.message || 'خطأ في إعداد الطلب';
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Show a loading indicator for the entire page if user data is still being fetched
  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center h-screen">
          <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          <p className="ml-3 text-lg text-gray-700">جاري تحميل بيانات المستخدم...</p>
        </div>
      </ManagerLayout>
    );
  }

  // Show loading while fetching bus data
  if (fetchingBus) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center h-screen">
          <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          <p className="ml-3 text-lg text-gray-700">جاري تحميل بيانات الباص...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">تعديل بيانات الباص</h1>
          <button
            onClick={() => navigate('/manager/buses')}
            className="flex items-center px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FaArrowRight className="ml-2" />
            رجوع لقائمة الباصات
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center">
              <FaExclamationTriangle className="ml-2" />
              {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <div className="flex items-center">
              <FaCheckCircle className="ml-2" />
              {successMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* قسم معلومات الباص */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaBus className="text-blue-500 text-xl ml-2" />
              <h2 className="text-xl font-semibold text-gray-800">معلومات الباص</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* رقم الباص */}
              <div>
                <label htmlFor="busNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الباص <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="busNumber"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="أدخل رقم الباص"
                  disabled={submitting}
                  required
                />
                {formErrors.busNumber && <p className="mt-1 text-sm text-red-600">{formErrors.busNumber}</p>}
              </div>

              {/* نوع الباص */}
              <div>
                <label htmlFor="busType" className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الباص <span className="text-red-500">*</span>
                </label>
                <select
                  id="busType"
                  name="busType"
                  value={formData.busType}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${formErrors.busType ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  {busTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.busType && <p className="mt-1 text-sm text-red-600">{formErrors.busType}</p>}
              </div>
            </div>
          </div>

          {/* قسم السائق */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaUser className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">اختيار السائق</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اختيار السائق */}
              <div className="md:col-span-2">
                <label htmlFor="driverId" className="block text-sm font-medium text-gray-700 mb-2">
                  السائق <span className="text-red-500">*</span>
                </label>

                {fetchingDrivers ? (
                  <div className="flex items-center justify-center py-8">
                    <FaSpinner className="animate-spin text-blue-500 mr-3" />
                    <p>جاري تحميل بيانات السائقين...</p>
                  </div>
                ) : drivers.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          لا يوجد سائقون متاحون. الرجاء إضافة سائق أولاً.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    id="driverId"
                    name="driverId"
                    value={formData.driverId}
                    onChange={handleChange}
                    className={`w-full py-3 pl-3 pr-10 border ${formErrors.driverId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                  >
                    <option value="">اختر سائقاً</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.username} - {driver.phone}
                      </option>
                    ))}
                  </select>
                )}

                {formErrors.driverId && <p className="mt-1 text-sm text-red-600">{formErrors.driverId}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={submitting || loading || !user}
              className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${submitting || loading || !user ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري التحديث...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  تحديث الباص
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ManagerLayout>
  );
};

export default EditBusPage;