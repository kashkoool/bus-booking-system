import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FaSave, 
  FaTimes, 
  FaRoute, 
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner, 
  FaBus,
  FaCalendarAlt,
  FaCity,
  FaMoneyBillWave,
  FaChair,
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';
import { useAuth } from '../../context/AuthContext';

const syrianCities = [
  'كل المدن', 'دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'الرقة', 'دير الزور', 'الحسكة', 'القامشلي', 'طرطوس', 'إدلب'
];

const AddTripPage = () => {
  const { user: staff } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    busId: '',
    departureCity: '',
    departureDate: '',
    arrivalCity: '',
    arrivalDate: '',
    price: 100,
    duration: 4
  });
  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBuses, setFetchingBuses] = useState(true);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // جلب الباصات المتاحة
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setFetchingBuses(true);
        const token = localStorage.getItem('token');
        
        const response = await axios.get(
          'http://localhost:5001/api/shared/show-buses',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data && Array.isArray(response.data)) {
          setBuses(response.data);
        } else {
          throw new Error('هيكل البيانات غير متوقع. الرجاء التحقق من نقطة النهاية.');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'فشل في تحميل بيانات الباصات';
        setErrors({ general: errorMsg });
        console.error('Error fetching buses:', err);
      } finally {
        setFetchingBuses(false);
      }
    };

    fetchBuses();
  }, []);

  const handleBusChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
    }));
    
    if (errors.busId) {
      setErrors(prev => ({ ...prev, busId: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    console.log('Validating form with data:', formData);
    const newErrors = {};
    
    if (!formData.busId) {
      console.log('Validation failed: busId is missing');
      newErrors.busId = 'اختيار باص مطلوب';
    }
    
    if (!formData.departureCity.trim()) {
      console.log('Validation failed: departureCity is missing');
      newErrors.departureCity = 'مدينة المغادرة مطلوبة';
    }
    
    if (!formData.departureDate) {
      console.log('Validation failed: departureDate is missing');
      newErrors.departureDate = 'تاريخ المغادرة مطلوب';
    } else if (new Date(formData.departureDate) < new Date()) {
      console.log('Validation failed: departureDate is in the past');
      newErrors.departureDate = 'تاريخ المغادرة يجب أن يكون في المستقبل';
    }
    
    if (!formData.arrivalCity.trim()) {
      console.log('Validation failed: arrivalCity is missing');
      newErrors.arrivalCity = 'مدينة الوصول مطلوبة';
    }
    
    if (!formData.arrivalDate) {
      console.log('Validation failed: arrivalDate is missing');
      newErrors.arrivalDate = 'تاريخ الوصول مطلوب';
    } else if (new Date(formData.arrivalDate) <= new Date(formData.departureDate)) {
      console.log('Validation failed: arrivalDate is not after departureDate');
      newErrors.arrivalDate = 'تاريخ الوصول يجب أن يكون بعد تاريخ المغادرة';
    }
    
    if (!formData.price || formData.price <= 0) {
      console.log('Validation failed: price is invalid');
      newErrors.price = 'السعر يجب أن يكون أكبر من الصفر';
    }
    
    console.log('Validation errors found:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      setErrors(prev => ({ ...prev, general: 'Please fix the errors in the form before submitting.' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!staff || !staff.companyID) {
        throw new Error('Could not determine your company. Please log in again.');
      }
      
      const selectedBus = buses.find(bus => bus._id === formData.busId);
      if (!selectedBus) {
        throw new Error('The selected bus could not be found.');
      }

      const data = {
        busNumber: selectedBus.busNumber,
        origin: formData.departureCity,
        destination: formData.arrivalCity,
        departureDate: formData.departureDate,
        arrivalDate: formData.arrivalDate,
        departureTime: formData.departureDate?.split('T')[1]?.slice(0,5) || '',
        arrivalTime: formData.arrivalDate?.split('T')[1]?.slice(0,5) || '',
        cost: formData.price
      };

      const response = await axios.post(
        'http://localhost:5001/api/shared/add-trip',
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccessMessage('Trip added successfully!');
        setTimeout(() => {
          navigate('/staff/trip');
        }, 1500);
      } else {
        throw new Error(response.data?.message || 'An unknown error occurred.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while adding the trip.';
      setErrors({ general: errorMessage });
      console.error('Error adding trip:', err);
    } finally {
      setLoading(false);
    }
  };

  // تنسيق التاريخ والوقت للتنسيق المحلي
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <FaRoute className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">إضافة رحلة جديدة</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/staff/trip')}
              className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaTimes className="mr-2" />
              إلغاء
            </button>
            <Link
              to="/staff/trip"
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FaRoute className="mr-2" />
              قائمة الرحلات
            </Link>
          </div>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">حدث خطأ</h3>
                <p className="text-sm text-red-700 mt-1">{errors.general}</p>
              </div>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-start">
              <FaInfoCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">نجاح</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                <Link to="/staff/trip" className="text-blue-600 hover:underline mt-2 inline-block">الذهاب إلى قائمة الرحلات</Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* قسم معلومات الرحلة */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaRoute className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">معلومات الرحلة</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اختيار الباص */}
              <div className="md:col-span-2">
                <label htmlFor="busId" className="block text-sm font-medium text-gray-700 mb-2">
                  الباص <span className="text-red-500">*</span>
                </label>
                
                {fetchingBuses ? (
                  <div className="flex items-center justify-center py-8">
                    <FaSpinner className="animate-spin text-blue-500 mr-3" />
                    <p>جاري تحميل بيانات الباصات...</p>
                  </div>
                ) : buses.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          لا يوجد باصات نشطة متاحة. الرجاء إضافة باص أولاً أو تفعيل الباصات.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    id="busId"
                    name="busId"
                    value={formData.busId}
                    onChange={handleBusChange}
                    className={`w-full py-3 pl-3 pr-10 border ${errors.busId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                  >
                    <option value="">-- اختر باصًا --</option>
                    {buses.map(bus => (
                      <option key={bus._id} value={bus._id}>
                        {bus.busNumber} - {bus.model} ({bus.seats} مقعدًا)
                      </option>
                    ))}
                  </select>
                )}
                
                {errors.busId && <p className="mt-1 text-sm text-red-600">{errors.busId}</p>}
              </div>
            </div>
          </div>

          {/* قسم المغادرة */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaCity className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">محطة المغادرة</h2>
            </div>
            
            <div className="flex flex-wrap -mx-3 mb-6">
              <div className="w-full md:w-1/2 px-3 mb-6">
                <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="departureCity">
                  <FaCity className="inline-block mr-2" />
                  مدينة المغادرة *
                </label>
                <select
                  id="departureCity"
                  name="departureCity"
                  value={formData.departureCity}
                  onChange={handleChange}
                  className={`appearance-none block w-full bg-gray-200 text-gray-700 border ${errors.departureCity ? 'border-red-500' : 'border-gray-200'} rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500`}
                >
                  <option value="">-- اختر مدينة --</option>
                  {syrianCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.departureCity && <p className="text-red-500 text-xs italic mt-1">{errors.departureCity}</p>}
              </div>

              <div className="w-full md:w-1/2 px-3 mb-6">
                <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="arrivalCity">
                  <FaCity className="inline-block mr-2" />
                  مدينة الوصول *
                </label>
                <select
                  id="arrivalCity"
                  name="arrivalCity"
                  value={formData.arrivalCity}
                  onChange={handleChange}
                  className={`appearance-none block w-full bg-gray-200 text-gray-700 border ${errors.arrivalCity ? 'border-red-500' : 'border-gray-200'} rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500`}
                >
                  <option value="">-- اختر مدينة --</option>
                  {syrianCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.arrivalCity && <p className="text-red-500 text-xs italic mt-1">{errors.arrivalCity}</p>}
              </div>
            </div>

            {/* Departure and Arrival Dates */}
            <div className="flex flex-wrap -mx-3 mb-6">
              {/* تاريخ ووقت المغادرة */}
              <div className="w-full md:w-1/2 px-3 mb-6">
                <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ ووقت المغادرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="departureDate"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={handleChange}
                  min={formatDateTimeLocal(new Date())}
                  className={`w-full px-4 py-3 border ${errors.departureDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.departureDate && <p className="mt-1 text-sm text-red-600">{errors.departureDate}</p>}
              </div>
              
              {/* تاريخ ووقت الوصول */}
              <div className="w-full md:w-1/2 px-3 mb-6">
                <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ ووقت الوصول <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  min={formData.departureDate}
                  className={`w-full px-4 py-3 border ${errors.arrivalDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.arrivalDate && <p className="mt-1 text-sm text-red-600">{errors.arrivalDate}</p>}
              </div>
            </div>
          </div>

          {/* قسم التكاليف والمقاعد */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaMoneyBillWave className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">التكاليف والمقاعد</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* سعر التذكرة */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  سعر التذكرة (ر.س) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-3 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>
              
              {/* مدة الرحلة */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  مدة الرحلة (ساعات) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-3 border ${errors.duration ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading || fetchingBuses || buses.length === 0}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  جاري إضافة الرحلة...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  إضافة الرحلة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
};

export default AddTripPage; 