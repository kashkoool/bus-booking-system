// src/components/admin/AdminNavbar.js
import React, { useState, useRef, useEffect } from 'react';
import { FaBars, FaUserCircle, FaBuilding } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AdminNavbar = ({ setSidebarOpen, logout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user: manager } = useAuth();

  // Fetch company logo
  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(
          'http://localhost:5001/api/company/show-profile',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data && response.data.success && response.data.company.logo) {
          setCompanyLogo(`http://localhost:5001${response.data.company.logo}`);
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
        setShowFallback(true);
      }
    };

    fetchCompanyLogo();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* زر فتح الشريط الجانبي للجوال */}
          <button
            className="md:hidden text-gray-500 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">فتح الشريط الجانبي</span>
            <FaBars className="w-6 h-6" />
          </button>

          {/* شعار التطبيق */}
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-blue-100 flex items-center justify-center mr-3 border border-gray-200">
              {companyLogo && !showFallback ? (
                <img 
                  src={companyLogo}
                  alt="شعار الشركة"
                  className="w-full h-full object-cover"
                  onError={() => setShowFallback(true)}
                />
              ) : (
                <FaBuilding className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800">لوحة تحكم المدير</span>
              {manager?.companyName && (
                <span className="text-xs text-gray-500">{manager.companyName}</span>
              )}
            </div>
          </div>

          {/* الأيقونات على اليمين */}
          <div className="flex items-center space-x-4">
            {/* زر الإشعارات */}
            <NotificationBell />

            {/* قائمة المستخدم المنسدلة */}
            <div className="relative" ref={dropdownRef}>
              <button 
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <FaUserCircle className="w-5 h-5" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">المدير</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <a 
                    href="#" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors duration-150"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/manager/profile');
                    }}
                  >
                    <FaUserCircle className="mr-2" />
                    الملف الشخصي
                  </a>
                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors duration-150"
                  >
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;