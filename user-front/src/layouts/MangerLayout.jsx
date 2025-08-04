// src/layouts/MangerLayout.jsx
import React, { useState } from 'react';
import MangerNavbar from '../pages/Manager/MangerNavbar';
import MangerSidebar from '../pages/Manager/MangerSidebar';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_WIDTH = 256; // 64 * 4 = 256px (w-64)
const NAVBAR_HEIGHT = 64; // 16 * 4 = 64px (h-16)

const MangerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Fixed Navbar */}
      <div className="fixed top-0 right-0 left-0 z-50">
        <MangerNavbar setSidebarOpen={setSidebarOpen} logout={logout} />
      </div>

      {/* Fixed Sidebar (desktop, now on the right) */}
      <div className="hidden md:block fixed top-16 right-0 h-[calc(100vh-4rem)] z-40">
        <MangerSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} logout={logout} />
      </div>

      {/* Mobile Sidebar (handled inside MangerSidebar) */}

      {/* Main Content */}
      <main
        className="transition-all duration-500 ease-in-out animate-fadein min-h-screen"
        style={{
          paddingTop: NAVBAR_HEIGHT,
          paddingLeft: 0,
          paddingRight: 0,
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        <div
          className="w-full px-2 sm:px-4 md:px-8 py-6"
          style={{
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

export default MangerLayout;