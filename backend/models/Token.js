const mongoose = require('mongoose');

// Check if model exists before defining it
if (mongoose.models.Token) {
    module.exports = mongoose.model('Token');
    return;
}

const tokenSchema = new mongoose.Schema({
    userType: { 
        type: String, 
        required: true, 
        enum: ['Admin', 'Company', 'Staff', 'Customer'] 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        refPath: 'userType' 
    },
    token: { 
        type: String, 
        required: true,
        unique: true,
        index: true
    },
    refreshToken: {
        type: String,
        unique: true,
        sparse: true
    },
    ipAddress: String,
    userAgent: String,
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: { 
        type: Date, 
        required: true,
        index: { expires: '0s' } // Auto-delete expired tokens
    },
    lastUsedAt: {
        type: Date,
        default: Date.now
    },
    userData: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true 
    }
}, {
    timestamps: true
});

// Index for faster lookups
tokenSchema.index({ token: 1, isActive: 1 });
tokenSchema.index({ userId: 1, isActive: 1 });

// Static method to clean up expired tokens
tokenSchema.statics.cleanupExpired = async function() {
    return this.deleteMany({ 
        expiresAt: { $lt: new Date() } 
    });
};

// Method to revoke token
tokenSchema.methods.revoke = function() {
    this.isActive = false;
    return this.save();
};

// Pre-save hook to update lastUsedAt
tokenSchema.pre('save', function(next) {
    if (this.isModified('lastUsedAt') || this.isNew) {
        this.lastUsedAt = new Date();
    }
    next();
});

const Token = mongoose.model('Token', tokenSchema);

// Add cleanup job (only in production or development, not in test)
if (process.env.NODE_ENV !== 'test') {
    const cleanupInterval = 60 * 60 * 1000; // 1 hour
    setInterval(async () => {
        try {
            await Token.cleanupExpired();
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }, cleanupInterval);
}

module.exports = Token;
