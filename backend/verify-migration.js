const mongoose = require('mongoose');
require('dotenv').config();
const Staff = require('./models/Staff');

async function verifyMigration() {
  try {
    console.log('🚀 Verifying database migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bus_booking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check staff collection for documents
    const staffCount = await Staff.countDocuments();
    console.log(`\n📊 Total staff members: ${staffCount}`);
    
    if (staffCount > 0) {
      // Check field statistics
      console.log('\n🔍 Checking field statistics:');
      const fieldStats = await Staff.aggregate([
        {
          $facet: {
            isActiveStats: [
              { $group: { _id: '$isActive', count: { $sum: 1 } } }
            ],
            statusStats: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            staffTypeStats: [
              { $group: { _id: '$staffType', count: { $sum: 1 } } }
            ]
          }
        }
      ]);

      console.log('\n📋 Field Distribution:');
      console.log('isActive:', fieldStats[0].isActiveStats);
      console.log('status:', fieldStats[0].statusStats);
      console.log('staffType:', fieldStats[0].staffTypeStats);

      // Check a sample of staff members
      const sampleStaff = await Staff.findOne().select('-password -__v');
      console.log('\n👤 Sample staff member:', JSON.stringify(sampleStaff?.toObject(), null, 2));
      
      // Check for required fields
      const invalidStaff = await Staff.findOne({
        $or: [
          { username: { $exists: false } },
          { gender: { $exists: false } },
          { phone: { $exists: false } },
          { staffType: { $exists: false } },
          { isActive: { $exists: false } },
          { status: { $exists: false } }
        ]
      });
      
      if (invalidStaff) {
        console.warn('⚠️  Found staff with missing required fields:', invalidStaff._id);
      } else {
        console.log('✅ All staff have required fields');
      }
    }
    
    // Check indexes
    const indexes = await Staff.collection.indexes();
    console.log('\n🔍 Indexes on staff collection:');
    let hasTextIndex = false;
    let hasCompanyStatusIndex = false;
    
    indexes.forEach((index, i) => {
      const indexName = index.name || 'unnamed_index';
      const indexKeys = Object.entries(index.key).map(([key, value]) => 
        `${key}(${value === 1 ? 'asc' : 'desc'})`
      ).join(', ');
      
      console.log(`  ${i + 1}. ${indexName.padEnd(30)} [${indexKeys}]`);
      
      // Check for text index
      if (index.weights) {
        hasTextIndex = true;
      }
      
      // Check for companyID + status compound index
      if (index.key.companyID === 1 && index.key.status === 1) {
        hasCompanyStatusIndex = true;
      }
    });
    
    // Verify required indexes
    console.log('\n🔍 Verifying required indexes:');
    console.log(`  ${hasTextIndex ? '✅' : '❌'} Text search index for username, email, phone`);
    console.log(`  ${hasCompanyStatusIndex ? '✅' : '❌'} Compound index for companyID + status`);
    
    // Check validation rules
    const staffSchema = Staff.schema.obj;
    console.log('\n🔍 Validation rules for Staff model:');
    console.log('  username:', {
      required: staffSchema.username.required,
      minlength: staffSchema.username.minlength,
      maxlength: staffSchema.username.maxlength
    });
    console.log('  email:', {
      required: staffSchema.email.required,
      validate: staffSchema.email.validate ? 'exists' : 'missing'
    });
    console.log('  phone:', {
      required: staffSchema.phone.required,
      validate: staffSchema.phone.validate ? 'exists' : 'missing'
    });
    
    console.log('\n✅ Verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
