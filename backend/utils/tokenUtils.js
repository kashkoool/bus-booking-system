const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Token = require('../models/Token');

// Configuration
const CONFIG = {
    // JWT Secrets
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    REFRESH_SECRET: process.env.REFRESH_SECRET || 'your_refresh_secret',
    
    // Token Expiry
    ACCESS_TOKEN_EXPIRY: '15m',  // 15 minutes
    REFRESH_TOKEN_EXPIRY: '7d',  // 7 days
    
    // Token Types
    TOKEN_TYPES: {
        ACCESS: 'access',
        REFRESH: 'refresh'
    }
};

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

/**
 * Generate access and refresh tokens for a user
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Tokens and token document
 */
const generateTokens = async (user, options = {}) => {
    const {
        ipAddress = '',
        userAgent = ''
    } = options;

    // Generate tokens
    const accessToken = jwt.sign(
        { 
            id: user._id, 
            email: user.email, 
            role: user.role,
            type: CONFIG.TOKEN_TYPES.ACCESS
        },
        CONFIG.JWT_SECRET,
        { expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY }
    );

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
            name: user.name || user.email.split('@')[0]
        }
    });

    await tokenDoc.save();

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
        tokenType: 'Bearer',
        tokenDoc
    };
};

/**
 * Verify access token
 * @param {string} token - Access token
 * @returns {Promise<Object>} Token verification result
 */
const verifyAccessToken = async (token) => {
    try {
        // Verify JWT signature
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        
        if (decoded.type !== CONFIG.TOKEN_TYPES.ACCESS) {
            throw new Error('Invalid token type');
        }
        
        // Check token in database
        const tokenDoc = await Token.findOne({
            token,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            throw new Error('Token not found or expired');
        }

        // Update last used time
        tokenDoc.lastUsedAt = new Date();
        await tokenDoc.save();

        return {
            valid: true,
            user: tokenDoc.userData,
            token: tokenDoc
        };
    } catch (error) {
        return { 
            valid: false, 
            error: error.message,
            name: error.name
        };
    }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
const refreshTokens = async (refreshToken) => {
    try {
        // Find the refresh token in database
        const tokenDoc = await Token.findOne({
            refreshToken,
            isActive: true,
            refreshTokenExpiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            throw new Error('Invalid or expired refresh token');
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { 
                id: tokenDoc.userId, 
                email: tokenDoc.userData.email, 
                role: tokenDoc.userData.role,
                type: CONFIG.TOKEN_TYPES.ACCESS
            },
            CONFIG.JWT_SECRET,
            { expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY }
        );

        // Update token document
        tokenDoc.token = accessToken;
        tokenDoc.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        tokenDoc.lastUsedAt = new Date();
        await tokenDoc.save();

        return {
            accessToken,
            refreshToken: tokenDoc.refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
            tokenType: 'Bearer'
        };
    } catch (error) {
        throw new Error('Failed to refresh token: ' + error.message);
    }
};

/**
 * Revoke a token (logout)
 * @param {string} token - Access token
 * @returns {Promise<boolean>} Success status
 */
const revokeToken = async (token) => {
    try {
        const result = await Token.findOneAndUpdate(
            { token },
            { 
                isActive: false,
                revokedAt: new Date()
            }
        );
        return !!result;
    } catch (error) {
        console.error('Error revoking token:', error);
        return false;
    }
};

/**
 * Revoke all user's tokens (for password change, etc.)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
const revokeAllUserTokens = async (userId) => {
    try {
        const result = await Token.updateMany(
            { userId, isActive: true },
            { 
                isActive: false,
                revokedAt: new Date()
            }
        );
        return result.modifiedCount || 0;
    } catch (error) {
        console.error('Error revoking user tokens:', error);
        return 0;
    }
};

/**
 * Clean up expired tokens from database
 * @returns {Promise<Object>} Cleanup result
 */
const cleanupExpiredTokens = async () => {
    try {
        const now = new Date();
        const result = await Token.deleteMany({
            $or: [
                { expiresAt: { $lt: now } },
                { refreshTokenExpiresAt: { $lt: now } }
            ]
        });
        return {
            success: true,
            deletedCount: result.deletedCount || 0
        };
    } catch (error) {
        console.error('Error cleaning up tokens:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Schedule token cleanup (run every hour)
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = {
    generateTokens,
    verifyAccessToken,
    refreshTokens,
    revokeToken,
    revokeAllUserTokens,
    cleanupExpiredTokens,
    TOKEN_TYPES: CONFIG.TOKEN_TYPES
};
