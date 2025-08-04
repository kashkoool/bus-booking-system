import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import StaffLayout from '../../layouts/StaffLayout';
import { useAuth } from '../../context/AuthContext';

const syrianCities = [
  'كل المدن', 'دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'الرقة', 'دير الزور', 'الحسكة', 'القامشلي', 'طرطوس', 'إدلب'
];

const EditTripPage = () => {
  const { id } = useParams();
  const { user: staff } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    busNumber: '',
    origin: '',
    destination: '',
    departureDate: '',
    arrivalDate: '',
    departureTime: '',
    arrivalTime: '',
    cost: 100,
    status: 'scheduled'
  });
  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBuses, setFetchingBuses] = useState(true);
  const [fetchingTrip, setFetchingTrip] = useState(true);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [tripStatus, setTripStatus] = useState('scheduled');

  // Check if trip is restricted from editing
  const isTripRestricted = tripStatus === 'in-progress' || tripStatus === 'completed';
  const restrictedFields = ['busNumber', 'origin', 'destination', 'departureDate', 'arrivalDate'];

  // Fetch trip data and available buses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingTrip(true);
        setErrors({});
        setSuccessMessage('');
        
        const token = localStorage.getItem('token');
        if (!token) {
          setErrors({ general: 'Authentication token not found. Please log in.' });
          setFetchingTrip(false);
          return;
        }

        // Fetch trip data
        const tripResponse = await axios.get(
          `http://localhost:5001/api/shared/Get-trip/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (tripResponse.data && tripResponse.data.success) {
          const trip = tripResponse.data.trip;
          setFormData({
            busNumber: trip.busNumber || '',
            origin: trip.origin || '',
            destination: trip.destination || '',
            departureDate: trip.departureDate ? new Date(trip.departureDate).toISOString().split('T')[0] : '',
            arrivalDate: trip.arrivalDate ? new Date(trip.arrivalDate).toISOString().split('T')[0] : '',
            departureTime: trip.departureTime || '',
            arrivalTime: trip.arrivalTime || '',
            cost: trip.cost || 100,
            status: trip.status || 'scheduled'
          });
          setTripStatus(trip.status || 'scheduled');
        }

        // Fetch available buses
        setFetchingBuses(true);
        const busesResponse = await axios.get(
          'http://localhost:5001/api/shared/show-buses',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (busesResponse.data && Array.isArray(busesResponse.data)) {
          setBuses(busesResponse.data);
        }

      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'فشل في تحميل البيانات';
        setErrors({ general: errorMsg });
        console.error('Error fetching data:', err);
      } finally {
        setFetchingTrip(false);
        setFetchingBuses(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.busNumber.trim()) {
      newErrors.busNumber = 'رقم الباص مطلوب';
    }
    
    if (!formData.origin.trim()) {
      newErrors.origin = 'مدينة المغادرة مطلوبة';
    }
    
    if (!formData.destination.trim()) {
      newErrors.destination = 'مدينة الوصول مطلوبة';
    }
    
    if (!formData.departureDate) {
      newErrors.departureDate = 'تاريخ المغادرة مطلوب';
    }
    
    if (!formData.arrivalDate) {
      newErrors.arrivalDate = 'تاريخ الوصول مطلوب';
    } else if (new Date(formData.arrivalDate) <= new Date(formData.departureDate)) {
      newErrors.arrivalDate = 'تاريخ الوصول يجب أن يكون بعد تاريخ المغادرة';
    }
    
    if (!formData.departureTime) {
      newErrors.departureTime = 'وقت المغادرة مطلوب';
    }
    
    if (!formData.arrivalTime) {
      newErrors.arrivalTime = 'وقت الوصول مطلوب';
    }
    
    if (!formData.cost || formData.cost <= 0) {
      newErrors.cost = 'السعر يجب أن يكون أكبر من الصفر';
    }
    
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

      const data = {
        busNumber: formData.busNumber,
        origin: formData.origin,
        destination: formData.destination,
        departureDate: new Date(formData.departureDate).toISOString(),
        arrivalDate: new Date(formData.arrivalDate).toISOString(),
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        cost: formData.cost,
        status: formData.status
      };

      // If trip is restricted, only send allowed fields
      if (isTripRestricted) {
        const allowedData = {
          departureTime: formData.departureTime,
          arrivalTime: formData.arrivalTime,
          cost: formData.cost,
          status: formData.status
        };
        console.log('Trip is restricted, sending only allowed fields:', allowedData);
        Object.assign(data, allowedData);
      }

      console.log('Sending trip update data:', data);
      console.log('Trip ID:', id);
      console.log('Staff companyID:', staff.companyID);

      const response = await axios.put(
        `http://localhost:5001/api/shared/Edit-trip/${id}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Update trip response:', response.data);

      if (response.data && response.data.success) {
        setSuccessMessage('تم تحديث الرحلة بنجاح!');
        setTimeout(() => {
          navigate('/staff/trip');
        }, 1500);
      } else {
        throw new Error(response.data?.message || 'An unknown error occurred.');
      }
    } catch (err) {
      console.error('Error updating trip:', err);
      let errorMessage = 'حدث خطأ أثناء تحديث الرحلة';

      if (err.response) {
        if (err.response.status === 400) {
          // Show specific validation errors if available
          if (err.response.data && err.response.data.errors && Array.isArray(err.response.data.errors)) {
            errorMessage = err.response.data.errors.join(', ');
          } else if (err.response.data && err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = 'بيانات غير صالحة. يرجى التحقق من المدخلات.';
          }
        } else if (err.response.status === 401) {
          errorMessage = 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.';
        } else if (err.response.status === 404) {
          errorMessage = 'الرحلة غير موجودة.';
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

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching trip data
  if (fetchingTrip) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-screen">
          <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          <p className="ml-3 text-lg text-gray-700">جاري تحميل بيانات الرحلة...</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <FaRoute className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">تعديل الرحلة</h1>
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

        {isTripRestricted && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-yellow-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">تنبيه</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  لا يمكن تعديل بعض الحقول لأن الرحلة في حالة "{tripStatus === 'in-progress' ? 'قيد التنفيذ' : 'مكتملة'}". 
                  يمكنك فقط تعديل السعر والوقت وحالة الرحلة.
                </p>
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
              {/* رقم الباص */}
              <div>
                <label htmlFor="busNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الباص <span className="text-red-500">*</span>
                </label>
                <select
                  id="busNumber"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleChange}
                  disabled={isTripRestricted}
                  className={`w-full py-3 pl-3 pr-10 border ${errors.busNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${isTripRestricted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">-- اختر باصًا --</option>
                  {buses.map(bus => (
                    <option key={bus._id} value={bus.busNumber}>
                      {bus.busNumber} - {bus.model} ({bus.seats} مقعدًا)
                    </option>
                  ))}
                </select>
                {errors.busNumber && <p className="mt-1 text-sm text-red-600">{errors.busNumber}</p>}
              </div>

              {/* حالة الرحلة */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  حالة الرحلة
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full py-3 pl-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="scheduled">مجدولة</option>
                  <option value="active">نشطة</option>
                  <option value="in-progress">قيد التنفيذ</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغية</option>
                </select>
              </div>
            </div>
          </div>

          {/* قسم المدن */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaCity className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">المدن</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* مدينة المغادرة */}
              <div>
                <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-2">
                  مدينة المغادرة <span className="text-red-500">*</span>
                </label>
                <select
                  id="origin"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  disabled={isTripRestricted}
                  className={`w-full py-3 pl-3 pr-10 border ${errors.origin ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${isTripRestricted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">-- اختر مدينة --</option>
                  {syrianCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin}</p>}
              </div>

              {/* مدينة الوصول */}
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2">
                  مدينة الوصول <span className="text-red-500">*</span>
                </label>
                <select
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  disabled={isTripRestricted}
                  className={`w-full py-3 pl-3 pr-10 border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${isTripRestricted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">-- اختر مدينة --</option>
                  {syrianCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
              </div>
            </div>
          </div>

          {/* قسم التواريخ */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaCalendarAlt className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">التواريخ</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* تاريخ المغادرة */}
              <div>
                <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ المغادرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="departureDate"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={handleChange}
                  disabled={isTripRestricted}
                  className={`w-full px-4 py-3 border ${errors.departureDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isTripRestricted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.departureDate && <p className="mt-1 text-sm text-red-600">{errors.departureDate}</p>}
              </div>
              
              {/* تاريخ الوصول */}
              <div>
                <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الوصول <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  min={formData.departureDate}
                  disabled={isTripRestricted}
                  className={`w-full px-4 py-3 border ${errors.arrivalDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isTripRestricted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.arrivalDate && <p className="mt-1 text-sm text-red-600">{errors.arrivalDate}</p>}
              </div>
            </div>
          </div>

          {/* قسم الأوقات */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaClock className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">الأوقات</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* وقت المغادرة */}
              <div>
                <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700 mb-2">
                  وقت المغادرة <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="departureTime"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.departureTime ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.departureTime && <p className="mt-1 text-sm text-red-600">{errors.departureTime}</p>}
              </div>
              
              {/* وقت الوصول */}
              <div>
                <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700 mb-2">
                  وقت الوصول <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="arrivalTime"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.arrivalTime ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.arrivalTime && <p className="mt-1 text-sm text-red-600">{errors.arrivalTime}</p>}
              </div>
            </div>
          </div>

          {/* قسم التكاليف */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaMoneyBillWave className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">التكاليف</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {/* سعر التذكرة */}
              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
                  سعر التذكرة (ر.س) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-3 border ${errors.cost ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.cost && <p className="mt-1 text-sm text-red-600">{errors.cost}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  جاري تحديث الرحلة...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  تحديث الرحلة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
};

export default EditTripPage; 