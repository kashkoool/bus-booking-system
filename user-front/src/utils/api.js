import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Company/Manager endpoints
export const companyApi = {
  // Dashboard
  getDashboard: () => api.get('/company/dashboard'),
  
  // Staff Management
  getStaff: () => api.get('/company/staff'),
  addStaff: (staffData) => api.post('/company/Addstaff', staffData),
  updateStaff: (id, staffData) => api.put(`/company/updatestaff/${id}`, staffData),
  deleteStaff: (id) => api.delete(`/company/deletestaff/${id}`),
  
  // Bus Management
  getBuses: () => api.get('/company/buses'),
  getBus: (id) => api.get(`/company/buses/${id}`),
  addBus: (busData) => api.post('/company/buses', busData),
  updateBus: (id, busData) => api.put(`/company/buses/${id}`, busData),
  deleteBus: (id) => api.delete(`/company/buses/${id}`),
  toggleBusStatus: (id) => api.patch(`/company/buses/${id}/toggle-status`),
  
  // Other company/manager endpoints...
};

// User endpoints
export const userApi = {
  getProfile: () => api.get('/user/Show-profile'),
  // Add other user endpoints as needed
};

export default api;
