const { Company, User, Admin } = require('../models');

// Cache for user data to reduce database queries
const userDataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Alias for backward compatibility
const clearUserDataCache = (userId, req) => {
    if (!userId) return;
    const userIdStr = userId.toString();
    const wasDeleted = userDataCache.delete(userIdStr);
    if (wasDeleted) {
        log('debug', 'User data cleared from cache', { userId: userIdStr }, req);
    }
};

// Logging helper
const log = (level, message, meta = {}, req) => {
    const timestamp = new Date().toISOString();
    const requestId = (req && req.requestId) ? req.requestId : 'unknown';
    console.log(
        `[${timestamp}] [${level.toUpperCase()}] [${requestId}] ${message}`,
        Object.keys(meta).length ? meta : ''
    );
};

// Clear cache every 5 minutes
setInterval(() => {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, value] of userDataCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            userDataCache.delete(key);
            clearedCount++;
        }
    }
    
    if (clearedCount > 0) {
        log('debug', `Cleared ${clearedCount} expired cache entries`, {});
    }
}, CACHE_TTL);

/**
 * Get user data from cache
 * @param {string} userId - The user ID to look up in cache
 * @param {Object} req - Express request object (optional)
 * @returns {Object|null} Cached user data or null if not found/expired
 */
const getCachedUser = (userId, req) => {
    if (!userId) return null;
    
    const cached = userDataCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        log('debug', 'Retrieved user from cache', { userId }, req);
        return cached.data;
    }
    
    if (cached) {
        userDataCache.delete(userId); // Remove expired cache entry
    }
    
    return null;
};

/**
 * Cache user data
 * @param {string} userId - The user ID to cache
 * @param {Object} data - The user data to cache
 * @param {Object} req - Express request object (optional)
 */
const cacheUser = (userId, data, req) => {
    if (!userId || !data) return;
    
    userDataCache.set(userId, {
        data,
        timestamp: Date.now()
    });
    
    log('debug', 'Cached user data', { userId, role: data.role }, req);
};

/**
 * Middleware factory for role-based access control
 * @param {Array<string>} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const roleMiddleware = (roles = []) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const requestId = req.requestId || 'unknown';
        
        try {
            if (!req.user) {
                log('warn', 'Unauthenticated access attempt', {
                    path: req.path,
                    method: req.method
                }, req);
                
                return res.status(401).json({ 
                    success: false, 
                    code: 'UNAUTHENTICATED',
                    message: 'Authentication required' 
                });
            }

            // Check if user has required role
            if (roles.length && !roles.includes(req.user.role)) {
                log('warn', 'Insufficient permissions', {
                    requestId,
                    userId: req.user._id,
                    userRole: req.user.role,
                    requiredRoles: roles,
                    path: req.path,
                    method: req.method
                }, req);
                
                return res.status(403).json({ 
                    success: false, 
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions' 
                });
            }

            // For company users, verify company status
            if (['manager', 'staff'].includes(req.user.role)) {
                await verifyCompanyStatus(req, res, next);
            } else {
                next();
            }
            
            log('debug', 'Role check passed', {
                requestId,
                userId: req.user._id,
                role: req.user.role,
                requiredRoles: roles,
                duration: Date.now() - startTime
            }, req);
        } catch (error) {
            log('error', 'Role middleware error', {
                error: error.message,
                stack: error.stack,
                userId: req.user?._id,
                path: req.path,
                method: req.method,
                duration: Date.now() - startTime
            }, req);
            
            if (!res.headersSent) {
                res.status(500).json({ 
                    success: false, 
                    code: 'AUTH_ERROR',
                    message: 'Authorization check failed',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    };
};

/**
 * Verify company status for company users (managers and staff)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyCompanyStatus = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || 'unknown';
    const userId = req.user?._id;
    
    try {
        if (!userId) {
            log('error', 'User ID not found in request', { requestId });
            return res.status(401).json({
                success: false,
                code: 'UNAUTHENTICATED',
                message: 'User not authenticated'
            });
        }
        
        // For managers, the user ID is the company ID
        // For staff, get the companyID from their user record
        let companyId;
        
        if (req.user.role === 'manager') {
            // For managers, they are the company record
            companyId = req.user._id || req.user.id;
            
            log('debug', 'Looking up company for manager', {
                requestId,
                userId,
                userRole: req.user.role,
                companyId
            });
        } else {
            // For staff, get companyID from their record
            companyId = req.user.companyID;
            
            log('debug', 'Looking up company for staff', {
                requestId,
                userId,
                userRole: req.user.role,
                companyId
            });
        }
        
        if (!companyId) {
            log('error', 'Company ID not found for user', {
                requestId,
                userId,
                userRole: req.user.role,
                userObject: JSON.stringify(req.user, null, 2)
            });
            
            return res.status(400).json({
                success: false,
                code: 'INVALID_REQUEST',
                message: 'Company information not found',
                details: 'The user account is not properly linked to a company.'
            });
        }
        
        // Try to get company from cache first
        let company = getCachedUser(`company_${companyId}`, req);
        
        if (!company) {
            // For staff, we need to query by companyID field instead of _id
            const query = req.user.role === 'staff' 
                ? { companyID: companyId }
                : { _id: companyId };
                
            // Get from database if not in cache
            company = await Company.findOne(query).lean();
            
            if (company) {
                // Cache the company data
                cacheUser(`company_${companyId}`, company, req);
                
                log('debug', 'Company found in database', {
                    requestId,
                    companyId,
                    company: JSON.stringify(company, null, 2)
                }, req);
            } else {
                log('error', 'Company not found in database', {
                    requestId,
                    companyId,
                    query,
                    userRole: req.user.role
                }, req);
            }
        }
        
        if (!company) {
            log('warn', 'Company not found', {
                requestId,
                userId,
                companyId,
                userRole: req.user.role
            });
            
            return res.status(404).json({ 
                success: false, 
                code: 'NOT_FOUND',
                message: 'Company not found' 
            });
        }
        
        if (company.status === 'suspended') {
            log('warn', 'Attempted access to suspended company', {
                requestId,
                userId,
                companyId,
                companyStatus: company.status
            });
            
            return res.status(403).json({ 
                success: false, 
                code: 'ACCOUNT_SUSPENDED',
                message: 'This company account has been suspended' 
            });
        }
        
        // Attach company to request
        req.company = company;
        
        log('debug', 'Company verification successful', {
            requestId,
            userId,
            companyId,
            companyStatus: company.status,
            duration: Date.now() - startTime
        });
        
        next();
    } catch (error) {
        log('error', 'Company verification failed', {
            requestId,
            userId,
            error: error.message,
            stack: error.stack,
            duration: Date.now() - startTime
        });
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                code: 'SERVER_ERROR',
                message: 'Failed to verify company status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

// Specific role middlewares
const adminOnly = roleMiddleware(['admin']);
const managerOnly = roleMiddleware(['manager']);
const staffOnly = roleMiddleware(['staff']);
const customerOnly = roleMiddleware(['customer']);
const managerOrStaff = roleMiddleware(['manager', 'staff']);
const adminOrManager = roleMiddleware(['admin', 'manager']);
const adminOrStaff = roleMiddleware(['admin', 'staff']);
const adminManagerOrStaff = roleMiddleware(['admin', 'manager', 'staff']);

// Export all role middlewares
module.exports = {
  roleMiddleware,
  adminOnly,
  managerOnly,
  staffOnly,
  customerOnly,
  userOnly: customerOnly, // For backward compatibility
  managerOrStaff,
  adminOrManager,
  adminOrStaff,
  adminManagerOrStaff,
  clearUserDataCache,
};
