import mongoose from 'mongoose';

import Task from '../models/Task.js';
import OrganizationMember from '../models/OrganizationMember.js';
import ProjectMember from '../models/ProjectMember.js';
import { PROJECT_VISIBLE_TO_ALL_ROLES } from './project.middleware.js';
import { hasPermission } from '../config/permissions.js';

// --------------------------------------------------------------
// loadTask
//
// Expects a task id at req.params.taskId (i.e. routes shaped like
// /api/tasks/:taskId/...). Must run AFTER `protect`, since it
// relies on req.user.id.
//
// This is deliberately a thin wrapper around the SAME tenancy +
// visibility rule loadProject enforces (Phase 4, Milestone 2) —
// task visibility IS project visibility, there's no separate
// concept to invent here. A user who can't see a project can't
// see its tasks either, full stop.
//
// One efficiency this gets "for free" from the Task model's
// denormalized `organization` field (Milestone 1): the tenancy
// check below doesn't need to populate through Project to find
// the organization — it's already sitting on the Task document.
//
// On success, attaches:
//   req.task               -> the Task document
//   req.project             -> the Task's Project document
//   req.organization         -> the Task's Organization document
//   req.membership            -> the caller's OrganizationMember document
//   req.projectMembership      -> the caller's ProjectMember document,
//                                 or null if they qualify via
//                                 PROJECT_VISIBLE_TO_ALL_ROLES instead
// --------------------------------------------------------------
const loadTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // 1. Reject malformed ids before hitting the database.
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task id',
      });
    }

    // 2. Confirm the task exists, pulling its project and
    //    organization in the same query.
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('organization');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // 3. Confirm the caller belongs to the task's organization at
    //    all — same tenancy check as loadMembership/loadProject.
    const membership = await OrganizationMember.findOne({
      organization: task.organization._id,
      user: req.user.id,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this task's organization",
      });
    }

    // 4. Project-level visibility rule — identical to loadProject.
    //    Owner/Admin skip this; everyone else needs an explicit
    //    ProjectMember record for the task's project.
    let projectMembership = null;

    if (!PROJECT_VISIBLE_TO_ALL_ROLES.includes(membership.role)) {
      projectMembership = await ProjectMember.findOne({
        project: task.project._id,
        user: req.user.id,
      });

      if (!projectMembership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this task',
        });
      }
    }

    // 5. Attach for downstream middleware/controllers.
    req.task = task;
    req.project = task.project;
    req.organization = task.organization;
    req.membership = membership;
    req.projectMembership = projectMembership;

    next();
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// requireStatusUpdatePermission
//
// The Kanban drag-and-drop gate (FR-16, FR-20). Must run AFTER
// loadTask, since it reads req.task and req.membership.
//
// This is NOT a single requirePermission() call because the SRS
// genuinely describes an OR of two different rules (Section 3.4,
// FR-16): "Users with appropriate permissions shall be able to
// move tasks between columns" covers Owner/Admin broadly via
// tasks:update, but a Developer moving their OWN assigned card is
// a narrower, separate permission (tasks:update_own_status) that
// only applies to their own tasks — not anyone's.
//
//   PASS if:  role has tasks:update (any task, any status)
//   PASS if:  role has tasks:update_own_status AND the caller is
//             this task's assignee
//   Otherwise: 403
//
// A Developer with tasks:update_own_status trying to move a task
// assigned to someone else correctly falls through to 403 — the
// permission name says "own status" and this is where that word
// actually gets enforced.
// --------------------------------------------------------------
const requireStatusUpdatePermission = (req, res, next) => {
  if (!req.membership || !req.task) {
    return res.status(500).json({
      success: false,
      message: 'requireStatusUpdatePermission used without loadTask',
    });
  }

  const role = req.membership.role;

  if (hasPermission(role, 'tasks:update')) {
    return next();
  }

  const isAssignee =
    req.task.assignee && req.task.assignee.toString() === req.user.id;

  if (isAssignee && hasPermission(role, 'tasks:update_own_status')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You do not have permission to change this task's status",
  });
};

export { loadTask, requireStatusUpdatePermission };