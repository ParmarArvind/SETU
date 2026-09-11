import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createSocket,
  disconnectSocket,
  joinProject,
  leaveProject,
} from '../services/socket.service';

import { useAuth } from './AuthContext';

const SocketContext =
  createContext(null);

const TOKEN_KEY =
  'setu_token';

export const SocketProvider =
  ({
    children,
  }) => {
    const {
      isAuthenticated,
    } = useAuth();

    const [
      socket,
      setSocket,
    ] = useState(null);

    const socketRef =
      useRef(null);

    const [
      connected,
      setConnected,
    ] = useState(false);

    const [
      connectionError,
      setConnectionError,
    ] = useState('');

    const [
      onlineUsers,
      setOnlineUsers,
    ] = useState(
      new Set(),
    );

    // ========================================================
    // Socket lifecycle
    // ========================================================

    useEffect(() => {
      if (
        !isAuthenticated
      ) {
        if (
          socketRef.current
        ) {
          disconnectSocket(
            socketRef.current,
          );

          socketRef.current =
            null;
        }

        setSocket(null);
        setConnected(false);
        setConnectionError(
          '',
        );
        setOnlineUsers(
          new Set(),
        );

        return;
      }

      const token =
        localStorage.getItem(
          TOKEN_KEY,
        );

      if (!token) {
        setSocket(null);
        setConnected(false);
        setConnectionError(
          '',
        );
        setOnlineUsers(
          new Set(),
        );

        return;
      }

      const newSocket =
        createSocket(token);

      if (!newSocket) {
        return;
      }

      socketRef.current =
        newSocket;

      setSocket(
        newSocket,
      );

      // ======================================================
      // Connection
      // ======================================================

      const handleConnect =
        () => {
          console.log(
            '[Socket Client] Connected:',
            newSocket.id,
          );

          setConnected(true);
          setConnectionError(
            '',
          );
        };

      const handleReady =
        (data) => {
          console.log(
            '[Socket Client] Connection ready:',
            data,
          );
        };

      const handleError =
        (error) => {
          console.error(
            '[Socket Client] Connection error:',
            error.message,
          );

          setConnected(false);

          setConnectionError(
            error.message ||
              'Socket connection failed',
          );
        };

      const handleDisconnect =
        (reason) => {
          console.log(
            '[Socket Client] Disconnected:',
            reason,
          );

          setConnected(false);
        };

      // ======================================================
      // Presence
      // ======================================================

      const handleInitialPresence =
        (data) => {
          const users =
            Array.isArray(
              data?.onlineUsers,
            )
              ? data.onlineUsers
              : [];

          setOnlineUsers(
            new Set(
              users.map(
                (userId) =>
                  userId.toString(),
              ),
            ),
          );
        };

      const handleUserOnline =
        (data) => {
          const userId =
            data?.userId;

          if (!userId) {
            return;
          }

          const normalizedUserId =
            userId.toString();

          setOnlineUsers(
            (previous) => {
              const updated =
                new Set(
                  previous,
                );

              updated.add(
                normalizedUserId,
              );

              return updated;
            },
          );
        };

      const handleUserOffline =
        (data) => {
          const userId =
            data?.userId;

          if (!userId) {
            return;
          }

          const normalizedUserId =
            userId.toString();

          setOnlineUsers(
            (previous) => {
              const updated =
                new Set(
                  previous,
                );

              updated.delete(
                normalizedUserId,
              );

              return updated;
            },
          );
        };

      // ======================================================
      // Register lifecycle listeners
      // ======================================================

      newSocket.on(
        'connect',
        handleConnect,
      );

      newSocket.on(
        'connection:ready',
        handleReady,
      );

      newSocket.on(
        'connect_error',
        handleError,
      );

      newSocket.on(
        'disconnect',
        handleDisconnect,
      );

      newSocket.on(
        'presence:initial',
        handleInitialPresence,
      );

      newSocket.on(
        'user:online',
        handleUserOnline,
      );

      newSocket.on(
        'user:offline',
        handleUserOffline,
      );

      // ======================================================
      // Cleanup
      // ======================================================

      return () => {
        newSocket.off(
          'connect',
          handleConnect,
        );

        newSocket.off(
          'connection:ready',
          handleReady,
        );

        newSocket.off(
          'connect_error',
          handleError,
        );

        newSocket.off(
          'disconnect',
          handleDisconnect,
        );

        newSocket.off(
          'presence:initial',
          handleInitialPresence,
        );

        newSocket.off(
          'user:online',
          handleUserOnline,
        );

        newSocket.off(
          'user:offline',
          handleUserOffline,
        );

        disconnectSocket(
          newSocket,
        );

        if (
          socketRef.current ===
          newSocket
        ) {
          socketRef.current =
            null;
        }

        setSocket(null);
        setConnected(false);
        setOnlineUsers(
          new Set(),
        );
      };
    }, [
      isAuthenticated,
    ]);

    // ========================================================
    // Project rooms
    // ========================================================

    const joinProjectRoom =
      useCallback(
        (projectId) => {
          if (
            !socketRef.current
          ) {
            console.warn(
              '[Socket Client] Cannot join project: socket unavailable',
            );

            return;
          }

          joinProject(
            socketRef.current,
            projectId,
          );
        },
        [],
      );

    const leaveProjectRoom =
      useCallback(
        (projectId) => {
          if (
            !socketRef.current
          ) {
            return;
          }

          leaveProject(
            socketRef.current,
            projectId,
          );
        },
        [],
      );

    // ========================================================
    // Generic subscription
    // ========================================================

    const subscribeToEvent =
      useCallback(
        (
          eventName,
          handler,
        ) => {
          if (
            !socketRef.current ||
            typeof handler !==
              'function'
          ) {
            return () => {};
          }

          socketRef.current.on(
            eventName,
            handler,
          );

          return () =>
            socketRef.current?.off(
              eventName,
              handler,
            );
        },
        [],
      );

    // ========================================================
    // Task events
    // ========================================================

    const onTaskCreated =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:created',
            handler,
          ),
        [subscribeToEvent],
      );

    const onTaskUpdated =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:updated',
            handler,
          ),
        [subscribeToEvent],
      );

    const onTaskAssigned =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:assigned',
            handler,
          ),
        [subscribeToEvent],
      );

    const onTaskPriorityChanged =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:priorityChanged',
            handler,
          ),
        [subscribeToEvent],
      );

    const onTaskStatusChanged =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:statusChanged',
            handler,
          ),
        [subscribeToEvent],
      );

    const onTaskDeleted =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'task:deleted',
            handler,
          ),
        [subscribeToEvent],
      );

    // ========================================================
    // Collaboration
    // ========================================================

    const onCommentCreated =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'comment:created',
            handler,
          ),
        [subscribeToEvent],
      );

    const onActivityCreated =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'activity:created',
            handler,
          ),
        [subscribeToEvent],
      );
      const onOrganizationRequestUpdated = useCallback(
  (handler) =>
    subscribeToEvent(
      'organization:requestUpdated',
      handler,
    ),
  [subscribeToEvent],
);
      

    // ========================================================
    // Presence
    // ========================================================

    const onUserOnline =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'user:online',
            handler,
          ),
        [subscribeToEvent],
      );

    const onUserOffline =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'user:offline',
            handler,
          ),
        [subscribeToEvent],
      );

    const onInitialPresence =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'presence:initial',
            handler,
          ),
        [subscribeToEvent],
      );

    // ========================================================
    // Notifications
    // ========================================================

    const onNotificationNew =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'notification:new',
            handler,
          ),
        [subscribeToEvent],
      );

    const onNotificationRead =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'notification:read',
            handler,
          ),
        [subscribeToEvent],
      );

    const onNotificationsAllRead =
      useCallback(
        (handler) =>
          subscribeToEvent(
            'notification:allRead',
            handler,
          ),
        [subscribeToEvent],
      );

    // ========================================================
    // Presence helper
    // ========================================================

    const isUserOnline =
      useCallback(
        (userId) => {
          if (!userId) {
            return false;
          }

          return onlineUsers.has(
            userId.toString(),
          );
        },
        [onlineUsers],
      );

    // ========================================================
    // Context value
    // ========================================================

    const value = {
      socket,

      connected,

      connectionError,
      

      onlineUsers,

      isUserOnline,

      // Presence
      onUserOnline,
      onUserOffline,
      onInitialPresence,

      // Project
      joinProjectRoom,
      leaveProjectRoom,

      // Tasks
      onTaskCreated,
      onTaskUpdated,
      onTaskAssigned,
      onTaskPriorityChanged,
      onTaskStatusChanged,
      onTaskDeleted,

      // Collaboration
      onCommentCreated,
      onActivityCreated,

      // Notifications
      onNotificationNew,
      onNotificationRead,
      onNotificationsAllRead,
      onOrganizationRequestUpdated,
    };

    return (
      <SocketContext.Provider
        value={value}
      >
        {children}
      </SocketContext.Provider>
    );
  };

export const useSocket =
  () => {
    const context =
      useContext(
        SocketContext,
      );

    if (!context) {
      throw new Error(
        'useSocket must be used within SocketProvider',
      );
    }

    return context;
  };