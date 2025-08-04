// src/pages/admin/companies/EditCompanyPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaSave, 
  FaTimes, 
  FaBuilding, 
  FaUpload, 
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaUser,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';
import axios from 'axios';
import AdminLayout from '../../../layouts/AdminLayout';

const EditCompanyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    companyID: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    logo: '',
    
    // Manager Information
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Debug effect to monitor loading state
  useEffect(() => {
    console.log('=== DEBUG: Loading state changed ===');
    console.log('Loading:', loading);
    console.log('Errors:', errors);
    console.log('Form data:', formData);
  }, [loading, errors, formData]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        console.log('=== DEBUG: Starting fetchCompanyData ===');
        console.log('Token:', token ? 'Token exists' : 'No token');
        console.log('Company ID:', id);
        console.log('Company ID type:', typeof id);
        console.log('Company ID length:', id?.length);
        console.log('API URL:', `http://localhost:5001/api/admin/companies/${id}/manager`);
        
        // Validate company ID format
        if (!id || id.length !== 24) {
          console.log('=== DEBUG: Invalid company ID format ===');
          setErrors({ general: 'معرف الشركة غير صحيح' });
          setLoading(false);
          return;
        }
        
        // Check if backend server is running
        try {
          console.log('=== DEBUG: Checking backend server health ===');
          await axios.get('http://localhost:5001/api/admin/health', { timeout: 3000 });
          console.log('=== DEBUG: Backend server is running ===');
        } catch (healthErr) {
          console.log('=== DEBUG: Backend server health check failed ===');
          console.log('Health check error:', healthErr.message);
          // Continue anyway, the main API call will handle the error
        }
        
        // جلب بيانات الشركة والمدير
        const response = await axios.get(
          `http://localhost:5001/api/admin/companies/${id}/manager`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 10000 // 10 second timeout
          }
        );
        
        console.log('=== DEBUG: API Response ===');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        console.log('Response success:', response.data?.success);
        console.log('Response data.data:', response.data?.data);
        
        if (response.data && response.data.success) {
          const { company, manager } = response.data.data;
          
          console.log('=== DEBUG: Parsed Data ===');
          console.log('Company data:', company);
          console.log('Manager data:', manager);
          console.log('=== DEBUG: Data Types ===');
          console.log('companyID type:', typeof company.companyID, 'value:', company.companyID);
          console.log('companyName type:', typeof company.name, 'value:', company.name);
          console.log('email type:', typeof company.email, 'value:', company.email);
          console.log('phone type:', typeof company.phone, 'value:', company.phone);
          console.log('address type:', typeof company.address, 'value:', company.address);
          console.log('username type:', typeof manager?.username, 'value:', manager?.username);
          
          setFormData({
            companyName: company.name || '',
            companyID: company.companyID ? company.companyID.toString() : '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            status: company.status || 'active',
            logo: company.logo || '',
            
            username: manager?.username || '',
            password: '',
            confirmPassword: ''
          });
          
          if (company.logo) {
            setLogoPreview(`http://localhost:5001${company.logo}`);
          }
          
          setErrors({});
          console.log('=== DEBUG: Form data set successfully ===');
        } else {
          console.log('=== DEBUG: API returned success: false ===');
          setErrors({ general: 'فشل في تحميل بيانات الشركة' });
        }
      } catch (err) {
        console.log('=== DEBUG: Error occurred ===');
        console.log('Error type:', err.constructor.name);
        console.log('Error message:', err.message);
        console.log('Error response status:', err.response?.status);
        console.log('Error response data:', err.response?.data);
        console.log('Error response headers:', err.response?.headers);
        console.log('Error request config:', {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        });
        
        let errorMessage = 'حدث خطأ أثناء تحميل بيانات الشركة';
        
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'انتهت مهلة الاتصال. الرجاء المحاولة مرة أخرى';
        } else if (err.response?.status === 404) {
          errorMessage = 'الشركة غير موجودة';
        } else if (err.response?.status === 401) {
          errorMessage = 'غير مصرح لك بالوصول. الرجاء تسجيل الدخول مرة أخرى';
        } else if (err.response?.status === 403) {
          errorMessage = 'ليس لديك صلاحية للوصول إلى هذه البيانات';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        
        setErrors({ general: errorMessage });
        console.error('Error fetching company data:', err);
      } finally {
        console.log('=== DEBUG: Setting loading to false ===');
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCompanyData();
    } else {
      console.log('=== DEBUG: No companyId provided ===');
      setLoading(false);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.match('image.*')) {
        setErrors(prev => ({ ...prev, logo: 'الرجاء تحميل ملف صورة فقط (JPEG, PNG)' }));
        return;
      }
      
      // التحقق من حجم الملف (أقل من 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'حجم الملف كبير جداً (الحد الأقصى 2MB)' }));
        return;
      }
      
      setSelectedFile(file);
      setErrors(prev => ({ ...prev, logo: '' }));
      
      // عرض معاينة الصورة
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate company name
    if (!formData.companyName || !formData.companyName.toString().trim()) {
      newErrors.companyName = 'اسم الشركة مطلوب';
    }
    
    // Validate company ID
    if (!formData.companyID || !formData.companyID.toString().trim()) {
      newErrors.companyID = 'معرف الشركة مطلوب';
    }
    
    // Validate email
    if (!formData.email || !formData.email.toString().trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.toString())) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    // Validate phone
    if (!formData.phone || !formData.phone.toString().trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    }
    
    // Validate address
    if (!formData.address || !formData.address.toString().trim()) {
      newErrors.address = 'العنوان مطلوب';
    }
    
    // Validate username
    if (!formData.username || !formData.username.toString().trim()) {
      newErrors.username = 'اسم المستخدم مطلوب';
    }
    
    // Validate password if provided
    if (formData.password && formData.password.toString().length < 6) {
      newErrors.password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
    }
    
    // Validate confirm password
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadLogo = async () => {
    if (!selectedFile) return null;
    
    try {
      setUploadingImage(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', selectedFile);
      
      const response = await axios.put(
        `http://localhost:5001/api/admin/companies/${id}/logo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data && response.data.success) {
        return response.data.logoUrl;
      }
      return null;
    } catch (err) {
      console.error('Error uploading logo:', err);
      setErrors({ general: 'فشل في تحميل الشعار' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      let updatedLogoUrl = formData.logo;
      
      // إذا تم رفع شعار جديد
      if (selectedFile) {
        updatedLogoUrl = await uploadLogo();
      }
      
      // إعداد بيانات التحديث
      const companyUpdates = {
        companyName: formData.companyName,
        companyID: parseInt(formData.companyID) || formData.companyID,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
        logo: updatedLogoUrl,
        username: formData.username
      };
      
      // إذا تم إدخال كلمة مرور جديدة
      if (formData.password) {
        companyUpdates.password = formData.password;
      }
      
      console.log('=== DEBUG: Sending update data ===');
      console.log('Company updates:', companyUpdates);
      
      // تحديث بيانات الشركة
      const response = await axios.put(
        `http://localhost:5001/api/admin/companies/${id}`,
        companyUpdates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccessMessage('تم تحديث بيانات الشركة بنجاح!');
        setTimeout(() => {
          navigate('/admin/companies');
        }, 1500);
      } else {
        const errorMessage = response.data?.message || 
                            response.data?.error || 
                            'فشل في تحديث الشركة';
        setErrors({ general: errorMessage });
      }
    } catch (err) {
      let errorMessage = 'حدث خطأ أثناء تحديث الشركة';
      
      if (err.response) {
        if (err.response.status === 500) {
          errorMessage = 'خطأ في الخادم الداخلي (500). الرجاء المحاولة لاحقًا';
        } else if (err.response.data) {
          errorMessage = err.response.data.message || 
                         err.response.data.error || 
                         `خطأ في الخادم (${err.response.status})`;
          
          if (err.response.data.errors) {
            const validationErrors = {};
            err.response.data.errors.forEach(error => {
              validationErrors[error.path] = error.message;
            });
            setErrors(validationErrors);
            errorMessage = 'تحقق من الأخطاء في النموذج';
          }
        }
      } else if (err.request) {
        errorMessage = 'لم يتم تلقي رد من الخادم. الرجاء التحقق من اتصال الشبكة';
      } else {
        errorMessage = err.message || 'خطأ في إعداد الطلب';
      }
      
      setErrors({ general: errorMessage });
      console.error('Error updating company:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg flex items-center justify-center h-64">
          <div className="text-center">
            <FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto mb-4" />
            <p className="text-gray-600">جاري تحميل بيانات الشركة...</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Company ID: {id}</p>
              <p>Loading State: {loading ? 'true' : 'false'}</p>
              <p>Errors: {Object.keys(errors).length > 0 ? JSON.stringify(errors) : 'None'}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <FaBuilding className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">تعديل بيانات الشركة</h1>
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
                            onClick={() => {
                              setSelectedFile(null);
                              setLogoPreview(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="حذف الشعار"
                          >
                            <FaTimes size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-4 text-gray-400">
                          <FaBuilding className="mx-auto text-3xl mb-2" />
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
                  كلمة المرور الجديدة (اختياري)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل كلمة المرور الجديدة"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="md:col-span-2">
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
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploadingImage ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FaSave className="ml-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default EditCompanyPage;