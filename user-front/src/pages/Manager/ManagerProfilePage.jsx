import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaBuilding, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaSave, 
  FaTimes, 
  FaSpinner, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaCamera,
  FaLock
} from 'react-icons/fa';
import axios from 'axios';
import ManagerLayout from '../../layouts/MangerLayout';
import { useAuth } from '../../context/AuthContext';

const ManagerProfilePage = () => {
  const { user: manager } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    companyName: '',
    phone: '',
    email: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setFetchingProfile(true);
        setErrors({});
        
        const token = localStorage.getItem('token');
        if (!token) {
          setErrors({ general: 'Authentication token not found. Please log in.' });
          setFetchingProfile(false);
          return;
        }

        const response = await axios.get(
          'http://localhost:5001/api/company/show-profile',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data && response.data.success) {
          const company = response.data.company;
          setFormData({
            companyName: company.companyName || '',
            phone: company.phone || '',
            email: company.email || '',
            address: company.address || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          
          if (company.logo) {
            setLogoPreview(`http://localhost:5001${company.logo}`);
          }
        }

      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'فشل في تحميل بيانات الملف الشخصي';
        setErrors({ general: errorMsg });
        console.error('Error fetching profile:', err);
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'اسم الشركة مطلوب';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'العنوان مطلوب';
    }
    
    // Password validation
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'كلمة المرور الحالية مطلوبة لتغيير كلمة المرور';
      }
      
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'كلمة المرور الجديدة غير متطابقة';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      setErrors(prev => ({ ...prev, general: 'يرجى إصلاح الأخطاء في النموذج قبل الإرسال.' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!manager || !manager.companyID) {
        throw new Error('Could not determine your company. Please log in again.');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('companyName', formData.companyName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('address', formData.address);
      
      if (formData.currentPassword) {
        formDataToSend.append('currentPassword', formData.currentPassword);
      }
      
      if (formData.newPassword) {
        formDataToSend.append('newPassword', formData.newPassword);
      }
      
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      const response = await axios.put(
        'http://localhost:5001/api/company/Edit-profile',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccessMessage('تم تحديث الملف الشخصي بنجاح!');
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        
        // Update logo preview if new logo was uploaded
        if (response.data.company && response.data.company.logo) {
          setLogoPreview(`http://localhost:5001${response.data.company.logo}`);
        }
      } else {
        throw new Error(response.data?.message || 'An unknown error occurred.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      let errorMessage = 'حدث خطأ أثناء تحديث الملف الشخصي';

      if (err.response) {
        if (err.response.status === 400) {
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
          errorMessage = 'الملف الشخصي غير موجود.';
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

  // Show loading while fetching profile data
  if (fetchingProfile) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center h-screen">
          <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          <p className="ml-3 text-lg text-gray-700">جاري تحميل بيانات الملف الشخصي...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <FaUser className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">الملف الشخصي</h1>
          </div>
          <button
            onClick={() => navigate('/manager/dashboard')}
            className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaTimes className="mr-2" />
            إلغاء
          </button>
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
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* قسم معلومات الشركة */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaBuilding className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">معلومات الشركة</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اسم الشركة */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الشركة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.companyName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل اسم الشركة"
                />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
              </div>

              {/* رقم الهاتف */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل رقم الهاتف"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>

            {/* البريد الإلكتروني */}
            <div className="mt-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="أدخل البريد الإلكتروني"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* العنوان */}
            <div className="mt-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                العنوان <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className={`w-full px-4 py-3 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="أدخل عنوان الشركة"
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>
          </div>

          {/* قسم الشعار */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaCamera className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">شعار الشركة</h2>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* معاينة الشعار */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="شعار الشركة" 
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                    <FaBuilding className="text-gray-400 text-2xl" />
                  </div>
                )}
              </div>
              
              {/* زر رفع الشعار */}
              <div>
                <label htmlFor="logo" className="cursor-pointer">
                  <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center">
                    <FaCamera className="mr-2" />
                    {logoPreview ? 'تغيير الشعار' : 'رفع شعار'}
                  </div>
                </label>
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF حتى 5MB</p>
              </div>
            </div>
          </div>

          {/* قسم تغيير كلمة المرور */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaLock className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">تغيير كلمة المرور</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* كلمة المرور الحالية */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل كلمة المرور الحالية"
                />
                {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
              </div>

              {/* كلمة المرور الجديدة */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل كلمة المرور الجديدة"
                />
                {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
              </div>
            </div>

            {/* تأكيد كلمة المرور الجديدة */}
            <div className="mt-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
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
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ManagerLayout>
  );
};

export default ManagerProfilePage; 