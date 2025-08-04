import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    country: "",
    gender: "",
    age: "",
  });
  const [loading, setLoading] = useState(false);
  const { register, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? parseInt(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate age is a positive number
    if (formData.age <= 0) {
      setError("Age must be a positive number");
      setLoading(false);
      return;
    }

    // Validate gender
    if (!["male", "female"].includes(formData.gender)) {
      setError("Please select a valid gender");
      setLoading(false);
      return;
    }

    try {
      const userData = {
        ...formData,
        age: parseInt(formData.age),
      };
      await register(userData);
      // Instead of navigating to home, show success message and redirect to login
      setError(null);
      alert("تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول الآن.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      // The error message will be set by the AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-white p-0 m-0"
      style={{ margin: 0, padding: 0 }}
    >
      <div className="w-full">
        <Header />
      </div>
      <div className="flex w-full h-screen">
        {/* Left: Bus Image */}
        <div
          className="w-1/2 h-full"
          style={{
            backgroundImage: `url('/images/bus_illustration.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
        {/* Right: Register Form */}
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
              <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900 rtl:font-sans">
                إنشاء حساب جديد
              </h2>
              <p className="mt-4 text-center text-base text-gray-600">
                أو{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
                >
                  تسجيل الدخول
                </Link>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700 text-right rtl:text-right">
                    {error}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    الاسم الأول
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    الاسم الأخير
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="email@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  كلمة المرور
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="***"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                >
                  الدولة
                </label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  required
                  className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    الجنس
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 rtl:text-right mb-1"
                  >
                    العمر
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    required
                    min="1"
                    className="input-field w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-right rtl:text-right focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.age}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mt-6"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    "إنشاء حساب"
                  )}
                </button>
              </div>

              <div className="text-sm text-center text-gray-600 mt-4">
                بالضغط على إنشاء حساب فانت قمت بالقراءة والموافقة على{" "}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
                >
                  سياسة الخصوصية
                </Link>{" "}
                و{" "}
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Register;
