import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { motion } from "framer-motion";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-gradient-to-r from-white to-gray-50 shadow-lg py-4 px-6 flex items-center justify-between relative z-50 transition-all duration-300 ease-in-out border-b border-gray-100 w-full">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-transparent opacity-30 pointer-events-none"></div>
      {/* Logo (Left) */}
      <motion.div className="flex items-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <img
          src="/images/logo.png"
          alt="رحلتي-Bus Logo"
          className="h-10 w-auto"
        />
      </motion.div>

      {/* Navigation (Middle) */}
      <motion.nav className="hidden md:flex space-x-6 rtl:space-x-reverse" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Link
          to="/contact"
          className="relative px-3 py-1.5 text-gray-700 hover:text-primary-600 text-lg font-medium rtl:font-sans transition-all duration-300 group"
        >
          <span className="relative z-10">تواصل معنا</span>
          <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
        </Link>
        <Link
          to="/about"
          className="relative px-3 py-1.5 text-gray-700 hover:text-primary-600 text-lg font-medium rtl:font-sans transition-all duration-300 group"
        >
          <span className="relative z-10">عن الشركة</span>
          <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
        </Link>
        <Link
          to="/my-trips"
          className="relative px-3 py-1.5 text-gray-700 hover:text-primary-600 text-lg font-medium rtl:font-sans transition-all duration-300 group"
        >
          <span className="relative z-10">رحلاتي</span>
          <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
        </Link>
        <Link
          to="/"
          className="relative px-3 py-1.5 text-gray-700 hover:text-primary-600 text-lg font-medium rtl:font-sans transition-all duration-300 group"
        >
          <span className="relative z-10">الرئيسية</span>
          <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
        </Link>
      </motion.nav>

      {/* Login/Signup or User Profile (Right) */}
      <motion.div className="flex items-center space-x-4 rtl:space-x-reverse" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        {user && <NotificationBell />}
        {user ? (
          <div className="relative">
            <button
              onClick={toggleMenu}
              className="relative px-4 py-2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 hover:text-primary-600 text-lg font-medium rtl:font-sans flex items-center focus:outline-none transition-all duration-300 rounded-lg border border-gray-200 hover:border-primary-200 hover:shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.5 5.5 0 00-5.5 5.5v.5a2 2 0 002 2h7a2 2 0 002-2v-.5A5.5 5.5 0 0010 12z"
                  clipRule="evenodd"
                />
              </svg>
              {`${user.firstName} ${user.lastName}`}
            </button>
            {isMenuOpen && (
              <motion.div 
                className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-20 border border-gray-100 backdrop-blur-sm bg-white/95" 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <Link
                  to="/settings"
                  className="block w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 rtl:text-right transition-all duration-200 rounded-lg mx-2 my-1 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  الإعدادات
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rtl:text-right transition-all duration-200 rounded-lg mx-2 my-1 flex items-center"
                >
                  تسجيل الخروج
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="relative px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:to-primary-700 text-white text-lg font-medium rtl:font-sans flex items-center transition-all duration-300 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            تسجيل الدخول / إنشاء حساب
          </Link>
        )}
      </motion.div>
    </header>
  );
};

export default Header;
