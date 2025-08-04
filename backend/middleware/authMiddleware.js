const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Token } = require("../models");

// Token configuration
const TOKEN_CONFIG = {
  // Token expiration
  ACCESS_TOKEN_EXPIRY: "15m", // 15 minutes
  REFRESH_TOKEN_EXPIRY: "1d", // 1 day

  // Cache settings
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes for token cache
  USER_CACHE_TTL: 5 * 60 * 1000, // 5 minutes for user cache

  // Other settings
  REFRESH_WINDOW: 5 * 60 * 1000, // 5 minutes before expiration
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
};

// Token types
const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
};

// In-memory caches
const tokenCache = new Map(); // token -> { user, expires, lastUsed }
const userCache = new Map(); // userId -> { data, timestamp }

// JWT secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your_refresh_secret";

/**
 * Logging helper function
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @param {Object} req - Express request object (optional)
 */
const log = (level, message, meta = {}, req) => {
  const timestamp = new Date().toISOString();
  const requestId = req && req.requestId ? req.requestId : "unknown";
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${requestId}] ${message}`;

  if (level === "error") {
    console.error(logMessage, Object.keys(meta).length ? meta : "");
  } else if (level === "warn") {
    console.warn(logMessage, Object.keys(meta).length ? meta : "");
  } else if (level === "debug" && process.env.NODE_ENV === "development") {
    console.debug(logMessage, Object.keys(meta).length ? meta : "");
  } else if (level === "info") {
    console.log(logMessage, Object.keys(meta).length ? meta : "");
  }
};

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

/**
 * Generate access and refresh tokens for a user
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Tokens and token document
 */
const generateTokens = async (user, options = {}) => {
  const { ipAddress = "", userAgent = "" } = options;

  try {
    // Generate access token
    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        type: TOKEN_TYPES.ACCESS,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token
    const refreshToken = generateRandomString(64);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create token document
    const tokenDoc = new Token({
      userType: user.constructor.modelName,
      userId: user._id,
      token: accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      refreshTokenExpiresAt: refreshTokenExpiry,
      isActive: true,
      userData: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split("@")[0],
      },
    });

    await tokenDoc.save();

    // Cache the token
    tokenCache.set(accessToken, {
      user: tokenDoc.userData,
      expiresAt: tokenDoc.expiresAt,
      lastUsed: Date.now(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: "Bearer",
      tokenDoc,
    };
  } catch (error) {
    log("error", "Error generating tokens", { error: error.message });
    throw new Error("Failed to generate tokens");
  }
};

/**
 * Verify and validate an access token
 * @param {string} tokenString - The JWT token to verify
 * @returns {Promise<Object>} Verification result
 */
const verifyAccessToken = async (tokenString) => {
  if (!tokenString) {
    return { valid: false, error: "No token provided" };
  }

  // Check in-memory cache first
  const cachedToken = tokenCache.get(tokenString);
  if (cachedToken) {
    if (cachedToken.expiresAt > Date.now()) {
      // Update last used time
      cachedToken.lastUsed = Date.now();
      return {
        valid: true,
        user: cachedToken.user,
        token: tokenString,
        fromCache: true,
      };
    }
    // Remove expired token from cache
    tokenCache.delete(tokenString);
  }

  try {
    // Verify JWT signature and decode token
    const decoded = jwt.verify(tokenString, JWT_SECRET);

    // Check if token type is valid (support both ACCESS and access for backward compatibility)
    if (
      !decoded.type ||
      (decoded.type !== "access" && decoded.type !== "ACCESS")
    ) {
      throw new Error("Invalid token type");
    }

    // Check token in database
    const tokenDoc = await Token.findOne({
      token: tokenString,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new Error("Token not found or expired");
    }

    // Update last used time
    tokenDoc.lastUsedAt = new Date();
    await tokenDoc.save();

    // Ensure user data is properly structured
    const userData = {
      id: tokenDoc.userId,
      userType: tokenDoc.userType, // Include userType from tokenDoc
      ...tokenDoc.userData,
    };

    // Cache the token
    const tokenData = {
      user: userData,
      expiresAt: tokenDoc.expiresAt,
      lastUsed: Date.now(),
    };

    tokenCache.set(tokenString, tokenData);

    // Update user cache
    if (tokenDoc.userData) {
      userCache.set(tokenDoc.userData.id, {
        data: tokenDoc.userData,
        timestamp: Date.now(),
      });
    }

    return {
      valid: true,
      user: {
        ...tokenDoc.userData,
        userType: tokenDoc.userType // Ensure userType is included in the user object
      },
      token: tokenString,
      fromCache: false,
    };
  } catch (error) {
    log("warn", "Token verification failed", {
      error: error.message,
      name: error.name,
    });

    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return {
        valid: false,
        error: "Token has expired",
        code: "TOKEN_EXPIRED",
      };
    }

    if (error.name === "JsonWebTokenError") {
      return {
        valid: false,
        error: "Invalid token",
        code: "INVALID_TOKEN",
      };
    }

    return {
      valid: false,
      error: "Token verification failed",
      code: "TOKEN_VERIFICATION_FAILED",
    };
  }
};

/**
 * Refresh an access token using a refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} New tokens
 */
const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("No refresh token provided");
  }

  try {
    // Find the refresh token in database
    const tokenDoc = await Token.findOne({
      refreshToken,
      isActive: true,
      refreshTokenExpiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new Error("Invalid or expired refresh token");
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: tokenDoc.userId,
        email: tokenDoc.userData.email,
        role: tokenDoc.userData.role,
        type: TOKEN_TYPES.ACCESS,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY }
    );

    // Update token document with new access token
    tokenDoc.token = accessToken;
    tokenDoc.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    tokenDoc.lastUsedAt = new Date();
    await tokenDoc.save();

    // Update cache
    const tokenData = {
      user: tokenDoc.userData,
      expiresAt: tokenDoc.expiresAt,
      lastUsed: Date.now(),
    };

    tokenCache.set(accessToken, tokenData);

    return {
      accessToken,
      refreshToken: tokenDoc.refreshToken, // Return same refresh token
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: "Bearer",
      user: tokenDoc.userData,
    };
  } catch (error) {
    log("error", "Token refresh failed", {
      error: error.message,
      name: error.name,
    });
    throw error;
  }
};

/**
 * Invalidate a token (used during logout)
 * @param {string} tokenString - The token to invalidate
 * @returns {Promise<Object>} Result of the operation
 */
const invalidateToken = async (tokenString) => {
  if (!tokenString) {
    return { success: false, error: "No token provided" };
  }

  try {
    // Remove from memory cache
    const cachedToken = tokenCache.get(tokenString);
    tokenCache.delete(tokenString);

    // Mark as inactive in database
    const result = await Token.findOneAndUpdate(
      { token: tokenString },
      {
        isActive: false,
        revokedAt: new Date(),
        expiresAt: new Date(), // Expire immediately
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: "Token not found" };
    }

    // Clear any cached user data
    if (result.userData?.id) {
      userCache.delete(result.userData.id);
    } else if (cachedToken?.user?.id) {
      userCache.delete(cachedToken.user.id);
    }

    return {
      success: true,
      token: tokenString,
      invalidatedAt: new Date(),
    };
  } catch (error) {
    log("error", "Error invalidating token", {
      error: error.message,
      token: tokenString,
    });
    return {
      success: false,
      error: "Failed to invalidate token",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};

/**
 * Invalidate all tokens for a specific user
 * @param {string} userId - The user ID to invalidate tokens for
 * @returns {Promise<Object>} Result of the operation
 */
const invalidateAllUserTokens = async (userId) => {
  if (!userId) {
    return { success: false, error: "No user ID provided" };
  }

  try {
    // Mark all user's tokens as inactive in database
    const result = await Token.updateMany(
      {
        userId,
        isActive: true,
      },
      {
        isActive: false,
        revokedAt: new Date(),
        expiresAt: new Date(), // Expire immediately
      }
    );

    // Clear user data from caches
    userCache.delete(userId);

    // Remove user's tokens from token cache
    for (const [token, data] of tokenCache.entries()) {
      if (data.user?.id === userId) {
        tokenCache.delete(token);
      }
    }

    return {
      success: true,
      userId,
      tokensInvalidated: result.modifiedCount || 0,
      timestamp: new Date(),
    };
  } catch (error) {
    log("error", "Error invalidating user tokens", {
      error: error.message,
      userId,
    });
    return {
      success: false,
      error: "Failed to invalidate user tokens",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};

/**
 * Clean up expired tokens and cache entries
 * @returns {Promise<Object>} Cleanup result
 */
const cleanupExpiredTokens = async () => {
  const now = new Date();
  let result = {
    tokensDeleted: 0,
    cacheEntriesCleared: 0,
    success: true,
    timestamp: now.toISOString(),
  };

  try {
    // Delete expired tokens from database
    const dbResult = await Token.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { refreshTokenExpiresAt: { $lt: now } },
      ],
    });

    result.tokensDeleted = dbResult.deletedCount || 0;

    // Clean up expired tokens from cache
    for (const [key, { expiresAt }] of tokenCache.entries()) {
      if (new Date(expiresAt) < now) {
        tokenCache.delete(key);
        result.cacheEntriesCleared++;
      }
    }

    log("info", "Token cleanup completed", result);
  } catch (error) {
    result.success = false;
    result.error = error.message;
    log("error", "Error cleaning up expired tokens", { error: error.message });
  }

  return result;
};

// Schedule token cleanup
if (process.env.NODE_ENV !== "test") {
  setInterval(cleanupExpiredTokens, TOKEN_CONFIG.CLEANUP_INTERVAL);
}

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  // Skip authentication for public routes
  if (req.path.includes("/api/auth/")) {
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "No authentication token provided",
    });
  }

  const token = authHeader.split(" ")[1];
  const result = await verifyAccessToken(token);

  if (!result.valid) {
    return res.status(401).json({
      success: false,
      code: result.code || "UNAUTHORIZED",
      message: result.error || "Invalid or expired token",
    });
  }

  // Attach user and token to request object
  req.user = result.user;
  req.token = token;

  // Log successful authentication
  log(
    "info",
    "User authenticated",
    {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      path: req.path,
      method: req.method,
    },
    req
  );

  next();
};

/**
 * Middleware to enforce role-based access control
 * @param {Array<string>} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    // If no roles specified, any authenticated user can access
    if (!Array.isArray(roles) || roles.length === 0) {
      return next();
    }

    // Check if user has required role
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      log(
        "warn",
        "Unauthorized access attempt",
        {
          userId: req.user?.id,
          userRole: req.user?.role,
          requiredRoles: roles,
          path: req.path,
          method: req.method,
        },
        req
      );

      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

/**
 * Handle token refresh
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleTokenRefresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        code: "BAD_REQUEST",
        message: "Refresh token is required",
      });
    }

    const tokens = await refreshTokens(refreshToken);

    res.json({
      success: true,
      ...tokens,
    });
  } catch (error) {
    log("error", "Token refresh failed", {
      error: error.message,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      code: "INVALID_REFRESH_TOKEN",
      message: "Invalid or expired refresh token",
    });
  }
};

/**
 * Handle user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleLogout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({
        success: false,
        code: "BAD_REQUEST",
        message: "No token provided",
      });
    }

    const result = await invalidateToken(token);
    if (!result.success) {
      log("warn", "Logout failed", { error: result.error }, req);
    }

    res.json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    log("error", "Logout error", {
      error: error.message,
      path: req.path,
    });

    res.status(500).json({
      success: false,
      code: "LOGOUT_ERROR",
      message: "Error during logout",
    });
  }
};

// Export all functions
const authMiddleware = {
  // Middleware functions
  auth: authenticate, // Alias for authenticate for backward compatibility
  authenticate,
  authorize,
  handleTokenRefresh,
  handleLogout,

  // Token management functions
  generateTokens,
  verifyAccessToken,
  refreshTokens,
  invalidateToken,
  invalidateAllUserTokens,
  cleanupExpiredTokens,

  // Utility functions
  log,
  generateRandomString,
};

module.exports = authMiddleware;
