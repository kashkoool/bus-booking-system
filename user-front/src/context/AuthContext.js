import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem("token");
    if (token) {
      // Set the token in axios headers
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Fetch user profile
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Decode the token to get user info
      const decoded = jwtDecode(token);

      // For admin, company, and staff users, we can use the token data directly
      if (decoded.userType === 'Admin' || decoded.userType === 'Company' || decoded.userType === 'Staff' || decoded.role === 'manager' || decoded.role === 'staff') {
        setUser({
          id: decoded.id,
          username: decoded.username || decoded.email?.split('@')[0],
          email: decoded.email,
          role: decoded.role || decoded.userType?.toLowerCase(),
          userType: decoded.userType,
          companyID: decoded.companyID
        });
      } else {
        // For regular customers, fetch their profile
        const response = await axios.get("http://localhost:5001/api/user/Show-profile");
        if (response.data && response.data.data) {
          setUser(response.data.data);
        } else {
          throw new Error('Invalid user data received');
        }
      }
    } catch (error) {
      // Only clear token if it's an actual error, not just 403 (Forbidden)
      if (error.response?.status !== 403) {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, isAdminLogin = false, loginType = 'user') => {
    try {
      setError(null);

      let endpoint, loginData;

      if (isAdminLogin) {
        // Admin/Manager/Staff login
        endpoint = "http://localhost:5001/api/shared/login";
        loginData = {
          username: identifier,
          password: password
        };
      } else {
        // Customer login
        endpoint = "http://localhost:5001/api/user/login";
        loginData = {
          email: identifier,
          password: password
        };
      }

      const response = await axios.post(endpoint, loginData);

      const { token, user: responseUser, userType: responseUserType, role } = response.data;

      if (!token) {
        throw new Error('No token received from server');
      }

      // Store the token in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("userType", responseUserType || loginType);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Create user data object for the context state
      const userData = {
        id: responseUser?._id || responseUser?.id,
        username: responseUser?.username || responseUser?.email?.split('@')[0],
        email: responseUser?.email,
        role: role || responseUser?.role || (responseUserType === 'Staff' ? 'staff' : responseUserType?.toLowerCase()),
        userType: responseUserType || loginType,
        companyID: responseUser?.companyID
      };

      setUser(userData);

      // For customer login, fetch the full user profile immediately
      if (!isAdminLogin) {
        await fetchUserProfile();
      }

      return userData;
    } catch (error) {
      setError(
        error.response?.data?.message || "An error occurred during login"
      );
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(
        "http://localhost:5001/api/user/register",
        userData
      );

      const { token, user } = response.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);
      return user;
    } catch (error) {
      let errorMessage = "An error occurred during registration";

      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = "This email is already registered";
        } else if (error.response.status === 400) {
          errorMessage =
            error.response.data.message || "Invalid registration data";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      setError(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};