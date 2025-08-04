// src/pages/manager/staff/AddStaffPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSave, 
  FaTimes, 
  FaUserTie, 
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaCar,
  FaUser,
  FaIdCard
} from 'react-icons/fa';
import axios from 'axios';
import ManagerLayout from '../../../layouts/MangerLayout';
import { useAuth } from '../../../context/AuthContext';

const AddStaffPage = () => {
  const { user: Manager } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Basic user information
    username: '', // Single username field
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff', // Fixed for this page
    
    // Staff information
    age: '',
    gender: 'male',
    address: '',
    staffType: 'employee',
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // التحقق من البيانات الأساسية
    if (!formData.username) {
      newErrors.username = 'اسم المستخدم مطلوب';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^[0-9]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'رقم هاتف غير صالح (10-15 رقم)';
    }
    
    if (!formData.email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'بريد إلكتروني غير صالح';
    }
    
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }
    
    // التحقق من بيانات التوظيف
    if (!formData.gender) {
      newErrors.gender = 'الجنس مطلوب';
    }
    
    if (!formData.staffType) {
      newErrors.staffType = 'نوع الموظف مطلوب';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      
      if (!Manager) {
        throw new Error('لم يتم العثور على معلومات المستخدم. الرجاء تسجيل الدخول مرة أخرى.');
      }
      
      const companyId = Manager._id || Manager.id;
      if (!companyId) {
        throw new Error('لا يمكن تحديد الشركة الخاصة بك. الرجاء تسجيل الدخول مرة أخرى.');
      }
      
      // Add Em_ prefix to username if not already present
      const username = formData.username.startsWith('Em_') 
        ? formData.username 
        : `Em_${formData.username}`;
      
      // Create data object with all required fields
      const data = {
        username: username,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        age: formData.age,
        gender: formData.gender,
        address: formData.address,
        staffType: formData.staffType,
        status: formData.status,
        company: companyId,
      };
      
      console.log('Sending data to server:', data);

      const response = await axios.post(
        'http://localhost:5001/api/company/Addstaff',
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
        
      );
      console.log(response.data.success);
      console.log(response.data);

      if (response.data) {
        setSuccessMessage('تم إضافة الموظف بنجاح!');
        setTimeout(() => {
          navigate('/manager/staff');
        }, 1500);
      } else {
        const errorMessage = response.data?.message || 
                            response.data?.error || 
                            'فشل في إضافة الموظف';
        setErrors({ general: errorMessage });
      }
    } catch (err) {
      let errorMessage = 'حدث خطأ أثناء إضافة الموظف';
      
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
      console.error('Error adding staff:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagerLayout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div className="flex items-center">
            <FaUserTie className="text-blue-600 text-2xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">إضافة موظف جديد</h1>
          </div>
          <button
            onClick={() => navigate('/manager/staff/list')}
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
          {/* قسم المعلومات الشخصية */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaUser className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">المعلومات الشخصية</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اسم المستخدم */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المستخدم *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="أدخل اسم المستخدم"
                  required
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>
              
              {/* الهاتف */}
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
              
              {/* البريد الإلكتروني */}
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
              
              {/* الجنس */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  الجنس <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full py-2 pl-3 pr-10 border ${errors.gender ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>
              
              {/* العمر */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  العمر
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="18"
                  max="70"
                  className={`w-full px-4 py-3 border ${errors.age ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل العمر"
                />
                {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
              </div>
            </div>
          </div>

          {/* قسم بيانات الحساب والتوظيف */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="flex items-center mb-6">
              <FaIdCard className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">بيانات الحساب والتوظيف</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* كلمة المرور */}
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
              
              {/* تأكيد كلمة المرور */}
              <div>
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
              
              {/* العنوان */}
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل العنوان"
                />
              </div>
              
              {/* نوع الموظف */}
              <div>
                <label htmlFor="staffType" className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الموظف <span className="text-red-500">*</span>
                </label>
                <select
                  id="staffType"
                  name="staffType"
                  value={formData.staffType}
                  onChange={handleChange}
                  className={`w-full py-2 pl-3 pr-10 border ${errors.staffType ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white`}
                >
                  <option value="accountant">محاسب</option>
                  <option value="supervisor">مشرف</option>
                  <option value="employee">موظف</option>
                  <option value="driver">سائق</option>
                </select>
                {errors.staffType && <p className="mt-1 text-sm text-red-600">{errors.staffType}</p>}
              </div>
              
              {/* حالة الموظف */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  حالة الموظف
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
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
                  جاري إضافة الموظف...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  إضافة الموظف
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ManagerLayout>
  );
};

export default AddStaffPage;