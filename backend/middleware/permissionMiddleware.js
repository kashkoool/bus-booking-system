const Company = require('../models/Company');

// Define permissions for each role
const PERMISSIONS = {
    // Admin permissions
    admin: {
        canManageSystem: true,
        canManageAllCompanies: true,
        canManageAllUsers: true,
    },
    // Company manager permissions
    manager: {
        canManageCompany: true,
        canManageStaff: true,
        canManageServices: true,
        canViewAnalytics: true,
        canManageBookings: true,
    },
    // Company staff permissions
    staff: {
        canManageBookings: true,
        canViewSchedule: true,
        canViewAnalytics: false,
    },
    // Regular user permissions
    user: {
        canBookAppointments: true,
        canViewOwnBookings: true,
        canManageProfile: true,
    },
};

// Permission middleware factory
const checkPermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            // Admin has all permissions
            if (req.role === 'admin') {
                return next();
            }

            // Check if user's role has the required permission
            if (PERMISSIONS[req.role]?.[permission]) {
                return next();
            }


            const error = new Error('Insufficient permissions');
            error.status = 403;
            throw error;
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Permission check failed',
            });
        }
    };
};

// Company-specific permission checks
const checkCompanyPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            // Admin has all permissions
            if (req.role === 'admin') {
                return next();
            }

            // For company users, verify they belong to the company
            if (req.user.companyID?.toString() !== req.params.companyId) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this company',
                });
            }


            // Check if user's role has the required permission
            if (PERMISSIONS[req.role]?.[permission]) {
                return next();
            }

            throw new Error('Insufficient permissions for this company');
        } catch (error) {
            console.error('Company permission check error:', error);
            res.status(403).json({
                success: false,
                message: error.message || 'Company permission check failed',
            });
        }
    };
};

// Export common permission checks
exports.canManageSystem = checkPermission('canManageSystem');
exports.canManageAllCompanies = checkPermission('canManageAllCompanies');
exports.canManageAllUsers = checkPermission('canManageAllUsers');
exports.canManageCompany = checkCompanyPermission('canManageCompany');
exports.canManageStaff = checkCompanyPermission('canManageStaff');
exports.canManageServices = checkCompanyPermission('canManageServices');
exports.canViewAnalytics = checkCompanyPermission('canViewAnalytics');
exports.canManageBookings = checkCompanyPermission('canManageBookings');
exports.canBookAppointments = checkPermission('canBookAppointments');
exports.canViewOwnBookings = checkPermission('canViewOwnBookings');
exports.canManageProfile = checkPermission('canManageProfile');

// Middleware to check if user is the owner of a resource
exports.isOwnerOrAdmin = (model, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (req.role === 'admin') return next();
            
            const resource = await model.findById(req.params[idParam]);
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found',
                });
            }

            // Check if user is the owner
            if (resource.userId?.toString() === req.userId) {
                return next();
            }

            // For company resources
            if (resource.companyId?.toString() === req.user.companyID?.toString()) {
                return next();
            }

            res.status(403).json({
                success: false,
                message: 'Not authorized to access this resource',
            });
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({
                success: false,
                message: 'Ownership check failed',
            });
        }
    };
};
