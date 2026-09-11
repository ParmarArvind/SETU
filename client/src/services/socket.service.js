import {
  io,
} from 'socket.io-client';

// ============================================================
// Socket URL
//
// Example:
//
// VITE_API_BASE_URL=http://localhost:5000/api
//
// becomes:
//
// http://localhost:5000
//
// You can also explicitly define:
//
// VITE_SOCKET_URL=http://localhost:5000
// ============================================================

const getSocketUrl = () => {
  const explicitUrl =
    import.meta.env
      .VITE_SOCKET_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const apiUrl =
    import.meta.env
      .VITE_API_BASE_URL;

  if (!apiUrl) {
    return 'http://localhost:5000';
  }

  return apiUrl.replace(
    /\/api\/?$/,
    '',
  );
};

// ============================================================
// Create authenticated Socket.IO connection
//
// The JWT is sent during the Socket.IO handshake.
//
// Server:
//
// socket.handshake.auth.token
// ============================================================

export const createSocket = (
  token,
) => {
  if (!token) {
    console.warn(
      '[Socket] Cannot create socket without token',
    );

    return null;
  }

  const socket =
    io(
      getSocketUrl(),
      {
        // ----------------------------------------------------
        // Authentication
        // ----------------------------------------------------

        auth: {
          token,
        },

        // ----------------------------------------------------
        // Transport
        //
        // Prefer WebSocket.
        // Socket.IO can fall back to polling if necessary.
        // ----------------------------------------------------

        transports: [
          'websocket',
          'polling',
        ],

        // ----------------------------------------------------
        // Connection
        // ----------------------------------------------------

        autoConnect: true,

        // ----------------------------------------------------
        // Reconnection
        // ----------------------------------------------------

        reconnection: true,

        reconnectionAttempts: 10,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,
      },
    );

  // ==========================================================
  // Debug connection events
  // ==========================================================

  socket.on(
    'connect',
    () => {
      console.log(
        `[Socket] Connected: ${socket.id}`,
      );
    },
  );

  socket.on(
    'connect_error',
    (error) => {
      console.error(
        '[Socket] Connection error:',
        error.message,
      );
    },
  );

  socket.on(
    'disconnect',
    (reason) => {
      console.log(
        `[Socket] Disconnected: ${reason}`,
      );
    },
  );

  socket.on(
    'connection:ready',
    (data) => {
      console.log(
        '[Socket] Connection ready:',
        data,
      );
    },
  );

  return socket;
};

// ============================================================
// Join project room
//
// Used when the user opens a project.
//
// Example:
//
// joinProject(socket, projectId);
// ============================================================

export const joinProject = (
  socket,
  projectId,
) => {
  if (
    !socket ||
    !projectId
  ) {
    return;
  }

  if (
    !socket.connected
  ) {
    console.warn(
      '[Socket] Cannot join project before socket is connected',
    );

    return;
  }

  socket.emit(
    'project:join',
    projectId,
  );
};

// ============================================================
// Leave project room
//
// Used when the user leaves a project page.
// ============================================================

export const leaveProject = (
  socket,
  projectId,
) => {
  if (
    !socket ||
    !projectId
  ) {
    return;
  }

  if (
    !socket.connected
  ) {
    return;
  }

  socket.emit(
    'project:leave',
    projectId,
  );
};

// ============================================================
// Disconnect socket
// ============================================================

export const disconnectSocket = (
  socket,
) => {
  if (!socket) {
    return;
  }

  // ----------------------------------------------------------
  // Remove all listeners registered by this service.
  //
  // Component-specific listeners should be removed by the
  // component/context that registered them.
  // ----------------------------------------------------------

  if (
    socket.connected ||
    socket.active
  ) {
    socket.disconnect();
  }
};

// ============================================================
// Get current Socket.IO URL
//
// Exported mainly for debugging/configuration.
// ============================================================

export const getSocketUrlForDebug =
  () => {
    return getSocketUrl();
  };