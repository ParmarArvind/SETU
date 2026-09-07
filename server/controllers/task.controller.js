import mongoose from 'mongoose';

import Task, { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';
import ProjectMember from '../models/ProjectMember.js';

// --------------------------------------------------------------
// POST /api/projects/:projectId/tasks
//
// Nested under a project — sits behind loadProject +
// requirePermission('tasks:create'), so req.project and
// req.organization are already verified by the time this runs.
//
// Fields accepted at creation: title (required), description,
// priority, status, assignee, dueDate, labels. Comments and
// attachments are Phase 6 (Collaboration) — not handled here.
// --------------------------------------------------------------
const createTask = async (req, res, next) => {
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

    // 1. Validate required field
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    // 2. Validate priority/status against the shared enums, if provided.
    //    Letting the Mongoose enum validator catch these would work
    //    too, but checking here gives a clearer 400 before any
    //    assignee lookup runs.
    if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be one of: ' + TASK_PRIORITIES.join(', '),
      });
    }

    if (status !== undefined && !TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: ' + TASK_STATUSES.join(', '),
      });
    }

    // 3. If an assignee is given, they must already be a member of
    //    THIS project — same constraint as Phase 4's project-member
    //    rule (you can't assign work to someone who can't see the
    //    project the work lives in).
    if (assignee !== undefined && assignee !== null) {
      if (!mongoose.Types.ObjectId.isValid(assignee)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignee id',
        });
      }

      const assigneeMembership = await ProjectMember.findOne({
        project: req.project._id,
        user: assignee,
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a member of this project',
        });
      }
    }

    // 4. Create the task. organization is denormalized from
    //    req.organization (verified by loadProject), never from
    //    client input — same pattern as ProjectMember creation.
    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      project: req.project._id,
      organization: req.organization._id,
      assignee: assignee || null,
      priority: priority || undefined,
      status: status || undefined,
      labels: Array.isArray(labels) ? labels.map((label) => label.trim()).filter(Boolean) : [],
      dueDate: dueDate || undefined,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId/tasks
//
// Nested under a project — sits behind loadProject only. No extra
// visibility filtering needed here beyond what loadProject already
// did: every task in a project the caller can see is itself
// visible to them. The Kanban board (Milestone 6) shows the whole
// team's work, not just "my tasks" — role differentiates what a
// user can EDIT, not what they can VIEW.
//
// Query params (all optional):
//   search    -> case-insensitive match against title OR description
//   status    -> one of TASK_STATUSES
//   priority  -> one of TASK_PRIORITIES
//   assignee  -> a user id, or the literal string 'unassigned'
//   label     -> a single label string (tasks whose labels array
//                contains it)
//   page      -> 1-indexed, default 1
//   limit     -> default 20, capped at 100 (a client can't request
//                an unbounded page and force a full collection scan)
//
// Every filter is validated explicitly and rejected with 400 on a
// bad value, same reasoning as Milestone 5's listProjects status
// filter: a typo'd query param should never silently return the
// wrong (or an empty) list.
// --------------------------------------------------------------
const listTasks = async (req, res, next) => {
  try {
    const { search, status, priority, assignee, label } = req.query;

    const query = { project: req.project._id };

    if (search !== undefined && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      query.$or = [{ title: pattern }, { description: pattern }];
    }

    if (status !== undefined) {
      if (!TASK_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status filter must be one of: ' + TASK_STATUSES.join(', '),
        });
      }
      query.status = status;
    }

    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Priority filter must be one of: ' + TASK_PRIORITIES.join(', '),
        });
      }
      query.priority = priority;
    }

    if (assignee !== undefined) {
      if (assignee === 'unassigned') {
        query.assignee = null;
      } else if (!mongoose.Types.ObjectId.isValid(assignee)) {
        return res.status(400).json({
          success: false,
          message: "Assignee filter must be a valid user id or 'unassigned'",
        });
      } else {
        query.assignee = assignee;
      }
    }

    if (label !== undefined && label.trim()) {
      // Mongo matches an array field against a scalar automatically —
      // this finds tasks whose `labels` array contains this value.
      query.labels = label.trim();
    }

    // --- Pagination ---
    const page = Number.parseInt(req.query.page, 10) || 1;
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'page must be 1 or greater',
      });
    }

    if (requestedLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'limit must be 1 or greater',
      });
    }

    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignee', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/tasks/:taskId
//
// Sits behind loadTask, which has already confirmed the caller
// can see this specific task (tenancy + project visibility rule).
// --------------------------------------------------------------
const getTask = async (req, res, next) => {
  try {
    await req.task.populate('assignee', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: {
        task: req.task,
        membership: req.membership,
        projectMembership: req.projectMembership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/tasks/:taskId
//
// Sits behind loadTask + requirePermission('tasks:update').
//
// Only title, description, labels, and dueDate are editable here.
// Deliberately NOT editable through this endpoint: assignee
// (Milestone 5's tasks:assign — a distinct action with its own
// project-membership check), priority (Milestone 5's
// tasks:manage_priority), and status (Milestone 6's tasks:update
// or tasks:update_own_status — the Kanban drag-and-drop action,
// which has a different, broader set of people allowed to trigger
// it than a general edit does). Same reasoning as Phase 4's
// archive/unarchive staying out of the generic project update.
// --------------------------------------------------------------
const updateTask = async (req, res, next) => {
  try {
    const { title, description, labels, dueDate } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot be empty',
        });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    if (labels !== undefined) {
      if (!Array.isArray(labels)) {
        return res.status(400).json({
          success: false,
          message: 'Labels must be an array of strings',
        });
      }
      updates.labels = labels.map((label) => label.trim()).filter(Boolean);
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.task._id, updates, {
      new: true,
      runValidators: true,
    }).populate('assignee', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/tasks/:taskId/assign
//
// Sits behind loadTask + requirePermission('tasks:assign').
//
// Kept separate from the generic PATCH /:taskId (Milestone 4) for
// the same reason Phase 4 gave archive its own endpoint: this is a
// distinct workflow action with its own validation rule (the new
// assignee must be a ProjectMember of the task's project — same
// constraint enforced at creation time in Milestone 3), not a
// field edit that happens to share a document with the title.
//
// Body: { assignee }. Pass an explicit null to unassign; the field
// is required (even if null) so an accidental omission doesn't
// silently no-op — the caller must say what they mean.
// --------------------------------------------------------------
const assignTask = async (req, res, next) => {
  try {
    const { assignee } = req.body;

    if (assignee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'assignee is required (pass null to unassign)',
      });
    }

    if (assignee !== null) {
      if (!mongoose.Types.ObjectId.isValid(assignee)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignee id',
        });
      }

      const assigneeMembership = await ProjectMember.findOne({
        project: req.project._id,
        user: assignee,
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a member of this project',
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.task._id,
      { assignee },
      { new: true, runValidators: true },
    ).populate('assignee', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/tasks/:taskId/priority
//
// Sits behind loadTask + requirePermission('tasks:manage_priority').
// Its own endpoint for the same reason assignment is: a distinct
// permission (tasks:manage_priority isn't granted to every role
// that has tasks:update — see config/permissions.js) governs it.
// --------------------------------------------------------------
const updateTaskPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;

    if (!priority || !TASK_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be one of: ' + TASK_PRIORITIES.join(', '),
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.task._id,
      { priority },
      { new: true, runValidators: true },
    ).populate('assignee', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/tasks/:taskId/status
//
// The endpoint the Kanban board's drag-and-drop calls (FR-16,
// FR-20). Sits behind loadTask + requireStatusUpdatePermission
// (task.middleware.js) — the OR-of-two-rules gate that decides
// whether the caller can move THIS task, since Owner/Admin/Manager
// can move any task while a Developer can only move their own
// assigned one. That decision is fully owned by the middleware;
// by the time this controller runs, it's already authorized.
//
// No restriction on which status can follow which — SRS FR-20 asks
// for free movement between the four columns, not a workflow graph
// (e.g. nothing stops moving directly from To Do to Done).
// --------------------------------------------------------------
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: ' + TASK_STATUSES.join(', '),
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.task._id,
      { status },
      { new: true, runValidators: true },
    ).populate('assignee', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId/kanban
//
// Sits behind loadProject only — same reasoning as listTasks
// (Milestone 4): board visibility is project visibility, nothing
// stricter. This groups the SAME data listTasks returns into the
// four-column shape FR-19 describes, so the frontend board
// (Milestone 8) can render columns directly from the response
// instead of grouping client-side.
//
// Column order follows TASK_STATUSES (Milestone 1) — that's the
// whole reason that array is ordered rather than just a Set of
// valid values.
// --------------------------------------------------------------
const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const getKanbanBoard = async (req, res, next) => {
  try {
    const tasks = await Task.find({ project: req.project._id })
      .populate('assignee', 'name email avatar')
      .sort({ createdAt: -1 });

    const columns = TASK_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      tasks: tasks.filter((task) => task.status === status),
    }));

    return res.status(200).json({
      success: true,
      data: { columns },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// Named exports
// --------------------------------------------------------------
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