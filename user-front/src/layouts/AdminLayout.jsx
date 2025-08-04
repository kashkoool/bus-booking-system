// src/layouts/AdminLayout.js
import React, { useState } from 'react';
import AdminNavbar from '../components/admin/AdminNavbar';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_WIDTH = 256; // 64 * 4 = 256px (w-64)
const NAVBAR_HEIGHT = 64; // 16 * 4 = 64px (h-16)

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-gray-50" style={{ direction: 'rtl' }}>
      {/* Fixed Navbar */}
      <div className="fixed top-0 right-0 left-0 z-50 w-full">
        <AdminNavbar setSidebarOpen={setSidebarOpen} logout={logout} />
      </div>
      {/* Fixed Sidebar for desktop */}
      <div className="hidden md:flex fixed top-16 right-0 h-[calc(100vh-4rem)] z-40">
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} logout={logout} />
      </div>
      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} logout={logout} />
      </div>
      {/* Main Content */}
      <main
        className="min-h-screen w-full"
        style={{
          marginRight: SIDEBAR_WIDTH,
          marginTop: NAVBAR_HEIGHT,
          transition: 'margin 0.3s',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;