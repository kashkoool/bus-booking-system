import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ManagerLayout from '../../layouts/MangerLayout';
import { FaChartLine, FaCalendarAlt, FaRoute, FaLightbulb } from 'react-icons/fa';

const DemandPredictionPage = () => {
  const [prediction, setPrediction] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    days: 30
  });

  // Available cities for dropdowns
  const [availableCities, setAvailableCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    fetchAvailableCities();
  }, []);

  const fetchAvailableCities = async () => {
    try {
      setLoadingCities(true);
      const response = await axios.get('http://localhost:5001/api/demand/cities');
      if (response.data.success) {
        setAvailableCities(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setError('فشل في تحميل المدن المتاحة');
    } finally {
      setLoadingCities(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePredictDemand = async () => {
    if (!formData.origin || !formData.destination || !formData.date) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get backend prediction only
      const response = await axios.get('http://localhost:5001/api/demand/predict', {
        params: {
          origin: formData.origin,
          destination: formData.destination,
          date: formData.date
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setPrediction({
          ...response.data.data,
          aiEnhanced: false,
          method: 'Backend Only'
        });
        setSuccess('تم توقع الطلب بنجاح');
      } else {
        setError(response.data.message || 'فشل في توقع الطلب');
      }
    } catch (error) {
      console.error('Error predicting demand:', error);
      setError(error.response?.data?.message || 'فشل في توقع الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleShowTrends = async () => {
    if (!formData.origin || !formData.destination) {
      setError('يرجى تحديد نقطة الانطلاق ونقطة الوصول');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get('http://localhost:5001/api/demand/trends', {
        params: {
          origin: formData.origin,
          destination: formData.destination,
          days: formData.days
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setTrends(response.data.trends);
        setSuccess('تم تحميل الاتجاهات بنجاح');
      } else {
        setError(response.data.message || 'فشل في تحميل الاتجاهات');
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      setError(error.response?.data?.message || 'فشل في تحميل الاتجاهات');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceIcon = (confidence) => {
    switch (confidence.toLowerCase()) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <ManagerLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <FaChartLine className="mr-3 text-blue-600" />
            توقع الطلب
          </h1>
          <p className="text-gray-600">تحليل البيانات التاريخية لتوقع الطلب المستقبلي</p>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaRoute className="mr-2 text-blue-600" />
            إدخال البيانات
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Origin Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نقطة الانطلاق
              </label>
              <select
                name="origin"
                value={formData.origin}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingCities}
              >
                <option value="">اختر نقطة الانطلاق</option>
                {availableCities && availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نقطة الوصول
              </label>
              <select
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingCities}
              >
                <option value="">اختر نقطة الوصول</option>
                {availableCities && availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التاريخ
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Days Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد الأيام للتحليل
              </label>
              <input
                type="number"
                name="days"
                value={formData.days}
                onChange={handleInputChange}
                min="7"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handlePredictDemand}
              disabled={loading || loadingCities}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChartLine className="mr-2" />
              {loading ? 'جاري التوقع...' : 'توقع الطلب'}
            </button>

            <button
              onClick={handleShowTrends}
              disabled={loading || loadingCities}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCalendarAlt className="mr-2" />
              {loading ? 'جاري التحميل...' : 'عرض الاتجاهات'}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaLightbulb className="mr-2 text-yellow-600" />
              نتائج التوقع
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">الطريق</h3>
                <p className="text-blue-600">{prediction.route}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">التوقع</h3>
                <p className="text-2xl font-bold text-green-600">
                  {prediction.predictedBookings} حجز
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">مستوى الثقة</h3>
                <p className={`text-lg font-semibold ${getConfidenceColor(prediction.confidence)}`}>
                  {getConfidenceIcon(prediction.confidence)} {prediction.confidence}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trends Results */}
        {trends && trends.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">الاتجاهات التاريخية</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-right">التاريخ</th>
                    <th className="px-4 py-2 text-right">عدد الحجوزات</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 text-right">{trend.date}</td>
                      <td className="px-4 py-2 text-right">{trend.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default DemandPredictionPage;