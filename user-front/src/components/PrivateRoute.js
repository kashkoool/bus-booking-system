import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ 
  children, 
  adminOnly = false, 
  userOnly = false, 
  managerOnly = false,
  staffOnly = false
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isAdmin = user?.userType === 'admin' || user?.role === 'admin';
  const isManager = user?.userType === 'company' || user?.role === 'manager';
  const isStaff = user?.userType === 'staff' || user?.role === 'staff';
  const isUser = user?.userType === 'user' || !user?.userType;

  useEffect(() => {
    // Redirect users based on their role
    if (user && !loading) {
      // If trying to access admin-only but not an admin
      if (adminOnly && !isAdmin) {
        navigate(getDefaultRoute(user), { replace: true });
      }
      // If trying to access manager-only but not a manager
      else if (managerOnly && !isManager) {
        navigate(getDefaultRoute(user), { replace: true });
      }
      // If trying to access staff-only but not a staff
      else if (staffOnly && !isStaff) {
        navigate(getDefaultRoute(user), { replace: true });
      }
      // If trying to access user-only but not a regular user
      else if (userOnly && (isAdmin || isManager || isStaff)) {
        navigate(getDefaultRoute(user), { replace: true });
      }
    }
  }, [user, loading, isAdmin, isManager, isStaff, userOnly, adminOnly, managerOnly, staffOnly, navigate]);

  // Helper function to get default route based on user type
  const getDefaultRoute = (user) => {
    if (user?.userType === 'admin' || user?.role === 'admin') {
      return '/admin/dashboard';
    } else if (user?.userType === 'company' || user?.role === 'manager') {
      return '/manager/dashboard';
    } else if (user?.userType === 'staff' || user?.role === 'staff') {
      return '/staff/dashboard';
    }
    return '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if route is admin-only and user is not admin
  if (adminOnly && !isAdmin) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  // Check if route is manager-only and user is not a manager
  if (managerOnly && !isManager) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  // Check if route is staff-only and user is not a staff
  if (staffOnly && !isStaff) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  // Check if route is user-only and current user is not a regular user
  if (userOnly && (isAdmin || isManager || isStaff)) {
    return null; // The useEffect will handle the redirect
  }

  return children;
};

export default PrivateRoute;
