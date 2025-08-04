import React, { useState } from 'react';
import StaffNavbar from '../pages/Staff/StaffNavbar';
import StaffSidebar from '../pages/Staff/StaffSidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SIDEBAR_WIDTH = 256; // 64 * 4 = 256px (w-64)
const NAVBAR_HEIGHT = 64; // 16 * 4 = 64px (h-16)

const StaffLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Fixed Navbar */}
      <div className="fixed top-0 right-0 left-0 z-50">
        <StaffNavbar setSidebarOpen={setSidebarOpen} logout={handleLogout} />
      </div>

      {/* Fixed Sidebar (desktop) */}
      <div className="hidden md:block fixed top-16 right-0 h-[calc(100vh-4rem)] z-40">
        <StaffSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} logout={handleLogout} />
      </div>

      {/* Mobile Sidebar (handled inside StaffSidebar) */}

      {/* Main Content */}
      <main
        className="transition-all duration-500 ease-in-out animate-fadein min-h-screen"
        style={{
          paddingTop: NAVBAR_HEIGHT,
          paddingRight: 0,
          paddingLeft: 0,
          marginRight: 0,
          marginLeft: 0,
          // On desktop, push content left by sidebar width
          marginRight: `0px`,
          marginLeft: 0,
        }}
      >
        <div
          className="w-full px-2 sm:px-4 md:px-8 py-6"
          style={{
            // On desktop, add right padding for sidebar
            paddingRight: `0px`,
            maxWidth: '100vw',
          }}
        >
          {children}
        </div>
      </main>
      {/* On desktop, add a right margin to main content to account for sidebar */}
      <style>{`
        @media (min-width: 768px) {
          main {
            margin-right: ${SIDEBAR_WIDTH}px !important;
          }
          main > div {
            padding-right: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffLayout; 