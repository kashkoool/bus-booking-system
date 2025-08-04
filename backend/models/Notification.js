const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const notificationSchema = new mongoose.Schema(
  {
    // Customer's email who should receive the notification
    userEmail: {
      type: String,
      index: true,
      trim: true,
      lowercase: true,
    },

    // Title of the notification
    title: {
      type: String,
      required: true,
    },

    // Message content
    message: {
      type: String,
      required: true,
    },

    // Type of notification (for styling/filtering)
    type: {
      type: String,
      enum: [
        "trip_cancellation",
        "booking_confirmation",
        "payment",
        "system",
        "info",
        "update",
      ],
      default: "system",
    },

    // Related entity type (trip, booking, etc.)
    relatedEntity: {
      type: String,
      enum: ["trip", "booking", "payment"],
    },

    // ID of the related entity
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Company ID if notification is from a company
    companyID: {
      type: Number,
    },

    // Company name for display
    companyName: {
      type: String,
    },

    // Whether the notification has been read
    isRead: {
      type: Boolean,
      default: false,
    },

    // When the notification was created
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create virtual for company population
notificationSchema.virtual("company", {
  ref: "Company",
  localField: "companyID",
  foreignField: "companyID",
  justOne: true,
});

// Indexes for faster querying
notificationSchema.index({ userEmail: 1, createdAt: -1 });
notificationSchema.index({ userEmail: 1, isRead: 1 });

// Virtual for notification URL
notificationSchema.virtual("url").get(function () {
  return `/notifications/${this._id}`;
});

// Pre-save hook to update readAt when isRead changes
notificationSchema.pre("save", function (next) {
  if (this.isModified("isRead") && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function (notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds } },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

notificationSchema.plugin(mongoosePaginate);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
