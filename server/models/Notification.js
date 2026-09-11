import mongoose from 'mongoose';

const notificationSchema =
  new mongoose.Schema(
    {
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      type: {
        type: String,
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      request: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationRequest',
        default: null,
      },

      organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
      },

      // --------------------------------------------------------
      // Additional notification-specific information.
      //
      // Examples:
      //
      // {
      //   taskId,
      //   taskTitle,
      //   role,
      //   expiresAt
      // }
      // --------------------------------------------------------

      data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      // --------------------------------------------------------
      // null = unread
      // Date = read
      // --------------------------------------------------------

      readAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

// ============================================================
// Indexes
// ============================================================

notificationSchema.index({
  recipient: 1,
  readAt: 1,
  createdAt: -1,
});

// ============================================================
// Virtual: read
//
// Frontend can continue using:
//
// notification.read
//
// while MongoDB continues storing:
//
// readAt
// ============================================================

notificationSchema.virtual(
  'read',
).get(function () {
  return Boolean(
    this.readAt,
  );
});

// Make virtual fields appear in JSON responses.

notificationSchema.set(
  'toJSON',
  {
    virtuals: true,
  },
);

notificationSchema.set(
  'toObject',
  {
    virtuals: true,
  },
);

export default mongoose.model(
  'Notification',
  notificationSchema,
);