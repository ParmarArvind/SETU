// ============================================================
// TASK SOCKET EVENTS
// ============================================================
//
// Centralized Socket.IO event emitters for task operations.
//
// Phase 7.2
//
// Events:
//
// task:created
// task:updated
// task:assigned
// task:priorityChanged
// task:statusChanged
// task:deleted
//
// ============================================================

const getProjectRoom = (
  projectId,
) => {
  return `project:${projectId}`;
};

// ------------------------------------------------------------
// Emit task created
// ------------------------------------------------------------

export const emitTaskCreated = (
  io,
  task,
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:created',
    {
      task,
    },
  );
};

// ------------------------------------------------------------
// Emit task updated
// ------------------------------------------------------------

export const emitTaskUpdated = (
  io,
  task,
  metadata = {},
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:updated',
    {
      task,
      metadata,
    },
  );
};

// ------------------------------------------------------------
// Emit task assigned
// ------------------------------------------------------------

export const emitTaskAssigned = (
  io,
  task,
  previousAssignee = null,
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:assigned',
    {
      task,

      previousAssignee,

      assignee:
        task.assignee || null,
    },
  );
};

// ------------------------------------------------------------
// Emit priority changed
// ------------------------------------------------------------

export const emitTaskPriorityChanged = (
  io,
  task,
  previousPriority,
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:priorityChanged',
    {
      task,

      previousPriority,

      priority:
        task.priority,
    },
  );
};

// ------------------------------------------------------------
// Emit status changed
// ------------------------------------------------------------

export const emitTaskStatusChanged = (
  io,
  task,
  previousStatus,
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:statusChanged',
    {
      task,

      previousStatus,

      status:
        task.status,
    },
  );
};

// ------------------------------------------------------------
// Emit task deleted
// ------------------------------------------------------------

export const emitTaskDeleted = (
  io,
  task,
) => {
  if (!io || !task) {
    return;
  }

  io.to(
    getProjectRoom(
      task.project,
    ),
  ).emit(
    'task:deleted',
    {
      taskId:
        task._id,

      projectId:
        task.project,
    },
  );
};