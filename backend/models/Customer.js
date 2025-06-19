const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const passwordComplexity = require("joi-password-complexity");
const Joi = require("joi");
const CreditCard = require("./CreditCard");

// Define customer schema
const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, required: true },
    phone: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    role: { type: String, default: "customer" },
    // Virtual for customer's credit cards
    creditCards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CreditCard",
      },
    ],
    // Default payment method (reference to a credit card)
    defaultPaymentMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditCard",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Method to generate JWT for the customer
customerSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      type: "access",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// Add a credit card to customer's account
customerSchema.methods.addCreditCard = async function (cardData) {
  try {
    const card = new CreditCard({
      user: this._id,
      ...cardData,
    });

    await card.save();

    // Add card to customer's cards if not already there
    if (!this.creditCards.includes(card._id)) {
      this.creditCards.push(card._id);

      // If this is the first card, set it as default
      if (this.creditCards.length === 1) {
        this.defaultPaymentMethod = card._id;
      }

      await this.save();
    }

    return card;
  } catch (error) {
    throw error;
  }
};

// Remove a credit card
customerSchema.methods.removeCreditCard = async function (cardId) {
  try {
    // Check if card belongs to customer
    const card = await CreditCard.findOne({ _id: cardId, user: this._id });
    if (!card) {
      throw new Error("Card not found or does not belong to customer");
    }

    // Remove card reference from customer
    this.creditCards = this.creditCards.filter(
      (id) => id.toString() !== cardId.toString()
    );

    // If removing default card, set a new default if available
    if (
      this.defaultPaymentMethod &&
      this.defaultPaymentMethod.toString() === cardId.toString()
    ) {
      this.defaultPaymentMethod =
        this.creditCards.length > 0 ? this.creditCards[0] : null;
    }

    await this.save();

    // Delete the card document
    await CreditCard.findByIdAndDelete(cardId);

    return true;
  } catch (error) {
    throw error;
  }
};

// Set default payment method
customerSchema.methods.setDefaultPaymentMethod = async function (cardId) {
  try {
    // Verify card belongs to customer
    const card = await CreditCard.findOne({ _id: cardId, user: this._id });
    if (!card) {
      throw new Error("Card not found or does not belong to customer");
    }

    this.defaultPaymentMethod = card._id;
    await this.save();

    // Also update the card's isDefault status
    await CreditCard.updateMany(
      { user: this._id },
      { $set: { isDefault: false } }
    );

    card.isDefault = true;
    await card.save();

    return card;
  } catch (error) {
    throw error;
  }
};

// Validation schema for customer
const validateCustomer = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required().label("First Name"),
    lastName: Joi.string().required().label("Last Name"),
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().required().label("Password"),
    age: Joi.number().required().label("Age"),
    phone: Joi.string().required().label("Phone"),
    country: Joi.string().required().label("Country"),
    gender: Joi.string().valid("male", "female").required().label("Gender"),
  });
  return schema.validate(data);
};

// Create Customer model
const Customer = mongoose.model("Customer", customerSchema);

module.exports = { Customer, validateCustomer };
