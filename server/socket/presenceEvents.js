// ============================================================
// Presence Events
// ============================================================
//
// Keeps track of how many active Socket.IO connections each
// user currently has.
//
// A user may have:
// - multiple browser tabs
// - multiple devices
// - multiple Socket.IO connections
//
// Therefore, we only consider a user OFFLINE when their last
// active socket disconnects.
// ============================================================

// userId -> number of active sockets
const userSocketCounts = new Map();

// ============================================================
// Normalize user ID
// ============================================================

const normalizeUserId = (userId) => {
  if (!userId) {
    return null;
  }

  return userId.toString();
};

// ============================================================
// Get user room
// ============================================================

const getUserRoom = (userId) => {
  return `user:${userId}`;
};

// ============================================================
// Get current connection count
// ============================================================

export const getUserConnectionCount = (
  userId,
) => {
  const normalizedUserId =
    normalizeUserId(userId);

  if (!normalizedUserId) {
    return 0;
  }

  return (
    userSocketCounts.get(
      normalizedUserId,
    ) || 0
  );
};

// ============================================================
// Is user online?
// ============================================================

export const isUserOnline = (
  userId,
) => {
  return (
    getUserConnectionCount(
      userId,
    ) > 0
  );
};

// ============================================================
// User connected
// ============================================================
//
// Returns true only when this is the user's FIRST active
// connection.
//
// Example:
//
// First tab:
// count 0 -> 1
// return true
//
// Second tab:
// count 1 -> 2
// return false
//
// This prevents broadcasting user:online multiple times.
// ============================================================

export const userConnected = (
  io,
  userId,
) => {
  const normalizedUserId =
    normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  const currentCount =
    getUserConnectionCount(
      normalizedUserId,
    );

  const newCount =
    currentCount + 1;

  userSocketCounts.set(
    normalizedUserId,
    newCount,
  );

  // ----------------------------------------------------------
  // User was already online.
  // ----------------------------------------------------------

  if (currentCount > 0) {
    return false;
  }

  // ----------------------------------------------------------
  // First connection -> user becomes online.
  // ----------------------------------------------------------

  if (io) {
    io.emit('user:online', {
      userId:
        normalizedUserId,
    });
  }

  console.log(
    `[Presence] User ${normalizedUserId} is ONLINE`,
  );

  return true;
};

// ============================================================
// User disconnected
// ============================================================
//
// Returns true only when this was the user's LAST active
// connection.
//
// Example:
//
// Two tabs:
// count 2 -> 1
// user remains online
//
// Last tab:
// count 1 -> 0
// user becomes offline
// ============================================================

export const userDisconnected = (
  io,
  userId,
) => {
  const normalizedUserId =
    normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  const currentCount =
    getUserConnectionCount(
      normalizedUserId,
    );

  // ----------------------------------------------------------
  // Defensive handling.
  //
  // If the server somehow receives a disconnect for a user
  // that isn't tracked, don't create a negative count.
  // ----------------------------------------------------------

  if (currentCount <= 0) {
    userSocketCounts.delete(
      normalizedUserId,
    );

    return false;
  }

  const newCount =
    currentCount - 1;

  // ----------------------------------------------------------
  // User still has another active socket.
  // ----------------------------------------------------------

  if (newCount > 0) {
    userSocketCounts.set(
      normalizedUserId,
      newCount,
    );

    return false;
  }

  // ----------------------------------------------------------
  // Last connection disconnected.
  // ----------------------------------------------------------

  userSocketCounts.delete(
    normalizedUserId,
  );

  if (io) {
    io.emit('user:offline', {
      userId:
        normalizedUserId,
    });
  }

  console.log(
    `[Presence] User ${normalizedUserId} is OFFLINE`,
  );

  return true;
};

// ============================================================
// Emit current presence to a newly connected socket
// ============================================================
//
// This is useful because a newly connected user needs to know
// which users are already online.
//
// We don't need to broadcast anything here.
// We only send the information to the newly connected socket.
// ============================================================

export const emitCurrentPresence = (
  socket,
) => {
  if (!socket) {
    return;
  }

  const onlineUsers = [];

  for (const [
    userId,
    count,
  ] of userSocketCounts.entries()) {
    if (count > 0) {
      onlineUsers.push(userId);
    }
  }

  socket.emit(
    'presence:initial',
    {
      onlineUsers,
    },
  );
};

// ============================================================
// Get all online users
// ============================================================

export const getOnlineUserIds = () => {
  return Array.from(
    userSocketCounts.entries(),
  )
    .filter(
      ([, count]) =>
        count > 0,
    )
    .map(
      ([userId]) =>
        userId,
    );
};

// ============================================================
// Get all tracked users
// ============================================================
//
// Mainly useful for debugging/testing.
// ============================================================

export const getPresenceStats = () => {
  let totalConnections = 0;

  for (const count of userSocketCounts.values()) {
    totalConnections += count;
  }

  return {
    onlineUsers:
      userSocketCounts.size,

    totalConnections,
  };
};

// ============================================================
// Export room helper
// ============================================================

export {
  getUserRoom,
};