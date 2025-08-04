// src/components/admin/AdminNavbar.js
import React, { useState } from 'react';
import { FaBars, FaBell, FaUserCircle, FaCog, FaHistory } from 'react-icons/fa';
import NotificationHistoryModal from '../../components/admin/NotificationHistoryModal';

const MangerNavbar = ({ setSidebarOpen, logout }) => {
  const [isNotificationHistoryOpen, setNotificationHistoryOpen] = useState(false);

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
            <div className="bg-blue-600 text-white rounded-lg w-8 h-8 flex items-center justify-center mr-2">
              <span className="font-bold">A</span>
            </div>
            <span className="text-xl font-bold text-gray-800">لوحة التحكم الإدارية</span>
          </div>

          {/* الأيقونات على اليمين */}
          <div className="flex items-center space-x-4">
            {/* زر سجل الإشعارات */}
            <button
              onClick={() => setNotificationHistoryOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="سجل الإشعارات المرسلة"
            >
              <FaHistory className="w-5 h-5" />
              <span className="hidden md:block text-sm font-medium">سجل الإشعارات</span>
            </button>

            {/* زر الإشعارات */}
            <button className="relative p-1 text-gray-500 hover:text-gray-600">
              <span className="sr-only">الإشعارات</span>
              <FaBell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* قائمة المستخدم المنسدلة */}
            <div className="relative group">
              <button className="flex items-center space-x-2 focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <FaUserCircle className="w-5 h-5" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">المسؤول</span>
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block z-10">
                <a 
                  href="#" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <FaUserCircle className="mr-2" />
                  الملف الشخصي
                </a>
                <a 
                  href="#" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <FaCog className="mr-2" />
                  الإعدادات
                </a>
                <button 
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification History Modal */}
      <NotificationHistoryModal 
        isOpen={isNotificationHistoryOpen}
        onClose={() => setNotificationHistoryOpen(false)}
      />
    </header>
  );
};

export default MangerNavbar;