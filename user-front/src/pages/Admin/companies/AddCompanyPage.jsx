// src/pages/Admin/companies/AddCompanyPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSave, 
  FaTimes, 
  FaExclamationTriangle,
  FaSpinner,
  FaUser,
  FaInfoCircle,
  FaUpload,
  FaImage,
  FaTrashAlt
} from 'react-icons/fa';
import axios from 'axios';
import AdminLayout from '../../../layouts/AdminLayout';

const API_BASE_URL = 'http://localhost:5001/api/admin';

const AddCompanyPage = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    companyID: '',
    email: '',
    phone: '',
    address: '',
    
    // Manager Information
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate company name
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'اسم الشركة مطلوب';
    }
    
    // Validate company ID
    if (!formData.companyID.trim()) {
      newErrors.companyID = 'معرف الشركة مطلوب';
    }
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    }
    
    // Validate address
    if (!formData.address.trim()) {
      newErrors.address = 'العنوان مطلوب';
    }
    
    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = 'اسم المستخدم مطلوب';
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
    }
    
    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        setErrors(prev => ({ ...prev, logo: 'الرجاء تحميل ملف صورة فقط (JPEG, PNG, JPG)' }));
        return;
      }
      
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'حجم الملف كبير جداً (الحد الأقصى 2MB)' }));
        return;
      }
      
      setSelectedFile(file);
      setErrors(prev => ({ ...prev, logo: '' }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Prepare form data
        const formDataToSend = new FormData();
        formDataToSend.append('companyID', formData.companyID);
        formDataToSend.append('companyName', formData.companyName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('address', formData.address);
        // Add Co_ prefix to username if not already present
        const username = formData.username.startsWith('Co_') 
          ? formData.username 
          : `Co_${formData.username}`;
        formDataToSend.append('username', username);
        formDataToSend.append('password', formData.password);
        
        // Append logo file if selected
        if (selectedFile) {
          formDataToSend.append('logo', selectedFile);
        }
        
        // Send request to API
        await axios.post(`${API_BASE_URL}/createcompanies`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        
        setSuccessMessage('تمت إضافة الشركة بنجاح');
        setTimeout(() => {
          navigate('/admin/companies');
        }, 2000);
        
      } catch (error) {
        console.error('Error adding company:', error);
        let errorMessage = 'حدث خطأ أثناء إضافة الشركة';
        
        if (error.response) {
          // Handle HTTP errors
          if (error.response.status === 401) {
            setTimeout(() => {
              navigate('/login');
            }, 2000);
            return;
          } else if (error.response.status === 500) {
            errorMessage = 'خطأ في الخادم الداخلي (500). الرجاء المحاولة لاحقًا';
          } else if (error.response.data) {
            errorMessage = error.response.data.message || 
                         error.response.data.error || 
                         `خطأ في الخادم (${error.response.status})`;
            
            // Handle validation errors
            if (error.response.data.errors) {
              const validationErrors = {};
              error.response.data.errors.forEach(err => {
                validationErrors[err.path] = err.message;
              });
              setErrors(validationErrors);
              errorMessage = 'تحقق من الأخطاء في النموذج';
            }
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'لم يتم تلقي رد من الخادم. الرجاء التحقق من اتصال الشبكة';
        } else {
          // Something happened in setting up the request
          errorMessage = error.message || 'خطأ في إعداد الطلب';
        }
        
        setErrors(prev => ({
          ...prev,
          submit: errorMessage,
          general: errorMessage
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800">إضافة شركة جديدة</h1>
          </div>
          <button
            onClick={() => navigate('/admin/companies')}
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
          {/* Company Information Section */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">بيانات الشركة</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="md:col-span-2">
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

              {/* Company ID */}
              <div>
                <label htmlFor="companyID" className="block text-sm font-medium text-gray-700 mb-2">
                  معرف الشركة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="companyID"
                  name="companyID"
                  value={formData.companyID}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.companyID ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل معرف الشركة"
                />
                {errors.companyID && <p className="mt-1 text-sm text-red-600">{errors.companyID}</p>}
              </div>

              {/* Email */}
              <div>
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

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  الهاتف <span className="text-red-500">*</span>
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

              {/* Address */}
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل عنوان الشركة"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>

              {/* Logo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شعار الشركة
                </label>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl w-40 h-40 flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={logoPreview} 
                            alt="معاينة الشعار" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="حذف الشعار"
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-4 text-gray-400">
                          <FaImage className="mx-auto text-3xl mb-2" />
                          <p className="text-xs">لا يوجد شعار</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center p-4">
                        <>
                          <FaUpload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 text-center">
                            <span className="font-semibold">انقر لرفع صورة</span> أو اسحبها هنا
                          </p>
                          <p className="text-xs text-gray-500 text-center">
                            PNG, JPG, JPEG (الحجم الأقصى 2MB)
                          </p>
                        </>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </div>
                    {errors.logo && <p className="mt-2 text-sm text-red-600">{errors.logo}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Information Section */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaUser className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">بيانات مدير الشركة</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المستخدم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل اسم المستخدم"
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل كلمة المرور"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="md:col-span-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أعد إدخال كلمة المرور"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FaSave className="ml-2" />
                  حفظ الشركة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AddCompanyPage;
