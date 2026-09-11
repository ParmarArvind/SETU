import { getUserRoom } from './socket.js';

/**
 * Emit an organization request update to one user.
 *
 * Used for:
 * - invitation accepted/rejected
 * - join request accepted/rejected
 * - request expired
 *
 * @param {object} io - Socket.IO server instance
 * @param {string|object} userId - User ID whose client should receive the event
 * @param {object} payload - Request update payload
 */
export const emitOrganizationRequestUpdated = (io, userId, payload = {}) => {
  if (!io || !userId) {
    console.warn(
      '[Socket] Cannot emit organization:requestUpdated - io or userId missing',
    );
    return;
  }

  const room = getUserRoom(userId.toString());

  io.to(room).emit('organization:requestUpdated', {
    ...payload,
    userId: userId.toString(),
  });

  console.log(
    `[Socket] organization:requestUpdated emitted to ${room}`,
  );
};

/**
 * Emit an organization request update to multiple users.
 *
 * This is useful when one request affects multiple people.
 *
 * Example:
 * - User sends join request
 * - Owner/admin receives notification
 * - Requester later receives accepted/rejected update
 *
 * @param {object} io - Socket.IO server instance
 * @param {Array<string|object>} userIds - Users who should receive the event
 * @param {object} payload - Request update payload
 */
export const emitOrganizationRequestUpdatedToUsers = (
  io,
  userIds = [],
  payload = {},
) => {
  if (!io || !Array.isArray(userIds) || userIds.length === 0) {
    console.warn(
      '[Socket] Cannot emit organization:requestUpdated - io or userIds missing',
    );
    return;
  }

  const uniqueUserIds = [
    ...new Set(
      userIds
        .filter(Boolean)
        .map((userId) => userId.toString()),
    ),
  ];

  uniqueUserIds.forEach((userId) => {
    emitOrganizationRequestUpdated(io, userId, payload);
  });
};