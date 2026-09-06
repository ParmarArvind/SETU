import mongoose from 'mongoose';

import OrganizationMember from '../models/OrganizationMember.js';
import ProjectMember from '../models/ProjectMember.js';

// --------------------------------------------------------------
// GET /api/projects/:projectId/members
//
// Sits behind loadProject only — anyone who can see the project
// (tenancy + visibility rule already checked) can see who's on it.
// No extra permission gate, same reasoning as org member listing
// in Phase 3: this is read visibility, not a management action.
// --------------------------------------------------------------
const listProjectMembers = async (req, res, next) => {
  try {
    const members = await ProjectMember.find({
      project: req.project._id,
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// POST /api/projects/:projectId/members
//
// Sits behind loadProject + requirePermission('project_members:manage').
//
// IMPORTANT constraint (unlike org member invites in Phase 3):
// this does NOT accept an email and does NOT look anyone up
// outside the organization. A user can only be added to a project
// if they already have an active OrganizationMember record in the
// project's organization.
// --------------------------------------------------------------
const addProjectMember = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(userId.toString())
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid userId is required',
      });
    }

    // Normalize the incoming ID so all database operations
    // use the same string representation.
    const normalizedUserId = userId.toString();

    // Confirm the target user is actually in this organization.
    const orgMembership = await OrganizationMember.findOne({
      organization: req.organization._id,
      user: normalizedUserId,
      status: 'active',
    });

    if (!orgMembership) {
      return res.status(400).json({
        success: false,
        message:
          'User must be an active member of the organization before being added to a project',
      });
    }

    // Prevent duplicate project membership.
    const existingProjectMembership = await ProjectMember.findOne({
      project: req.project._id,
      user: normalizedUserId,
    });

    if (existingProjectMembership) {
      return res.status(409).json({
        success: false,
        message: 'This user is already a member of the project',
      });
    }

    // Create project membership.
    // Organization is always taken from the loaded project context,
    // never from client input.
    const membership = await ProjectMember.create({
      project: req.project._id,
      organization: req.organization._id,
      user: normalizedUserId,
    });

    await membership.populate('user', 'name email avatar');

    return res.status(201).json({
      success: true,
      data: { membership },
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

    // Duplicate-key race condition.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This user is already a member of the project',
      });
    }

    next(error);
  }
};

// --------------------------------------------------------------
// DELETE /api/projects/:projectId/members/:memberId
//
// Sits behind loadProject + requirePermission('project_members:manage').
//
// Unlike organization member removal (Phase 3, Milestone 5), there's
// no "last owner" style invariant to protect here — a project has
// no required role, so removing any ProjectMember is a plain delete
// once it's confirmed to belong to this project.
// --------------------------------------------------------------
const removeProjectMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member id',
      });
    }

    const membership = await ProjectMember.findOne({
      _id: memberId,
      project: req.project._id,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found on this project',
      });
    }

    await ProjectMember.findByIdAndDelete(membership._id);

    return res.status(200).json({
      success: true,
      message: 'Member removed from project',
    });
  } catch (error) {
    next(error);
  }
};

export {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
};