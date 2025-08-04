import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use customer login endpoint
      const response = await login(formData.email, formData.password, false, 'user');
      
      // Redirect to home page for customers
      console.log('Customer login successful, redirecting to home');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد والمحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white p-0 m-0" dir="rtl">
      <div className="w-full">
        <Header />
      </div>
      <div className="flex w-full h-screen">
        {/* Left: Bus Image */}
        <div
          className="w-1/2 h-full"
          style={{
            backgroundImage: 'url(/images/bus_illustration.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Right: Login Form */}
        <div className="w-1/2 h-full flex items-center justify-center bg-white">
          <div className="max-w-md w-full space-y-8 p-8">
            {/* Logo */}
            <div className="flex justify-center mb-10 mt-4">
              <img
                src="/images/logo.png"
                alt="Logo"
                className="h-40 w-auto object-contain"
              />
            </div>
            
            <div>
              <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
                تسجيل دخول المسافر
              </h2>
              <p className="mt-4 text-center text-base text-gray-600">
                أو{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
                >
                  إنشاء حساب جديد
                </Link>
              </p>
            </div>

            <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700 text-right">
                    {error}
                  </div>
                </div>
              )}
              
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 text-right mb-1"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="example@example.com"
                />
              </div>
              
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 text-right mb-1"
                >
                  كلمة المرور
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="أدخل كلمة المرور"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                  ) : (
                    'تسجيل الدخول'
                  )}
                </button>
              </div>

              {/* Admin/Manager/Staff Login Link */}
              <div className="text-center">
                <Link
                  to="/admin-login"
                  className="text-sm text-primary-600 hover:text-primary-500 hover:underline"
                >
                  تسجيل دخول للمشرفين والموظفين
                </Link>
              </div>

              <div className="mt-8 text-center text-xs text-gray-500 leading-relaxed">
                بالضغط على إنشاء حساب فانت قمت بالقراءة والموافقة على{' '}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
                >
                  سياسة الخصوصية
                </Link>{' '}
                و{' '}
                <Link
                  to="/terms-of-service"
                  className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
                >
                  شروط الاستخدام
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
