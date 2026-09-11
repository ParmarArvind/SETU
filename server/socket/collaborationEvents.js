// ============================================================
// REAL-TIME COLLABORATION EVENTS
//
// Socket.IO events related to:
//   - Comments
//   - Activity feed
//
// All events are emitted to the project's Socket.IO room.
//
// Room format:
//
// project:<projectId>
// ============================================================

import {
  getProjectRoom,
} from './socket.js';

// ============================================================
// Emit comment created
//
// Event:
//   comment:created
//
// Payload:
//
// {
//   comment
// }
//
// Every client currently viewing the same project receives
// the newly-created comment.
// ============================================================

export const emitCommentCreated = (
  io,
  comment,
) => {
  if (
    !io ||
    !comment
  ) {
    return;
  }

  // ----------------------------------------------------------
  // Get project id
  //
  // Comment may contain either:
  //
  // project: ObjectId
  //
  // or, if populated:
  //
  // project: { _id: ... }
  // ----------------------------------------------------------

  const projectId =
    comment.project?._id ||
    comment.project;

  if (!projectId) {
    console.warn(
      '[Socket] Cannot emit comment:created without project id',
    );

    return;
  }

  const room =
    getProjectRoom(
      projectId.toString(),
    );

  io.to(room).emit(
    'comment:created',
    {
      comment,
    },
  );

  console.log(
    `[Socket] comment:created emitted to ${room}`,
  );
};

// ============================================================
// Emit activity created
//
// Event:
//   activity:created
//
// Payload:
//
// {
//   activity
// }
//
// Every client currently viewing the same project receives
// the newly-created activity.
// ============================================================

export const emitActivityCreated = (
  io,
  activity,
) => {
  if (
    !io ||
    !activity
  ) {
    return;
  }

  // ----------------------------------------------------------
  // Get project id
  // ----------------------------------------------------------

  const projectId =
    activity.project?._id ||
    activity.project;

  if (!projectId) {
    console.warn(
      '[Socket] Cannot emit activity:created without project id',
    );

    return;
  }

  const room =
    getProjectRoom(
      projectId.toString(),
    );

  io.to(room).emit(
    'activity:created',
    {
      activity,
    },
  );

  console.log(
    `[Socket] activity:created emitted to ${room}`,
  );
};