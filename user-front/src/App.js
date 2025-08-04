import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import PrivateRoute from "./components/PrivateRoute";
import PerformanceMonitor from "./components/PerformanceMonitor";
import SocketErrorHandler from "./components/SocketErrorHandler";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy load all pages for better performance
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const SharedLogin = React.lazy(() => import("./pages/Shared/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Booking = React.lazy(() => import("./pages/Booking"));
const MyTrips = React.lazy(() => import("./pages/MyTrips"));
const Settings = React.lazy(() => import("./pages/Settings"));
const About = React.lazy(() => import("./pages/About"));
const BookingDetailsPage = React.lazy(() => import("./pages/BookingDetailsPage"));
const BookingQRCodePage = React.lazy(() => import("./pages/BookingQRCodePage"));
const TestPage = React.lazy(() => import("./pages/TestPage"));

// Admin Pages
const AdminDashboard = React.lazy(() => import("./pages/Admin/AdminDashboard"));
const DashboardPage = React.lazy(() => import("./pages/Admin/DashboardPage"));
const CompaniesListPage = React.lazy(() => import("./pages/Admin/companies/CompaniesListPage"));
const AddCompanyPage = React.lazy(() => import("./pages/Admin/companies/AddCompanyPage"));
const EditCompanyPage = React.lazy(() => import("./pages/Admin/companies/EditCompanyPage"));
const CompanyDetailsPage = React.lazy(() => import("./pages/Admin/companies/CompanyDetailsPage"));
const SystemReportsPage = React.lazy(() => import("./pages/Admin/SystemReportsPage"));
const CompaniesReportPage = React.lazy(() => import("./pages/Admin/CompaniesReportPage"));
const RevenueReportPage = React.lazy(() => import("./pages/Admin/RevenueReportPage"));
const TripsReportPage = React.lazy(() => import("./pages/Admin/TripsReportPage"));
const ReviewChangesPage = React.lazy(() => import("./pages/Admin/ReviewChangesPage"));

// Manager Pages
const ManagerDashboardPage = React.lazy(() => import("./pages/Manager/DashboardPage"));
const ManagerProfilePage = React.lazy(() => import("./pages/Manager/ManagerProfilePage"));
const BusesListPage = React.lazy(() => import("./pages/Manager/Buses/BusesListPage"));
const AddBusPage = React.lazy(() => import("./pages/Manager/Buses/AddBusPage"));
const EditBusPage = React.lazy(() => import("./pages/Manager/Buses/EditBusPage"));
const BusDetailsPage = React.lazy(() => import("./pages/Manager/Buses/BusDetailsPage"));
const StaffManagementPage = React.lazy(() => import("./pages/Manager/staff/StaffManagementPage"));
const AddStaffPage = React.lazy(() => import("./pages/Manager/staff/AddStaffPage"));
const EditStaffPage = React.lazy(() => import("./pages/Manager/staff/EditStaffPage"));
const StaffDetailsPage = React.lazy(() => import("./pages/Manager/staff/StaffDetailsPage"));
const TripsListPage = React.lazy(() => import("./pages/Manager/trip/TripsListPage"));
const AddTripPage = React.lazy(() => import("./pages/Manager/trip/AddTripPage"));
const EditTripPage = React.lazy(() => import("./pages/Manager/trip/EditTripPage"));
const DemandPredictionPage = React.lazy(() => import('./pages/Manager/DemandPredictionPage'));

// Staff Pages
const StaffDashboardPage = React.lazy(() => import("./pages/Staff/DashboardPage"));
const StaffProfilePage = React.lazy(() => import("./pages/Staff/StaffProfilePage"));
const StaffTripsPage = React.lazy(() => import("./pages/Staff/StaffTripsPage"));
const StaffAddTripPage = React.lazy(() => import("./pages/Staff/AddTripPage"));
const StaffEditTripPage = React.lazy(() => import("./pages/Staff/EditTripPage"));
const CounterBookingPage = React.lazy(() => import("./pages/Staff/CounterBookingPage"));
const CounterBookingsPage = React.lazy(() => import("./pages/Staff/CounterBookingsPage"));
const CounterRefundsPage = React.lazy(() => import("./pages/Staff/CounterRefundsPage"));
const TripSearchPage = React.lazy(() => import("./pages/Staff/TripSearchPage"));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// User Dashboard Page Component
const UserDashboardPage = () => {
  const UserDashboard = React.lazy(() => import('./pages/Dashboard'));
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UserDashboard />
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      {/* Temporarily disable SocketProvider to test routing */}
      {/* <SocketProvider> */}
        <PerformanceMonitor />
        <SocketErrorHandler />
        <Router>
        <div className="min-h-screen bg-gray-100">
          <ToastContainer
            position="top-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={true}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <main className="container mx-auto px-2 py-8">
            <Suspense fallback={<LoadingSpinner />}>
              {console.log('🔍 Current pathname:', window.location.pathname)}
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/shared/login" element={<SharedLogin />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                

                {/* Protected User Routes */}
                {/* User dashboard route - only accessible to non-admin users */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute userOnly={true}>
                      <UserDashboardPage />
                    </PrivateRoute>
                  }
                />

                {/* Admin dashboard route - only accessible to admin users */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />

                {/* Manager Routes */}
                <Route
                  path="/manager/dashboard"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <ManagerDashboardPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/staff"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <StaffManagementPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/staff/add"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <AddStaffPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/staff/:id"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <StaffDetailsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/staff/edit/:id"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <EditStaffPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/buses"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <BusesListPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/buses/add"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <AddBusPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/buses/edit/:id"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <EditBusPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/buses/:id"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <BusDetailsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/trips"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <TripsListPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/trips/add"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <AddTripPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/trips/edit/:id"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <EditTripPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/profile"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <ManagerProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/manager/demand-prediction"
                  element={
                    <PrivateRoute managerOnly={true}>
                      <DemandPredictionPage />
                    </PrivateRoute>
                  }
                />

                {/* Staff Routes */}
                <Route
                  path="/staff/dashboard"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <StaffDashboardPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/profile"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <StaffProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/trips"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <StaffTripsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/trips/add"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <StaffAddTripPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/trips/edit/:id"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <StaffEditTripPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/counter-booking"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <CounterBookingPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/counter-bookings"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <CounterBookingsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/counter-refunds"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <CounterRefundsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/trip-search"
                  element={
                    <PrivateRoute staffOnly={true}>
                      <TripSearchPage />
                    </PrivateRoute>
                  }
                />

                {/* User Routes */}
                <Route path="/test-booking/:id" element={<BookingDetailsPage />} />
                <Route path="/booking/:id" element={<BookingDetailsPage />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/my-trips" element={<MyTrips />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/booking-details/:id" element={<BookingDetailsPage />} />
                <Route path="/booking-qr/:id" element={<BookingQRCodePage />} />
                
                {/* Test route */}
                <Route path="/test" element={<TestPage />} />

                {/* Admin Routes */}
                <Route
                  path="/admin/companies"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CompaniesListPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/companies/add"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AddCompanyPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/companies/edit/:id"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <EditCompanyPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/companies/:id"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CompanyDetailsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <SystemReportsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports/companies"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CompaniesReportPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports/revenue"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <RevenueReportPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports/trips"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <TripsReportPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/review-changes"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <ReviewChangesPage />
                    </PrivateRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={
                  (() => {
                    console.log('🚨 Catch-all route triggered for:', window.location.pathname);
                    return <Navigate to="/" replace />;
                  })()
                } />
              </Routes>
            </Suspense>
          </main>
        </div>
        </Router>
      {/* </SocketProvider> */}
    </AuthProvider>
  );
}

export default App;
