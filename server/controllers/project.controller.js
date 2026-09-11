import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Task from '../models/Task.js';
import {
  PROJECT_VISIBLE_TO_ALL_ROLES,
} from '../middleware/project.middleware.js';

// --------------------------------------------------------------
// POST /api/organizations/:id/projects
// --------------------------------------------------------------
const createProject = async (
  req,
  res,
  next,
) => {
  let createdProject;

  try {
    const {
      name,
      description,
      startDate,
      endDate,
    } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required',
      });
    }

    // 2. Create project
    createdProject = await Project.create({
      name: name.trim(),
      description: description
        ? description.trim()
        : '',
      organization: req.organization._id,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdBy: req.user.id,
    });

    // 3. Add creator as project member
    let creatorMembership;

    try {
      creatorMembership =
        await ProjectMember.create({
          project: createdProject._id,
          organization:
            req.organization._id,
          user: req.user.id,
        });
    } catch (membershipError) {
      await Project.findByIdAndDelete(
        createdProject._id,
      );

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
// --------------------------------------------------------------
const listProjects = async (
  req,
  res,
  next,
) => {
  try {
    const {
      status = 'active',
    } = req.query;

    if (
      ![
        'active',
        'archived',
        'all',
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status filter must be 'active', 'archived', or 'all'",
      });
    }

    const statusFilter =
      status === 'all'
        ? {}
        : { status };

    let projects;

    if (
      PROJECT_VISIBLE_TO_ALL_ROLES.includes(
        req.membership.role,
      )
    ) {
      projects = await Project.find({
        organization:
          req.organization._id,
        ...statusFilter,
      }).sort({
        createdAt: -1,
      });
    } else {
      const memberships =
        await ProjectMember.find({
          organization:
            req.organization._id,
          user: req.user.id,
        }).select('project');

      const projectIds =
        memberships.map(
          (membership) =>
            membership.project,
        );

      projects = await Project.find({
        _id: {
          $in: projectIds,
        },
        organization:
          req.organization._id,
        ...statusFilter,
      }).sort({
        createdAt: -1,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId
// --------------------------------------------------------------
const getProject = async (
  req,
  res,
  next,
) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        project: req.project,
        membership: req.membership,
        projectMembership:
          req.projectMembership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/projects/:projectId
// --------------------------------------------------------------
const updateProject = async (
  req,
  res,
  next,
) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
    } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message:
            'Project name cannot be empty',
        });
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description =
        description.trim();
    }

    if (startDate !== undefined) {
      updates.startDate =
        startDate || null;
    }

    if (endDate !== undefined) {
      updates.endDate =
        endDate || null;
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No valid fields provided to update',
      });
    }

    const updatedProject =
      await Project.findByIdAndUpdate(
        req.project._id,
        updates,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

    return res.status(200).json({
      success: true,
      data: {
        project: updatedProject,
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
// PATCH /api/projects/:projectId/archive
// --------------------------------------------------------------
const archiveProject = async (
  req,
  res,
  next,
) => {
  try {
    if (
      req.project.status ===
      'archived'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Project is already archived',
      });
    }

    const archivedProject =
      await Project.findByIdAndUpdate(
        req.project._id,
        {
          status: 'archived',
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

    return res.status(200).json({
      success: true,
      data: {
        project: archivedProject,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/projects/:projectId/unarchive
// --------------------------------------------------------------
const unarchiveProject = async (
  req,
  res,
  next,
) => {
  try {
    if (
      req.project.status !==
      'archived'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Project is not archived',
      });
    }

    const restoredProject =
      await Project.findByIdAndUpdate(
        req.project._id,
        {
          status: 'active',
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

    return res.status(200).json({
      success: true,
      data: {
        project: restoredProject,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/projects/:projectId/dashboard
// --------------------------------------------------------------
const getProjectDashboard = async (
  req,
  res,
  next,
) => {
  try {
    const projectId =
      req.project._id;

    const [
      teamSize,
      total,
      completed,
      pending,
      inProgress,
      inReview,
    ] = await Promise.all([
      ProjectMember.countDocuments({
        project: projectId,
      }),

      Task.countDocuments({
        project: projectId,
      }),

      Task.countDocuments({
        project: projectId,
        status: 'done',
      }),

      Task.countDocuments({
        project: projectId,
        status: 'todo',
      }),

      Task.countDocuments({
        project: projectId,
        status: 'in_progress',
      }),

      Task.countDocuments({
        project: projectId,
        status: 'in_review',
      }),
    ]);

    const completionPercentage =
      total === 0
        ? 0
        : Math.round(
            (completed / total) * 100,
          );

    return res.status(200).json({
      success: true,
      data: {
        project: req.project,

        teamSize,

        taskStats: {
          total,
          completed,
          pending,
          inProgress,
          inReview,
          openBugs: 0,
        },

        progress: {
          completionPercentage,
        },

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