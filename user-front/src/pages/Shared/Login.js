import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserShield, FaLock, FaArrowRight, FaBus } from 'react-icons/fa';
import { HiOutlineMail } from 'react-icons/hi';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '', // Username for admin/company/staff
    password: '',
  });
  const [loginType, setLoginType] = useState('admin'); // 'admin', 'company', 'staff'
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      transition: { 
        duration: 0.3,
        yoyo: Infinity,
        yoyoDuration: 0.5
      }
    },
    tap: { scale: 0.98 }
  };
  
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.username || !formData.password) {
      toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
      setLoading(false);
      return;
    }

    try {
      console.log('Admin Login: Attempting to login with:', formData.username, 'as', loginType);
      
      // Use the login function from AuthContext with the specific login type
      const user = await login(formData.username, formData.password, true, loginType);
      console.log('Admin Login: Login successful, user:', user);
      
      if (!user) {
        throw new Error('No user data returned from login');
      }

      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      // Get the token from localStorage (set by AuthContext)
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Show success message
      toast.success('تم تسجيل الدخول بنجاح');
      
      // Redirect based on user type
      if (user.userType === 'Admin') {
        console.log('Admin Login: Admin user detected, redirecting to admin dashboard');
        navigate('/admin/dashboard');
      } else if (user.userType === 'Company') {
        console.log('Admin Login: Company user detected, redirecting to manager dashboard');
        navigate('/manager/dashboard');
      } else if (user.userType === 'Staff') {
        console.log('Admin Login: Staff user detected, redirecting to staff dashboard');
        if (user.role === 'manager') {
          navigate('/manager/dashboard');
        } else {
          navigate('/staff/dashboard');
        }
      } else {
        // Fallback for other user types
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Admin Login error:', error);
      let errorMessage = 'فشل تسجيل الدخول. الرجاء المحاولة مرة أخرى.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <AnimatePresence>
          {isMounted && (
            <motion.div 
              className="w-full max-w-md"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {/* Floating Bus Animation */}
              <motion.div 
                className="absolute top-1/4 left-1/4 text-blue-300 text-6xl opacity-10"
                animate={{
                  y: [0, -20, 0],
                  x: [0, 20, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <FaBus className="w-16 h-16" />
              </motion.div>
              <motion.div 
                className="absolute bottom-1/4 right-1/4 text-blue-300 text-8xl opacity-10"
                animate={{
                  y: [0, 20, 0],
                  x: [0, -20, 0],
                  rotate: [0, -5, 0]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              >
                <FaBus className="w-16 h-16" />
              </motion.div>
              
              {/* Main Card */}
              <motion.div 
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl overflow-hidden relative z-10 w-full max-w-md"
                whileHover={{ 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600/90 to-indigo-600/90 p-6 text-center border-b border-white/10">
                  <motion.div 
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <FaUserShield className="text-white text-3xl" />
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold text-white"
                    variants={itemVariants}
                  >
                    لوحة تحكم المشرفين
                  </motion.h2>
                  <motion.p 
                    className="mt-1 text-blue-100"
                    variants={itemVariants}
                  >
                    يرجى تسجيل الدخول للمتابعة
                  </motion.p>
                </div>
                
                {/* Login Type Toggle */}
                <div className="bg-white/5 p-4 border-b border-white/10">
                  <motion.div 
                    className="flex justify-center"
                    variants={itemVariants}
                  >
                    <div className="inline-flex rounded-md shadow-sm">
                      <button
                        type="button"
                        onClick={() => setLoginType('admin')}
                        className={`px-4 py-2 text-sm font-medium border ${
                          loginType === 'admin'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        } ${loginType === 'admin' ? 'rounded-r-md' : ''} ${loginType === 'company' ? 'rounded-l-md' : ''}`}
                      >
                        مسؤول
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginType('company')}
                        className={`px-4 py-2 text-sm font-medium border ${
                          loginType === 'company'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        } ${loginType === 'admin' ? 'rounded-r-md' : ''} ${loginType === 'staff' ? 'rounded-l-md' : ''}`}
                      >
                        شركة
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginType('staff')}
                        className={`px-4 py-2 text-sm font-medium border ${
                          loginType === 'staff'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        } ${loginType === 'company' ? 'rounded-r-md' : ''} ${loginType === 'staff' ? 'rounded-l-md' : ''}`}
                      >
                        موظف
                      </button>
                    </div>
                  </motion.div>
                </div>
                
                {/* Form */}
                <div className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {/* Username Field */}
                      <motion.div variants={itemVariants}>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 text-right mb-1">
                          اسم المستخدم
                        </label>
                        <motion.div 
                          className="relative mt-1"
                          whileHover="hover"
                          whileFocus="focus"
                        >
                          <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                            <HiOutlineMail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="block w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg bg-white/50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-right"
                            placeholder="أدخل اسم المستخدم"
                            dir="rtl"
                          />
                        </motion.div>
                      </motion.div>

                      {/* Password Field */}
                      <motion.div variants={itemVariants}>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-right mb-1">
                          كلمة المرور
                        </label>
                        <motion.div 
                          className="relative mt-1"
                          whileHover="hover"
                          whileFocus="focus"
                        >
                          <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                            <FaLock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg bg-white/50 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 text-right"
                            placeholder="الرجاء إدخال كلمة المرور الخاصة بك"
                            dir="rtl"
                            title="كلمة المرور"
                          />
                        </motion.div>
                      </motion.div>

                      {/* Remember Me & Forgot Password */}
                      <motion.div 
                        className="flex items-center justify-between"
                        variants={itemVariants}
                      >
                        <div className="flex items-center">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="remember-me" className="mr-2 block text-sm text-white/80">
                            تذكرني
                          </label>
                        </div>
                        <div className="text-sm">
                          <button 
                            type="button"
                            className="font-medium text-white/80 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                          >
                            <motion.span
                              animate={isHovered ? { x: [0, -2, 0] } : {}}
                              transition={{ duration: 0.5 }}
                              className="inline-flex items-center"
                            >
                              هل نسيت كلمة المرور؟
                            </motion.span>
                          </button>
                        </div>
                      </motion.div>

                      {/* Submit Button */}
                      <motion.div variants={itemVariants}>
                        <motion.button
                          type="submit"
                          disabled={loading}
                          className="group w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 overflow-hidden relative"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          initial="initial"
                        >
                          <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <motion.span 
                              animate={loading ? { rotate: 360 } : { rotate: 0 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="h-5 w-5 text-blue-300"
                            >
                              {loading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <FaArrowRight className="h-5 w-5" />
                              )}
                            </motion.span>
                          </span>
                          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                        </motion.button>
                      </motion.div>
                    </div>
                  </form>

                  {/* Divider */}
                  <motion.div 
                    className="mt-8 relative"
                    variants={itemVariants}
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white/10 text-white/70">
                        أو
                      </span>
                    </div>
                  </motion.div>

                  {/* Customer Login Link */}
                  <motion.div 
                    className="px-6 pb-6"
                    variants={itemVariants}
                  >
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center py-3 px-4 border border-white/20 rounded-xl shadow-sm text-base font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                    >
                      <span className="ml-2">تسجيل الدخول كمسافر</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </Link>
                  </motion.div>
                  
                  {/* Footer */}
                  <div className="bg-white/5 px-6 py-4 border-t border-white/10">
                    <p className="text-xs text-center text-white/60">
                      © 2024 نظام حجز التذاكر. جميع الحقوق محفوظة.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminLogin;
