import Notification from '../models/Notification.js';

import {
  emitNotificationNew,
} from '../socket/notificationEvents.js';

// ============================================================
// Create notification
//
// Responsibilities:
//
// 1. Save notification in MongoDB
// 2. Emit notification:new through Socket.IO
//
// This means notifications work in BOTH cases:
//
// Database:
//   Notification is persisted
//
// Real-time:
//   Online user receives it immediately
// ============================================================

export const createNotification = async ({
  recipient,
  type,
  title,
  message,
  request = null,
  organization = null,
  data = {},
  io = null,
}) => {
  try {
    const notification =
      await Notification.create({
        recipient,
        type,
        title,
        message,
        request,
        organization,
        data,
      });

    // ----------------------------------------------------------
    // Emit real-time notification
    // ----------------------------------------------------------

    if (io) {
      emitNotificationNew(
        io,
        notification,
      );
    }

    return notification;
  } catch (error) {
    console.error(
      '[Notification] Failed to create notification:',
      error.message,
    );

    // Notification failure should not normally break the main
    // business operation.
    return null;
  }
};

// ============================================================
// Create multiple notifications
//
// Useful for join requests where several owners/admins need
// to receive the same notification.
// ============================================================

export const createNotifications = async ({
  recipients = [],
  type,
  title,
  message,
  request = null,
  organization = null,
  data = {},
  io = null,
}) => {
  try {
    if (!recipients.length) {
      return [];
    }

    const notifications =
      await Notification.insertMany(
        recipients.map(
          (recipient) => ({
            recipient,
            type,
            title,
            message,
            request,
            organization,
            data,
          }),
        ),
      );

    // ----------------------------------------------------------
    // Emit every notification individually
    //
    // Each notification goes only to its recipient's room.
    // ----------------------------------------------------------

    if (io) {
      notifications.forEach(
        (notification) => {
          emitNotificationNew(
            io,
            notification,
          );
        },
      );
    }

    return notifications;
  } catch (error) {
    console.error(
      '[Notification] Failed to create notifications:',
      error.message,
    );

    return [];
  }
};