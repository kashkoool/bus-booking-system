import React, { useState } from 'react';
import { FiMenu, FiBell, FiUser, FiLogOut, FiClock } from 'react-icons/fi';
import NotificationHistoryModal from './NotificationHistoryModal';

export default function AdminNavbar({ setSidebarOpen, logout }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isNotificationHistoryOpen, setNotificationHistoryOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <div className="flex items-center">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <FiMenu className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 mr-4">لوحة التحكم</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification History */}
          <button
            type="button"
            onClick={() => setNotificationHistoryOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="سجل الإشعارات المرسلة"
          >
            <FiClock className="h-5 w-5" />
            <span className="hidden md:block text-sm font-medium">سجل الإشعارات</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="sr-only">View notifications</span>
            <FiBell className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.username || 'Admin'}</p>
                <p className="text-xs text-gray-500">مدير النظام</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <FiUser className="h-5 w-5 text-indigo-700" />
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-500 focus:outline-none"
                title="تسجيل الخروج"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
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
}
