import mongoose from 'mongoose';

import Task from '../models/Task.js';
import OrganizationMember from '../models/OrganizationMember.js';
import ProjectMember from '../models/ProjectMember.js';
import { PROJECT_VISIBLE_TO_ALL_ROLES } from './project.middleware.js';

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

export { loadTask };