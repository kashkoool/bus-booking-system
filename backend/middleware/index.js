// Authentication middleware
const auth = require('./authMiddleware');

// Role-based access control
const {
    roleMiddleware,
    adminOnly,
    managerOnly,
    staffOnly,
    userOnly,
    verifyCompanyStatus
} = require('./roleMiddleware');

// Permission-based access control
const {
    canManageSystem,
    canManageAllCompanies,
    canManageAllUsers,
    canManageCompany,
    canManageStaff,
    canManageServices,
    canViewAnalytics,
    canManageBookings,
    canBookAppointments,
    canViewOwnBookings,
    canManageProfile,
    isOwnerOrAdmin
} = require('./permissionMiddleware');

// Export all middleware functions
module.exports = {
    // Authentication
    auth,
    
    // Role-based middleware
    roleMiddleware,
    adminOnly,
    managerOnly,
    staffOnly,
    userOnly,
    verifyCompanyStatus,
    
    // Permission-based middleware
    canManageSystem,
    canManageAllCompanies,
    canManageAllUsers,
    canManageCompany,
    canManageStaff,
    canManageServices,
    canViewAnalytics,
    canManageBookings,
    canBookAppointments,
    canViewOwnBookings,
    canManageProfile,
    isOwnerOrAdmin
};
