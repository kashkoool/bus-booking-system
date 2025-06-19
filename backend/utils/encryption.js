const crypto = require('crypto');

// Use a fixed key for development (should be in environment variables in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8a1b2c3d4e5f6g7h8'; // 32 chars for AES-256

// Decrypt credit card data
function decryptCardData(encryptedData, iv) {
  try {
    if (!encryptedData || !iv) {
      console.error('Missing encrypted data or IV');
      return null;
    }

    const algorithm = 'aes-256-cbc';
    
    // Ensure IV is a buffer of correct length (16 bytes for AES)
    const ivBuffer = Buffer.isBuffer(iv) ? iv : Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(ENCRYPTION_KEY),
      ivBuffer
    );

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting card data:', error.message);
    return null;
  }
}

// Encrypt credit card data (for reference)
function encryptCardData(data, iv) {
  try {
    if (!data) return null;
    
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY || 'your-secret-key-32-characters-long';
    
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(encryptionKey, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  } catch (error) {
    console.error('Error in encryptData:', error);
    throw error;
  }
}

// Generate a random IV
function generateIV() {
  return crypto.randomBytes(16);
}

// Convert IV to a string
function ivToString(iv) {
  return iv.toString('hex');
}

// Convert string to IV
function stringToIv(ivString) {
  return Buffer.from(ivString, 'hex');
}

module.exports = {
  decryptCardData,
  encryptCardData,
  generateIV,
  ivToString,
  stringToIv
};
