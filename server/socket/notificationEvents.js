import { getUserRoom } from './socket.js';

// ============================================================
// Emit a new notification
// ============================================================

export const emitNotificationNew = (
  io,
  notification,
) => {
  if (!io || !notification) {
    return;
  }

  const recipientId =
    notification.recipient?._id ||
    notification.recipient;

  if (!recipientId) {
    console.warn(
      '[Socket] Cannot emit notification:new - recipient missing',
    );

    return;
  }

  const room =
    getUserRoom(
      recipientId.toString(),
    );

  io.to(room).emit(
    'notification:new',
    {
      notification,
    },
  );

  console.log(
    `[Socket] notification:new emitted to ${room}`,
  );
};

// ============================================================
// Emit one notification marked as read
//
// Event:
//   notification:read
//
// Sent only to the notification recipient.
// ============================================================

export const emitNotificationRead =
  (
    io,
    notification,
  ) => {
    if (
      !io ||
      !notification
    ) {
      return;
    }

    const recipientId =
      notification.recipient?._id ||
      notification.recipient;

    if (!recipientId) {
      console.warn(
        '[Socket] Cannot emit notification:read - recipient missing',
      );

      return;
    }

    const room =
      getUserRoom(
        recipientId.toString(),
      );

    io.to(room).emit(
      'notification:read',
      {
        notificationId:
          notification._id,

        readAt:
          notification.readAt,
      },
    );

    console.log(
      `[Socket] notification:read emitted to ${room}`,
    );
  };

// ============================================================
// Emit all notifications marked as read
//
// Event:
//   notification:allRead
//
// Sent only to the notification recipient.
// ============================================================

export const emitNotificationsAllRead =
  (
    io,
    userId,
    readAt,
  ) => {
    if (
      !io ||
      !userId
    ) {
      return;
    }

    const room =
      getUserRoom(
        userId.toString(),
      );

    io.to(room).emit(
      'notification:allRead',
      {
        readAt,
      },
    );

    console.log(
      `[Socket] notification:allRead emitted to ${room}`,
    );
  };