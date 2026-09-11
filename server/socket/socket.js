import {
  Server as SocketIOServer,
} from 'socket.io';

import mongoose from 'mongoose';

import OrganizationMember from '../models/OrganizationMember.js';

import socketAuth from '../middleware/socketAuth.middleware.js';

import {
  userConnected,
  userDisconnected,
  emitCurrentPresence,
} from './presenceEvents.js';

// ============================================================
// Room helpers
// ============================================================

export const getUserRoom = (
  userId,
) => {
  return `user:${userId}`;
};

export const getOrganizationRoom = (
  organizationId,
) => {
  return `organization:${organizationId}`;
};

export const getProjectRoom = (
  projectId,
) => {
  return `project:${projectId}`;
};

// ============================================================
// Initialize Socket.IO
// ============================================================

const initializeSocket = (
  httpServer,
  env,
) => {
  const io =
    new SocketIOServer(
      httpServer,
      {
        cors: {
          origin:
            env.clientUrl,

          credentials: true,

          methods: [
            'GET',
            'POST',
          ],
        },
      },
    );

  // ==========================================================
  // Authentication middleware
  // ==========================================================

  io.use(socketAuth);

  // ==========================================================
  // Connection
  // ==========================================================

  io.on(
    'connection',
    async (socket) => {
      const userId =
        socket.user?.id;

      if (!userId) {
        console.warn(
          '[Socket] Connection without user ID',
        );

        socket.disconnect(
          true,
        );

        return;
      }

      console.log(
        `[Socket] User connected: ${userId}`,
      );

      // ========================================================
      // PERSONAL USER ROOM
      // ========================================================

      const userRoom =
        getUserRoom(userId);

      socket.join(
        userRoom,
      );

      console.log(
        `[Socket] Joined user room: ${userRoom}`,
      );

      // ========================================================
      // PRESENCE
      // ========================================================

      /*
       * Register this socket as an active connection.
       *
       * userConnected() only emits user:online when this is
       * the user's FIRST active socket.
       */

      userConnected(
        io,
        userId,
      );

      /*
       * Send the newly connected user the list of users who
       * are already online.
       */

      emitCurrentPresence(
        socket,
      );

      // ========================================================
      // ORGANIZATION ROOM
      // ========================================================

      try {
        const membership =
          await OrganizationMember.findOne(
            {
              user:
                userId,

              status:
                'active',
            },
          ).select(
            'organization role status',
          );

        if (
          membership?.organization
        ) {
          const organizationRoom =
            getOrganizationRoom(
              membership.organization,
            );

          socket.join(
            organizationRoom,
          );

          console.log(
            `[Socket] Joined organization room: ${organizationRoom}`,
          );
        }
      } catch (error) {
        console.error(
          '[Socket] Failed to load organization membership:',
          error.message,
        );
      }

      // ========================================================
      // CONNECTION READY
      // ========================================================

      socket.emit(
        'connection:ready',
        {
          userId,
          socketId:
            socket.id,
        },
      );

      // ========================================================
      // PROJECT JOIN
      // ========================================================

      socket.on(
        'project:join',
        (projectId) => {
          // ----------------------------------------------------
          // Validate project ID
          // ----------------------------------------------------

          if (
            !projectId ||
            !mongoose.Types.ObjectId.isValid(
              projectId,
            )
          ) {
            console.warn(
              '[Socket] Invalid project ID:',
              projectId,
            );

            return;
          }

          // ----------------------------------------------------
          // Leave previously joined project room
          // ----------------------------------------------------

          if (
            socket.currentProject
          ) {
            const previousRoom =
              getProjectRoom(
                socket.currentProject,
              );

            socket.leave(
              previousRoom,
            );

            console.log(
              `[Socket] Left project room: ${previousRoom}`,
            );
          }

          // ----------------------------------------------------
          // Join new project room
          // ----------------------------------------------------

          const projectRoom =
            getProjectRoom(
              projectId,
            );

          socket.join(
            projectRoom,
          );

          socket.currentProject =
            projectId.toString();

          console.log(
            `[Socket] User ${userId} joined project room: ${projectRoom}`,
          );

          socket.emit(
            'project:joined',
            {
              projectId:
                projectId.toString(),
            },
          );
        },
      );

      // ========================================================
      // PROJECT LEAVE
      // ========================================================

      socket.on(
        'project:leave',
        (projectId) => {
          if (
            !projectId ||
            !mongoose.Types.ObjectId.isValid(
              projectId,
            )
          ) {
            return;
          }

          const projectRoom =
            getProjectRoom(
              projectId,
            );

          socket.leave(
            projectRoom,
          );

          if (
            socket.currentProject ===
            projectId.toString()
          ) {
            socket.currentProject =
              null;
          }

          console.log(
            `[Socket] User ${userId} left project room: ${projectRoom}`,
          );

          socket.emit(
            'project:left',
            {
              projectId:
                projectId.toString(),
            },
          );
        },
      );

      // ========================================================
      // DISCONNECT
      // ========================================================

      socket.on(
        'disconnect',
        (reason) => {
          console.log(
            `[Socket] User disconnected: ${userId}`,
          );

          console.log(
            `[Socket] Disconnect reason: ${reason}`,
          );

          /*
           * userDisconnected() only emits user:offline when
           * this was the user's LAST active socket.
           */

          userDisconnected(
            io,
            userId,
          );
        },
      );
    },
  );

  return io;
};

export default initializeSocket;