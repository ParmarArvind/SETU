import mongoose from 'mongoose';

import Activity from '../models/Activity.js';

import Task, {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../models/Task.js';

import ProjectMember from '../models/ProjectMember.js';

import OrganizationMember from '../models/OrganizationMember.js';

import {
  createNotification,
} from '../utils/notification.js';

import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskAssigned,
  emitTaskPriorityChanged,
  emitTaskStatusChanged,
} from '../socket/taskEvents.js';

// ============================================================
// Helper
// ============================================================

const verifyActiveAssignee = async ({
  organizationId,
  projectId,
  userId,
}) => {
  // ----------------------------------------------------------
  // Organization membership must be ACTIVE.
  // ----------------------------------------------------------

  const organizationMembership =
    await OrganizationMember.findOne({
      organization:
        organizationId,

      user:
        userId,

      status:
        'active',
    });

  if (!organizationMembership) {
    return {
      valid: false,
      message:
        'Assignee must be an active member of this organization',
    };
  }

  // ----------------------------------------------------------
  // Project membership must also exist.
  // ----------------------------------------------------------

  const projectMembership =
    await ProjectMember.findOne({
      organization:
        organizationId,

      project:
        projectId,

      user:
        userId,
    });

  if (!projectMembership) {
    return {
      valid: false,
      message:
        'Assignee must be a member of this project',
    };
  }

  return {
    valid: true,
  };
};

// ============================================================
// POST /api/projects/:projectId/tasks
// ============================================================

const createTask = async (
  req,
  res,
  next,
) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      assignee,
      dueDate,
      labels,
    } = req.body;

    // ----------------------------------------------------------
    // 1. Validate title
    // ----------------------------------------------------------

    if (
      !title ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Task title is required',
      });
    }

    // ----------------------------------------------------------
    // 2. Validate priority
    // ----------------------------------------------------------

    if (
      priority !== undefined &&
      !TASK_PRIORITIES.includes(
        priority,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Priority must be one of: ' +
          TASK_PRIORITIES.join(', '),
      });
    }

    // ----------------------------------------------------------
    // 3. Validate status
    // ----------------------------------------------------------

    if (
      status !== undefined &&
      !TASK_STATUSES.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be one of: ' +
          TASK_STATUSES.join(', '),
      });
    }

    // ----------------------------------------------------------
    // 4. Validate assignee
    // ----------------------------------------------------------

    if (
      assignee !== undefined &&
      assignee !== null
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          assignee,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid assignee id',
        });
      }

      const assigneeValidation =
        await verifyActiveAssignee({
          organizationId:
            req.organization._id,

          projectId:
            req.project._id,

          userId:
            assignee,
        });

      if (
        !assigneeValidation.valid
      ) {
        return res.status(400).json({
          success: false,
          message:
            assigneeValidation.message,
        });
      }
    }

    // ----------------------------------------------------------
    // 5. Create task
    // ----------------------------------------------------------

    const task =
      await Task.create({
        title:
          title.trim(),

        description:
          description
            ? description.trim()
            : '',

        project:
          req.project._id,

        organization:
          req.organization._id,

        assignee:
          assignee || null,

        priority:
          priority || undefined,

        status:
          status || undefined,

        labels:
          Array.isArray(labels)
            ? labels
                .map(
                  (label) =>
                    label.trim(),
                )
                .filter(Boolean)
            : [],

        dueDate:
          dueDate || undefined,

        createdBy:
          req.user.id,
      });

    // ----------------------------------------------------------
    // 6. Socket event
    // ----------------------------------------------------------

    const io =
      req.app.get('io');

    emitTaskCreated(
      io,
      task,
    );

    // ----------------------------------------------------------
    // 7. Assignment notification
    // ----------------------------------------------------------

    if (
      assignee &&
      String(assignee) !==
        String(req.user.id)
    ) {
      await createNotification({
        recipient:
          assignee,

        type:
          'task_assigned',

        title:
          'Task Assigned',

        message:
          `You have been assigned the task "${task.title}".`,

        organization:
          req.organization._id,

        data: {
          taskId:
            task._id,

          taskTitle:
            task.title,

          projectId:
            req.project._id,
        },

        io,
      });
    }

    // ----------------------------------------------------------
    // 8. Response
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,

      data: {
        task,
      },
    });
  } catch (error) {
    if (
      error.name ===
      'ValidationError'
    ) {
      const message =
        Object.values(error.errors)
          .map(
            (e) => e.message,
          )
          .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next(error);
  }
};

// ============================================================
// GET /api/projects/:projectId/tasks
// ============================================================

const listTasks = async (
  req,
  res,
  next,
) => {
  try {
    const {
      search,
      status,
      priority,
      assignee,
      label,
    } = req.query;

    const query = {
      project:
        req.project._id,
    };

    // ----------------------------------------------------------
    // Search
    // ----------------------------------------------------------

    if (
      search !== undefined &&
      search.trim()
    ) {
      const escaped =
        search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          );

      const pattern =
        new RegExp(
          escaped,
          'i',
        );

      query.$or = [
        {
          title:
            pattern,
        },
        {
          description:
            pattern,
        },
      ];
    }

    // ----------------------------------------------------------
    // Status
    // ----------------------------------------------------------

    if (
      status !== undefined
    ) {
      if (
        !TASK_STATUSES.includes(
          status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Status filter must be one of: ' +
            TASK_STATUSES.join(', '),
        });
      }

      query.status =
        status;
    }

    // ----------------------------------------------------------
    // Priority
    // ----------------------------------------------------------

    if (
      priority !== undefined
    ) {
      if (
        !TASK_PRIORITIES.includes(
          priority,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Priority filter must be one of: ' +
            TASK_PRIORITIES.join(', '),
        });
      }

      query.priority =
        priority;
    }

    // ----------------------------------------------------------
    // Assignee
    // ----------------------------------------------------------

    if (
      assignee !== undefined
    ) {
      if (
        assignee ===
        'unassigned'
      ) {
        query.assignee =
          null;
      } else if (
        !mongoose.Types.ObjectId.isValid(
          assignee,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Assignee filter must be a valid user id or 'unassigned'",
        });
      } else {
        query.assignee =
          assignee;
      }
    }

    // ----------------------------------------------------------
    // Label
    // ----------------------------------------------------------

    if (
      label !== undefined &&
      label.trim()
    ) {
      query.labels =
        label.trim();
    }

    // ----------------------------------------------------------
    // Pagination
    // ----------------------------------------------------------

    const page =
      Number.parseInt(
        req.query.page,
        10,
      ) || 1;

    const requestedLimit =
      Number.parseInt(
        req.query.limit,
        10,
      ) || 20;

    if (
      page < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          'page must be 1 or greater',
      });
    }

    if (
      requestedLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          'limit must be 1 or greater',
      });
    }

    const limit =
      Math.min(
        requestedLimit,
        100,
      );

    const skip =
      (page - 1) *
      limit;

    const [
      tasks,
      total,
    ] =
      await Promise.all([
        Task.find(query)
          .populate(
            'assignee',
            'name email avatar',
          )
          .sort({
            createdAt:
              -1,
          })
          .skip(skip)
          .limit(limit),

        Task.countDocuments(
          query,
        ),
      ]);

    return res.status(200).json({
      success: true,

      data: {
        tasks,

        pagination: {
          page,
          limit,
          total,

          totalPages:
            Math.ceil(
              total / limit,
            ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/tasks/:taskId
// ============================================================

const getTask = async (
  req,
  res,
  next,
) => {
  try {
    await req.task.populate(
      'assignee',
      'name email avatar',
    );

    return res.status(200).json({
      success: true,

      data: {
        task:
          req.task,

        membership:
          req.membership,

        projectMembership:
          req.projectMembership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PATCH /api/tasks/:taskId
// ============================================================

const updateTask = async (
  req,
  res,
  next,
) => {
  try {
    const {
      title,
      description,
      labels,
      dueDate,
    } = req.body;

    const updates = {};

    if (
      title !== undefined
    ) {
      if (
        !title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Task title cannot be empty',
        });
      }

      updates.title =
        title.trim();
    }

    if (
      description !==
      undefined
    ) {
      updates.description =
        description.trim();
    }

    if (
      labels !== undefined
    ) {
      if (
        !Array.isArray(
          labels,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Labels must be an array of strings',
        });
      }

      updates.labels =
        labels
          .map(
            (label) =>
              label.trim(),
          )
          .filter(Boolean);
    }

    if (
      dueDate !== undefined
    ) {
      updates.dueDate =
        dueDate || null;
    }

    if (
      Object.keys(
        updates,
      ).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No valid fields provided to update',
      });
    }

    const updatedTask =
      await Task.findByIdAndUpdate(
        req.task._id,
        updates,
        {
          returnDocument:
            'after',

          runValidators:
            true,
        },
      ).populate(
        'assignee',
        'name email avatar',
      );

    const io =
      req.app.get('io');

    emitTaskUpdated(
      io,
      updatedTask,
    );

    return res.status(200).json({
      success: true,

      data: {
        task:
          updatedTask,
      },
    });
  } catch (error) {
    if (
      error.name ===
      'ValidationError'
    ) {
      const message =
        Object.values(error.errors)
          .map(
            (e) => e.message,
          )
          .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next(error);
  }
};

// ============================================================
// PATCH /api/tasks/:taskId/assign
// ============================================================

const assignTask = async (
  req,
  res,
  next,
) => {
  try {
    const {
      assignee,
    } = req.body;

    // ----------------------------------------------------------
    // 1. Validate request
    // ----------------------------------------------------------

    if (
      assignee ===
      undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'assignee is required (pass null to unassign)',
      });
    }

    // ----------------------------------------------------------
    // 2. Previous assignee
    // ----------------------------------------------------------

    const previousAssignee =
      req.task.assignee ||
      null;

    // ----------------------------------------------------------
    // 3. Validate NEW assignee
    // ----------------------------------------------------------

    if (
      assignee !==
      null
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          assignee,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid assignee id',
        });
      }

      const assigneeValidation =
        await verifyActiveAssignee({
          organizationId:
            req.organization._id,

          projectId:
            req.project._id,

          userId:
            assignee,
        });

      if (
        !assigneeValidation.valid
      ) {
        return res.status(400).json({
          success: false,
          message:
            assigneeValidation.message,
        });
      }
    }

    // ----------------------------------------------------------
    // 4. Prevent no-op
    // ----------------------------------------------------------

    const previousAssigneeId =
      previousAssignee
        ? String(
            previousAssignee,
          )
        : null;

    const nextAssigneeId =
      assignee
        ? String(
            assignee,
          )
        : null;

    if (
      previousAssigneeId ===
      nextAssigneeId
    ) {
      const existingTask =
        await Task.findById(
          req.task._id,
        ).populate(
          'assignee',
          'name email avatar',
        );

      return res.status(200).json({
        success: true,

        data: {
          task:
            existingTask,
        },

        message:
          assignee
            ? 'Task is already assigned to this member'
            : 'Task is already unassigned',
      });
    }

    // ----------------------------------------------------------
    // 5. Update task
    // ----------------------------------------------------------

    const updatedTask =
      await Task.findByIdAndUpdate(
        req.task._id,
        {
          assignee:
            assignee || null,
        },
        {
          returnDocument:
            'after',

          runValidators:
            true,
        },
      ).populate(
        'assignee',
        'name email avatar',
      );

    if (
      !updatedTask
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Task not found',
      });
    }

    // ----------------------------------------------------------
    // 6. Activity
    // ----------------------------------------------------------

    try {
      await Activity.create({
        actor:
          req.user.id,

        organization:
          req.organization._id,

        project:
          req.project._id,

        action:
          assignee
            ? 'task.assigned'
            : 'task.unassigned',

        entityType:
          'task',

        entityId:
          updatedTask._id,

        metadata: {
          taskTitle:
            updatedTask.title,

          previousAssignee:
            previousAssignee,

          assignee:
            assignee,
        },
      });

      console.log(
        `[Activity] Task ${updatedTask._id} ${
          assignee
            ? 'assigned'
            : 'unassigned'
        } successfully`,
      );
    } catch (
      activityError
    ) {
      console.error(
        '[Activity] Failed to create task assignment activity:',
        activityError,
      );
    }

    // ----------------------------------------------------------
    // 7. Socket event
    // ----------------------------------------------------------

    const io =
      req.app.get('io');

    emitTaskAssigned(
      io,
      updatedTask,
      previousAssignee,
    );

    // ----------------------------------------------------------
    // 8. Assignment notification
    // ----------------------------------------------------------

    if (
      assignee &&
      String(assignee) !==
        String(req.user.id)
    ) {
      await createNotification({
        recipient:
          assignee,

        type:
          'task_assigned',

        title:
          'Task Assigned',

        message:
          `You have been assigned the task "${updatedTask.title}".`,

        organization:
          req.organization._id,

        data: {
          taskId:
            updatedTask._id,

          taskTitle:
            updatedTask.title,

          projectId:
            req.project._id,
        },

        io,
      });
    }

    // ----------------------------------------------------------
    // 9. Response
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        task:
          updatedTask,
      },

      message:
        assignee
          ? 'Task assigned successfully'
          : 'Task unassigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PATCH /api/tasks/:taskId/priority
// ============================================================

const updateTaskPriority = async (
  req,
  res,
  next,
) => {
  try {
    const {
      priority,
    } = req.body;

    if (
      !priority ||
      !TASK_PRIORITIES.includes(
        priority,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Priority must be one of: ' +
          TASK_PRIORITIES.join(', '),
      });
    }

    const previousPriority =
      req.task.priority;

    const updatedTask =
      await Task.findByIdAndUpdate(
        req.task._id,
        {
          priority,
        },
        {
          returnDocument:
            'after',

          runValidators:
            true,
        },
      ).populate(
        'assignee',
        'name email avatar',
      );

    if (
      !updatedTask
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Task not found',
      });
    }

    const io =
      req.app.get('io');

    emitTaskPriorityChanged(
      io,
      updatedTask,
      previousPriority,
    );

    return res.status(200).json({
      success: true,

      data: {
        task:
          updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Allowed Kanban transitions
// ============================================================

const ALLOWED_STATUS_TRANSITIONS = {
  todo: [
    'in_progress',
  ],

  in_progress: [
    'todo',
    'in_review',
  ],

  in_review: [
    'in_progress',
    'done',
  ],

  done: [
    'in_progress',
  ],
};

// ============================================================
// PATCH /api/tasks/:taskId/status
// ============================================================

const updateTaskStatus = async (
  req,
  res,
  next,
) => {
  try {
    const {
      status,
    } = req.body;

    if (
      !status ||
      !TASK_STATUSES.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be one of: ' +
          TASK_STATUSES.join(', '),
      });
    }

    const currentStatus =
      req.task.status;

    if (
      currentStatus ===
      status
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Task is already in ${status} status`,
      });
    }

    const allowedTransitions =
      ALLOWED_STATUS_TRANSITIONS[
        currentStatus
      ] || [];

    if (
      !allowedTransitions.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot move task from ${currentStatus} to ${status}`,
      });
    }

    const updatedTask =
      await Task.findByIdAndUpdate(
        req.task._id,
        {
          status,
        },
        {
          returnDocument:
            'after',

          runValidators:
            true,
        },
      ).populate(
        'assignee',
        'name email avatar',
      );

    if (
      !updatedTask
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Task not found',
      });
    }

    const io =
      req.app.get('io');

    emitTaskStatusChanged(
      io,
      updatedTask,
      currentStatus,
    );

    return res.status(200).json({
      success: true,

      data: {
        task:
          updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/projects/:projectId/kanban
// ============================================================

const STATUS_LABELS = {
  todo:
    'To Do',

  in_progress:
    'In Progress',

  in_review:
    'In Review',

  done:
    'Done',
};

const getKanbanBoard = async (
  req,
  res,
  next,
) => {
  try {
    const tasks =
      await Task.find({
        project:
          req.project._id,
      })
        .populate(
          'assignee',
          'name email avatar',
        )
        .sort({
          createdAt:
            -1,
        });

    const columns =
      TASK_STATUSES.map(
        (status) => ({
          status,

          label:
            STATUS_LABELS[
              status
            ],

          tasks:
            tasks.filter(
              (task) =>
                task.status ===
                status,
            ),
        }),
      );

    return res.status(200).json({
      success: true,

      data: {
        columns,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Named exports
// ============================================================

export {
  createTask,
  listTasks,
  getTask,
  updateTask,
  assignTask,
  updateTaskPriority,
  updateTaskStatus,
  getKanbanBoard,
};