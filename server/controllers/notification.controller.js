import Notification from '../models/Notification.js';

import {
  emitNotificationRead,
  emitNotificationsAllRead,
} from '../socket/notificationEvents.js';

// ============================================================
// GET /api/notifications
//
// Get current user's notifications.
// ============================================================

export const listNotifications =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10,
        ) || 50;

      const limit =
        Math.min(
          Math.max(
            requestedLimit,
            1,
          ),
          100,
        );

      const notifications =
        await Notification.find({
          recipient:
            req.user.id,
        })
          .sort({
            createdAt:
              -1,
          })
          .limit(limit)
          .populate(
            'organization',
            'name',
          )
          .populate(
            'request',
          );

      const unreadCount =
        await Notification.countDocuments(
          {
            recipient:
              req.user.id,

            readAt:
              null,
          },
        );

      return res.json({
        success: true,

        data: {
          notifications,

          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// PATCH /api/notifications/:id/read
//
// Mark one notification as read.
//
// REST:
//   PATCH /notifications/:id/read
//
// Socket:
//   notification:read
// ============================================================

export const markRead =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const readAt =
        new Date();

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id:
              req.params.id,

            recipient:
              req.user.id,

            readAt:
              null,
          },
          {
            readAt,
          },
          {
            returnDocument:
              'after',
          },
        );

      if (!notification) {
        // ------------------------------------------------------
        // It may already be read.
        //
        // Check whether the notification exists for this user
        // so we can return the correct response.
        // ------------------------------------------------------

        const existingNotification =
          await Notification.findOne(
            {
              _id:
                req.params.id,

              recipient:
                req.user.id,
            },
          );

        if (
          !existingNotification
        ) {
          return res.status(404).json({
            success: false,
            message:
              'Notification not found',
          });
        }

        return res.json({
          success: true,

          data: {
            notification:
              existingNotification,
          },

          message:
            'Notification was already marked as read',
        });
      }

      // --------------------------------------------------------
      // Emit real-time read event
      // --------------------------------------------------------

      const io =
        req.app.get('io');

      emitNotificationRead(
        io,
        notification,
      );

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      return res.json({
        success: true,

        data: {
          notification,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// PATCH /api/notifications/read-all
//
// Mark all current user's notifications as read.
//
// REST:
//   PATCH /notifications/read-all
//
// Socket:
//   notification:allRead
// ============================================================

export const markAllRead =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const readAt =
        new Date();

      await Notification.updateMany(
        {
          recipient:
            req.user.id,

          readAt:
            null,
        },
        {
          readAt,
        },
      );

      // --------------------------------------------------------
      // Emit real-time event
      // --------------------------------------------------------

      const io =
        req.app.get('io');

      emitNotificationsAllRead(
        io,
        req.user.id,
        readAt,
      );

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      return res.json({
        success: true,

        data: {
          readAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };