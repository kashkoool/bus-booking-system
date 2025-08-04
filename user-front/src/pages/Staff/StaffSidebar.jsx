import React from "react";
import {
  FaHome,
  FaBus,
  FaRoute,
  FaUserTie,
  FaTicketAlt,
  FaMoneyBillWave,
  FaSearch,
  FaCreditCard,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

const StaffSidebar = ({ sidebarOpen, setSidebarOpen, logout }) => {
  // قائمة التنقل للموظفين - محدودة حسب الصلاحيات
  const navigation = [
    { name: "الرئيسية", icon: FaHome, href: "/staff/dashboard" },
    { name: "الرحلات", icon: FaRoute, href: "/staff/trips" },
    { name: "حجز تذاكر", icon: FaTicketAlt, href: "/staff/counter-booking" },
    { name: "الحجوزات النقدية", icon: FaCreditCard, href: "/staff/counter-bookings" },
    { name: "استرداد الأموال", icon: FaMoneyBillWave, href: "/staff/counter-refunds" },
    { name: "البحث عن الرحلات", icon: FaSearch, href: "/staff/trip-search" },
  ];

  return (
    <>
      {/* شريط جانبي للشاشات الكبيرة */}
      <div
        className={`hidden md:flex md:flex-shrink-0 bg-green-800 text-white w-64 flex-col fixed right-0 top-16 bottom-0 h-[calc(100vh-4rem)] z-40 pt-0`}
      >
        <div className="p-4 h-16 flex items-center border-b border-green-700">
          <h1 className="text-xl font-semibold">قائمة الموظف</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-green-700 text-white"
                      : "text-green-100 hover:bg-green-700"
                  }`
                }
              >
                <item.icon className="mr-2" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-green-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-green-100 hover:bg-green-700 rounded-lg"
          >
            <svg
              className="mr-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* شريط جانبي للجوال */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-green-800 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <div className="p-4 h-16 flex items-center justify-between border-b border-green-700">
          <h1 className="text-xl font-semibold">قائمة الموظف</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-green-200 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-green-700 text-white"
                      : "text-green-100 hover:bg-green-700"
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="mr-2" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-green-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-green-100 hover:bg-green-700 rounded-lg"
          >
            <svg
              className="mr-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
};

export default StaffSidebar; 