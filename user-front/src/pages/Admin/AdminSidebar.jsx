// src/components/admin/AdminSidebar.js
import React, { useState } from "react";
import {
  FaTachometerAlt,
  FaBuilding,
  FaBell,
  FaTicketAlt,
  FaCog,
  FaChartBar,
  FaList,
  FaPlus,
  FaEdit,
  FaCaretDown,
  FaCaretRight,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

const AdminSidebar = ({ sidebarOpen, setSidebarOpen, logout }) => {
  const [companiesOpen, setCompaniesOpen] = useState(false);

  // قائمة التنقل المعدلة
  const navigation = [
    { name: "لوحة التحكم", icon: FaTachometerAlt, href: "/dashboard" },
    {
      name: "الشركات",
      icon: FaBuilding,
      href: "/admin/companies/list",
    },
    { name: "الإشعارات", icon: FaBell, href: "/admin/notifications" },
    { name: "الكوبونات", icon: FaTicketAlt, href: "/admin/coupons" },
    { name: "التقارير", icon: FaChartBar, href: "/admin/reports" },

  ];

  const toggleCompanies = () => {
    setCompaniesOpen(!companiesOpen);
  };

  return (
    <>
      {/* شريط جانبي للشاشات الكبيرة */}
      <div
        className={`hidden md:flex fixed top-16 right-0 h-[calc(100vh-4rem)] z-40 bg-blue-800 text-white w-64 flex-col`}
      >
        <div className="p-4 h-16 flex items-center border-b border-blue-700">
          <h1 className="text-xl font-semibold">القائمة الرئيسية</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => (
              <div key={item.name}>
                {!item.children ? (
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-700 text-white"
                          : "text-blue-100 hover:bg-blue-700"
                      }`
                    }
                  >
                    <item.icon className="mr-2" />
                    <span>{item.name}</span>
                  </NavLink>
                ) : (
                  <div>
                    <button
                      onClick={toggleCompanies}
                      className="flex items-center justify-between w-full px-4 py-3 text-blue-100 hover:bg-blue-700 rounded-lg"
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-2" />
                        <span>{item.name}</span>
                      </div>
                      {companiesOpen ? <FaCaretDown /> : <FaCaretRight />}
                    </button>

                    {companiesOpen && (
                      <div className="pl-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-700 text-white"
                                  : "text-blue-100 hover:bg-blue-700"
                              }`
                            }
                          >
                            <child.icon className="mr-2 text-sm" />
                            <span className="text-sm">{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-blue-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-blue-100 hover:bg-blue-700 rounded-lg"
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

      {/* شريط جانبي للجوال */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-blue-800 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <div className="p-4 h-16 flex items-center justify-between border-b border-blue-700">
          <h1 className="text-xl font-semibold">القائمة الرئيسية</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-blue-200 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => (
              <div key={item.name}>
                {!item.children ? (
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-700 text-white"
                          : "text-blue-100 hover:bg-blue-700"
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-2" />
                    <span>{item.name}</span>
                  </NavLink>
                ) : (
                  <div>
                    <button
                      onClick={toggleCompanies}
                      className="flex items-center justify-between w-full px-4 py-3 text-blue-100 hover:bg-blue-700 rounded-lg"
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-2" />
                        <span>{item.name}</span>
                      </div>
                      {companiesOpen ? <FaCaretDown /> : <FaCaretRight />}
                    </button>

                    {companiesOpen && (
                      <div className="pl-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-700 text-white"
                                  : "text-blue-100 hover:bg-blue-700"
                              }`
                            }
                            onClick={() => setSidebarOpen(false)}
                          >
                            <child.icon className="mr-2 text-sm" />
                            <span className="text-sm">{child.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-blue-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-blue-100 hover:bg-blue-700 rounded-lg"
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

export default AdminSidebar;
