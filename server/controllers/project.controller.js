import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { PROJECT_VISIBLE_TO_ALL_ROLES } from '../middleware/project.middleware.js';

// --------------------------------------------------------------
// POST /api/organizations/:id/projects
//
// Nested under an organization — sits behind loadMembership +
// requirePermission('projects:create'), so req.organization and
// req.membership are already verified by the time this runs.
//
// Mirrors the pattern from Organization creation (Phase 3,
// Milestone 2): the creator is added as a ProjectMember in the
// same operation, with a compensating rollback if that second
// write fails. This matters here for the same reason it mattered
// for organizations — under the visibility rule in loadProject
// (Milestone 2), a Manager who creates a project but has no
// ProjectMember record would immediately lose access to the
// project they just made.
//
// Owner/Admin creators don't strictly need the ProjectMember
// record (loadProject already grants them visibility), but we
// add it for them too — it's harmless, keeps "who's on this
// project" listings intuitive, and avoids a role-based branch
// in what should be simple creation logic.
// --------------------------------------------------------------
const createProject = async (req, res, next) => {
  let createdProject;

  try {
    const { name, description, startDate, endDate } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
      });
    }

    // 2. Create the project
    createdProject = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      organization: req.organization._id,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdBy: req.user.id,
    });

    // 3. Add the creator as a project member
    let creatorMembership;

    try {
      creatorMembership = await ProjectMember.create({
        project: createdProject._id,
        organization: req.organization._id,
        user: req.user.id,
      });
    } catch (membershipError) {
      // Compensating rollback — same reasoning as organization
      // creation: never leave a project behind that its own
      // creator can't see or manage.
      await Project.findByIdAndDelete(createdProject._id);
      throw membershipError;
    }

    return res.status(201).json({
      success: true,
      data: {
        project: createdProject,
        membership: creatorMembership,
      },
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
// GET /api/organizations/:id/projects
//
// Nested under an organization — sits behind loadMembership, so
// req.organization and req.membership are already verified.
//
// Applies the same visibility rule as loadProject (Milestone 2):
// Owner/Admin see every project in the org; everyone else only
// sees projects they've been explicitly added to via ProjectMember.
//
// Status filtering via ?status=:
//   (omitted)  -> 'active' only (the default — archived projects
//                 stay out of the way unless asked for)
//   'archived' -> archived only
//   'all'      -> both
// Anything else is rejected with 400 rather than silently ignored,
// so a typo'd query param doesn't quietly return the wrong list.
// --------------------------------------------------------------
const listProjects = async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;

    if (!['active', 'archived', 'all'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status filter must be 'active', 'archived', or 'all'",
      });
    }

    const statusFilter = status === 'all' ? {} : { status };

    let projects;

    if (PROJECT_VISIBLE_TO_ALL_ROLES.includes(req.membership.role)) {
      projects = await Project.find({
        organization: req.organization._id,
        ...statusFilter,
      }).sort({ createdAt: -1 });
    } else {
      const memberships = await ProjectMember.find({
        organization: req.organization._id,
        user: req.user.id,
      }).select('project');

      const projectIds = memberships.map((m) => m.project);

      // Filtering by organization here too, even though projectIds
      // already came from records scoped to this organization —
      // defensive, and free given the index on { organization, status }.
      projects = await Project.find({
        _id: { $in: projectIds },
        organization: req.organization._id,
        ...statusFilter,
      }).sort({ createdAt: -1 });
    }

    return res.status(200).json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId
//
// Sits behind loadProject, which has already confirmed the caller
// can see this specific project (tenancy + visibility rule).
// --------------------------------------------------------------
const getProject = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        project: req.project,
        membership: req.membership,
        projectMembership: req.projectMembership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/projects/:projectId
//
// Sits behind loadProject + requirePermission('projects:update').
// Only name, description, startDate, and endDate are editable
// here. Status changes (archive/unarchive) are deliberately
// handled by their own endpoint in Milestone 5 rather than folded
// into this generic update — see that milestone for why.
// --------------------------------------------------------------
const updateProject = async (req, res, next) => {
  try {
    const { name, description, startDate, endDate } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Project name cannot be empty',
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    if (startDate !== undefined) {
      updates.startDate = startDate || null;
    }

    if (endDate !== undefined) {
      updates.endDate = endDate || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.project._id,
      updates,
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      data: { project: updatedProject },
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
// PATCH /api/projects/:projectId/archive
// PATCH /api/projects/:projectId/unarchive
//
// Both sit behind loadProject + requirePermission('projects:archive').
//
// Kept as their own endpoints rather than folded into the generic
// PATCH /:projectId (Milestone 4) for two reasons:
//   1. Archiving is a distinct workflow action worth its own audit
//      trail later (Phase 6's Activity module), not a side effect
//      of an unrelated name/description edit.
//   2. It lets us reject invalid transitions explicitly — archiving
//      an already-archived project is almost always a client bug
//      (double-click, stale UI state), and a clear 400 surfaces
//      that immediately instead of silently no-op'ing.
// --------------------------------------------------------------
const archiveProject = async (req, res, next) => {
  try {
    if (req.project.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Project is already archived',
      });
    }

    const archivedProject = await Project.findByIdAndUpdate(
      req.project._id,
      { status: 'archived' },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      data: { project: archivedProject },
    });
  } catch (error) {
    next(error);
  }
};

const unarchiveProject = async (req, res, next) => {
  try {
    if (req.project.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Project is not archived',
      });
    }

    const restoredProject = await Project.findByIdAndUpdate(
      req.project._id,
      { status: 'active' },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      data: { project: restoredProject },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId/dashboard
//
// Sits behind loadProject only — same reasoning as listProjectMembers:
// this is a read view, available to anyone who can already see the
// project, not a management action needing its own permission.
//
// SRS §4.3 (FR-11) lists what belongs on this dashboard: project
// info, task statistics, recent activity, team members, progress,
// open issues, recent notifications. Task/Activity/Notification
// models don't exist yet (Phases 5–6), so those fields are stubbed
// at zero/empty here rather than left out — this keeps the response
// SHAPE stable now so the frontend (Milestone 8) can be built
// against the real contract, and later phases only need to fill in
// real numbers, not add new top-level fields.
// --------------------------------------------------------------
const getProjectDashboard = async (req, res, next) => {
  try {
    const teamSize = await ProjectMember.countDocuments({
      project: req.project._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        project: req.project,
        teamSize,
        // Stubbed until Phase 5 (Task Management) exists.
        taskStats: {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          inReview: 0,
          openBugs: 0,
        },
        progress: {
          completionPercentage: 0,
        },
        // Stubbed until Phase 6 (Activity Module) exists.
        recentActivity: [],
        recentNotifications: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// Named exports
// --------------------------------------------------------------
export {
  createProject,
  listProjects,
  getProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  getProjectDashboard,
};