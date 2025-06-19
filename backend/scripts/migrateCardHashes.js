require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { CreditCard } = require('../models/CreditCard');

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'CARD_ENCRYPTION_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Helper function to decrypt card number
function decryptCardNumber(encryptedCard, iv) {
  if (!encryptedCard || !iv) {
    console.error('Missing required parameters for decryption');
    return null;
  }

  try {
    const encryptionKey = Buffer.from(process.env.CARD_ENCRYPTION_KEY, 'hex');
    if (encryptionKey.length !== 32) {
      console.error('Invalid encryption key length. Must be 32 bytes (64 hex chars)');
      return null;
    }

    const ivBuffer = Buffer.from(iv, 'hex');
    if (ivBuffer.length !== 16) {
      console.error('Invalid IV length. Must be 16 bytes (32 hex chars)');
      return null;
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, ivBuffer);
    
    let decrypted = decipher.update(encryptedCard, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Basic validation of decrypted card number
    if (!/^\d+$/.test(decrypted)) {
      console.error('Decrypted card number contains non-digit characters');
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting card:', error.message);
    return null;
  }
}

// Helper function to hash card number consistently
function hashCardNumber(cardNumber) {
  if (!cardNumber) {
    console.error('No card number provided for hashing');
    return null;
  }
  
  try {
    // Clean the card number (remove all non-digit characters)
    const cleanNumber = cardNumber.toString().replace(/\D/g, '');
    if (!cleanNumber) {
      console.error('No digits found in card number');
      return null;
    }
    
    const salt = process.env.CARD_HASH_SALT || 'default-salt';
    return crypto.createHash('sha256')
      .update(cleanNumber + salt)
      .digest('hex');
  } catch (error) {
    console.error('Error hashing card number:', error.message);
    return null;
  }
}

async function migrateCardHashes() {
  const startTime = Date.now();
  const stats = {
    totalCards: 0,
    updated: 0,
    skipped: {
      missingIv: 0,
      missingCardNumber: 0,
      decryptionFailed: 0,
      hashingFailed: 0,
      otherErrors: 0
    },
    processed: 0
  };

  try {
    console.log('Starting card hash migration...');
    
    // Connect to MongoDB with connection options
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 60000,  // 1 minute
      serverSelectionTimeoutMS: 30000 // 30 seconds
    };
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    console.log('Connected to MongoDB');

    // Find all cards that need hashing (in batches)
    const batchSize = 100;
    let lastProcessedId = null;
    let hasMore = true;
    let batchNumber = 0;

    while (hasMore) {
      batchNumber++;
      console.log(`\nProcessing batch ${batchNumber}...`);
      
      // Build query to find cards without a hash
      const query = {
        cardNumber: { $exists: true, $ne: null },
        $or: [
          { cardNumberHash: { $exists: false } },
          { cardNumberHash: null }
        ]
      };
      
      // Add cursor for pagination
      if (lastProcessedId) {
        query._id = { $gt: lastProcessedId };
      }
      
      // Get a batch of cards
      const cards = await CreditCard.find(query)
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();
      
      stats.totalCards += cards.length;
      hasMore = cards.length === batchSize;
      
      if (cards.length === 0) {
        console.log('No more cards to process');
        break;
      }
      
      // Process each card in the batch
      for (const card of cards) {
        stats.processed++;
        lastProcessedId = card._id;
        
        // Log progress every 100 cards
        if (stats.processed % 100 === 0) {
          console.log(`Processed ${stats.processed} cards...`);
        }
        
        try {
          // Validate required fields
          if (!card.iv) {
            console.log(`Skipping card ${card._id} - missing IV`);
            stats.skipped.missingIv++;
            continue;
          }
          
          if (!card.cardNumber) {
            console.log(`Skipping card ${card._id} - missing card number`);
            stats.skipped.missingCardNumber++;
            continue;
          }
          
          // Decrypt the card number
          const decryptedCard = decryptCardNumber(card.cardNumber, card.iv);
          
          if (!decryptedCard) {
            console.log(`Skipping card ${card._id} - decryption failed`);
            stats.skipped.decryptionFailed++;
            continue;
          }
          
          // Hash the decrypted card number
          const cardHash = hashCardNumber(decryptedCard);
          
          if (!cardHash) {
            console.log(`Skipping card ${card._id} - hashing failed`);
            stats.skipped.hashingFailed++;
            continue;
          }
          
          // Update the card with the hash (using updateOne with upsert:false for safety)
          const result = await CreditCard.updateOne(
            { _id: card._id },
            { $set: { cardNumberHash: cardHash } },
            { upsert: false }
          );
          
          if (result.modifiedCount === 1) {
            stats.updated++;
            if (stats.updated % 10 === 0) {
              console.log(`Updated ${stats.updated} cards so far...`);
            }
          }
          
        } catch (error) {
          console.error(`Error processing card ${card._id}:`, error.message);
          stats.skipped.otherErrors++;
        }
      }
      
      // Small delay between batches to prevent overwhelming the database
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Calculate and log statistics
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total cards processed: ${stats.totalCards}`);
    console.log(`Successfully updated: ${stats.updated}`);
    console.log('\nSkipped cards:');
    console.log(`- Missing IV: ${stats.skipped.missingIv}`);
    console.log(`- Missing card number: ${stats.skipped.missingCardNumber}`);
    console.log(`- Decryption failed: ${stats.skipped.decryptionFailed}`);
    console.log(`- Hashing failed: ${stats.skipped.hashingFailed}`);
    console.log(`- Other errors: ${stats.skipped.otherErrors}`);
    console.log(`\nTotal execution time: ${duration} seconds`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Ensure the MongoDB connection is closed
    if (mongoose.connection.readyState === 1) { // 1 = connected
      await mongoose.connection.close();
    }
  }
}

// Run the migration
migrateCardHashes();
