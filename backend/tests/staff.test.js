const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../app');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const { createTestUser, getAuthToken } = require('./test-utils');

describe('Staff Management API', () => {
  let testCompany;
  let managerToken;
  let testStaff;
  let testStaff2;

  before(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/bus_booking_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear test data
    await Staff.deleteMany({});
    await Company.deleteMany({});

    // Create test company
    testCompany = await Company.create({
      companyID: 1001,
      companyName: 'Test Bus Company',
      email: 'test@company.com',
      phone: '1234567890',
      address: '123 Test St',
      isActive: true
    });

    // Create test manager user
    const manager = await createTestUser({
      username: 'testmanager',
      email: 'manager@test.com',
      password: 'password123',
      role: 'manager',
      companyID: testCompany.companyID
    });

    // Get auth token for manager
    managerToken = await getAuthToken('manager@test.com', 'password123');

    // Create test staff members
    testStaff = await Staff.create({
      username: 'teststaff1',
      email: 'staff1@test.com',
      phone: '1234567891',
      gender: 'male',
      staffType: 'driver',
      companyID: testCompany.companyID,
      isActive: true,
      status: 'active'
    });

    testStaff2 = await Staff.create({
      username: 'teststaff2',
      email: 'staff2@test.com',
      phone: '1234567892',
      gender: 'female',
      staffType: 'accountant',
      companyID: testCompany.companyID,
      isActive: true,
      status: 'active'
    });
  });

  after(async () => {
    // Clean up test data
    await Staff.deleteMany({});
    await Company.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/company/staff', () => {
    it('should return all staff for the company', async () => {
      const res = await request(app)
        .get('/api/company/staff')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.least(2);
      expect(res.body.pagination).to.have.property('total');
    });

    it('should filter staff by status', async () => {
      const res = await request(app)
        .get('/api/company/staff?status=active')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.every(staff => staff.status === 'active')).to.be.true;
    });

    it('should search staff by username', async () => {
      const res = await request(app)
        .get('/api/company/staff?search=teststaff1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.be.at.least(1);
      expect(res.body.data[0].username).to.equal('teststaff1');
    });
  });

  describe('PUT /api/company/updatestaff/:id', () => {
    it('should update staff details', async () => {
      const updates = {
        username: 'updatedstaff1',
        phone: '9876543210',
        isActive: false
      };

      const res = await request(app)
        .put(`/api/company/updatestaff/${testStaff._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.data.username).to.equal(updates.username);
      expect(res.body.data.phone).to.equal(updates.phone);
      expect(res.body.data.isActive).to.equal(updates.isActive);
    });

    it('should not allow updating staff from another company', async () => {
      // Create another company and staff
      const otherCompany = await Company.create({
        companyID: 1002,
        companyName: 'Other Company',
        email: 'other@company.com',
        phone: '0987654321'
      });

      const otherStaff = await Staff.create({
        username: 'otherstaff',
        email: 'other@staff.com',
        phone: '1234567899',
        gender: 'male',
        staffType: 'driver',
        companyID: otherCompany.companyID
      });

      const res = await request(app)
        .put(`/api/company/updatestaff/${otherStaff._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ username: 'hacked' });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });
  });

  describe('DELETE /api/company/deletestaff/:id', () => {
    it('should delete a staff member', async () => {
      const staffToDelete = await Staff.create({
        username: 'tobedeleted',
        email: 'delete@test.com',
        phone: '1234567888',
        gender: 'male',
        staffType: 'employee',
        companyID: testCompany.companyID
      });

      const res = await request(app)
        .delete(`/api/company/deletestaff/${staffToDelete._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);

      // Verify staff is deleted
      const deletedStaff = await Staff.findById(staffToDelete._id);
      expect(deletedStaff).to.be.null;
    });

    it('should not allow deleting non-existent staff', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/company/deletestaff/${nonExistentId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
    });
  });
});
