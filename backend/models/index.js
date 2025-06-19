// Centralized model access to prevent circular dependencies
const mongoose = require("mongoose");

// Export the mongoose instance
exports.mongoose = mongoose;

// Export all models
exports.Admin = require("./Admin");
exports.Customer = require("./Customer");
exports.Company = require("./Company");
exports.Staff = require("./Staff");
exports.Bus = require("./Bus");
exports.Trip = require("./Trip");
exports.Booking = require("./Booking");
exports.Payment = require("./Payment");
exports.CreditCard = require("./CreditCard");
exports.Notification = require("./Notification");
exports.Token = require("./Token");

// Export all models as a single object
const models = {
  Admin: exports.Admin,
  Customer: exports.Customer,
  Company: exports.Company,
  Staff: exports.Staff,
  Bus: exports.Bus,
  Trip: exports.Trip,
  Booking: exports.Booking,
  Payment: exports.Payment,
  CreditCard: exports.CreditCard,
  Notification: exports.Notification,
  Token: exports.Token,
};

module.exports = models;
