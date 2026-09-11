import mongoose from 'mongoose';

import User from '../models/User.js';

import OrganizationMember, {
  ORG_ROLES,
} from '../models/OrganizationMember.js';

import ProjectMember from '../models/ProjectMember.js';

import Task from '../models/Task.js';

import { ROLE_RANK } from '../config/permissions.js';

import {
  emitTaskUpdated,
} from '../socket/taskEvents.js';

// --------------------------------------------------------------
// GET /api/organizations/:id/members
//
// Any active member can view the member list.
// --------------------------------------------------------------
const listMembers = async (req, res, next) => {
  try {
    const members = await OrganizationMember.find({
      organization: req.organization._id,
      status: 'active',
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
// POST /api/organizations/:id/members
//
// Adds an existing SETU user to the organization.
// --------------------------------------------------------------
const addMember = async (req, res, next) => {
  try {
    const {
      email,
      role = 'developer',
    } = req.body;

    // ----------------------------------------------------------
    // 1. Validate input
    // ----------------------------------------------------------

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!ORG_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          'Role must be one of: ' +
          ORG_ROLES.join(', '),
      });
    }

    if (role === 'owner') {
      return res.status(400).json({
        success: false,
        message:
          'Owner role cannot be assigned through this endpoint',
      });
    }

    // ----------------------------------------------------------
    // 2. Find user
    // ----------------------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          'No SETU account found with that email',
      });
    }

    // ----------------------------------------------------------
    // 3. Prevent duplicate ACTIVE membership
    // ----------------------------------------------------------

    const existingMembership =
      await OrganizationMember.findOne({
        organization:
          req.organization._id,

        user:
          user._id,

        status:
          'active',
      });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message:
          'This user is already a member of the organization',
      });
    }

    // ----------------------------------------------------------
    // 4. Create membership
    // ----------------------------------------------------------

    const membership =
      await OrganizationMember.create({
        organization:
          req.organization._id,

        user:
          user._id,

        role,

        status:
          'active',
      });

    await membership.populate(
      'user',
      'name email avatar',
    );

    return res.status(201).json({
      success: true,

      data: {
        membership,
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

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          'This user is already a member of the organization',
      });
    }

    next(error);
  }
};

// --------------------------------------------------------------
// DELETE /api/organizations/:id/members/:memberId
//
// Removes a member from an organization.
//
// Cleanup performed:
//
//   1. Find all tasks assigned to the user.
//   2. Unassign those tasks.
//   3. Delete all project memberships belonging to the user
//      inside this organization.
//   4. Delete organization membership.
//   5. Notify connected project clients about task changes.
//
// This prevents stale task assignments after a member leaves.
// --------------------------------------------------------------
const removeMember = async (
  req,
  res,
  next,
) => {
  try {
    const {
      memberId,
    } = req.params;

    // ----------------------------------------------------------
    // 1. Validate member id
    // ----------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        memberId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid member id',
      });
    }

    // ----------------------------------------------------------
    // 2. Find target membership
    // ----------------------------------------------------------

    const targetMembership =
      await OrganizationMember.findOne({
        _id:
          memberId,

        organization:
          req.organization._id,
      });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message:
          'Member not found in this organization',
      });
    }

    // ----------------------------------------------------------
    // 3. Never remove the only owner
    // ----------------------------------------------------------

    if (
      targetMembership.role ===
      'owner'
    ) {
      const ownerCount =
        await OrganizationMember.countDocuments({
          organization:
            req.organization._id,

          role:
            'owner',

          status:
            'active',
        });

      if (
        ownerCount <= 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot remove the only owner of the organization',
        });
      }
    }

    // ----------------------------------------------------------
    // 4. Permission hierarchy
    // ----------------------------------------------------------

    const actingRank =
      ROLE_RANK[
        req.membership.role
      ];

    const targetRank =
      ROLE_RANK[
        targetMembership.role
      ];

    const actingIsOwner =
      req.membership.role ===
      'owner';

    if (
      !actingIsOwner &&
      targetRank <= actingRank
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You cannot remove a member with equal or higher privilege than yourself',
      });
    }

    // ----------------------------------------------------------
    // 5. User being removed
    // ----------------------------------------------------------

    const removedUserId =
      targetMembership.user;

    // ----------------------------------------------------------
    // 6. Find all tasks assigned to this user
    //    inside this organization.
    // ----------------------------------------------------------

    const assignedTasks =
      await Task.find({
        organization:
          req.organization._id,

        assignee:
          removedUserId,
      }).select(
        '_id project title',
      );

    // ----------------------------------------------------------
    // 7. Unassign all tasks
    //
    // This is the most important fix for the stale-assignee bug.
    // ----------------------------------------------------------

    if (
      assignedTasks.length >
      0
    ) {
      await Task.updateMany(
        {
          organization:
            req.organization._id,

          assignee:
            removedUserId,
        },
        {
          $set: {
            assignee:
              null,
          },
        },
      );
    }

    // ----------------------------------------------------------
    // 8. Delete ALL project memberships for this user
    //    inside this organization.
    //
    // ProjectMember contains organization directly, so this is
    // safely scoped and does not affect another organization.
    // ----------------------------------------------------------

    const deletedProjectMemberships =
      await ProjectMember.deleteMany({
        organization:
          req.organization._id,

        user:
          removedUserId,
      });

    // ----------------------------------------------------------
    // 9. Delete organization membership
    // ----------------------------------------------------------

    await OrganizationMember.findByIdAndDelete(
      targetMembership._id,
    );

    // ----------------------------------------------------------
    // 10. Emit updated tasks
    //
    // Connected project clients will receive the updated task
    // with assignee = null.
    // ----------------------------------------------------------

    const io =
      req.app.get('io');

    if (
      io &&
      assignedTasks.length >
        0
    ) {
      const updatedTasks =
        await Task.find({
          _id: {
            $in:
              assignedTasks.map(
                (task) =>
                  task._id,
              ),
          },
        }).populate(
          'assignee',
          'name email avatar',
        );

      updatedTasks.forEach(
        (task) => {
          emitTaskUpdated(
            io,
            task,
          );
        },
      );
    }

    // ----------------------------------------------------------
    // 11. Response
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        removedMemberId:
          targetMembership._id,

        removedUserId,

        unassignedTaskCount:
          assignedTasks.length,

        removedProjectMembershipCount:
          deletedProjectMemberships.deletedCount,
      },

      message:
        assignedTasks.length >
        0
          ? `Member removed, ${assignedTasks.length} task(s) unassigned, and project memberships cleaned up`
          : 'Member removed from organization',
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/organizations/:id/members/:memberId/role
// --------------------------------------------------------------
const assignRole = async (
  req,
  res,
  next,
) => {
  try {
    const {
      memberId,
    } = req.params;

    const {
      role: newRole,
    } = req.body;

    // ----------------------------------------------------------
    // Validate member id
    // ----------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        memberId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid member id',
      });
    }

    // ----------------------------------------------------------
    // Validate role
    // ----------------------------------------------------------

    if (
      !newRole ||
      !ORG_ROLES.includes(
        newRole,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Role must be one of: ' +
          ORG_ROLES.join(', '),
      });
    }

    // ----------------------------------------------------------
    // Find target membership
    // ----------------------------------------------------------

    const targetMembership =
      await OrganizationMember.findOne({
        _id:
          memberId,

        organization:
          req.organization._id,

        status:
          'active',
      });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message:
          'Member not found in this organization',
      });
    }

    const actingRank =
      ROLE_RANK[
        req.membership.role
      ];

    const targetRank =
      ROLE_RANK[
        targetMembership.role
      ];

    const newRoleRank =
      ROLE_RANK[
        newRole
      ];

    const actingIsOwner =
      req.membership.role ===
      'owner';

    // ----------------------------------------------------------
    // Rule 1:
    // Cannot grant a role more privileged than your own.
    // ----------------------------------------------------------

    if (
      !actingIsOwner &&
      newRoleRank < actingRank
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You cannot assign a role higher than your own',
      });
    }

    // ----------------------------------------------------------
    // Rule 2:
    // Cannot modify someone equal/higher than yourself.
    // ----------------------------------------------------------

    if (
      !actingIsOwner &&
      targetRank <= actingRank
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You cannot change the role of a member with equal or higher privilege than yourself',
      });
    }

    // ----------------------------------------------------------
    // Rule 3:
    // Cannot demote the only owner.
    // ----------------------------------------------------------

    if (
      targetMembership.role ===
        'owner' &&
      newRole !== 'owner'
    ) {
      const ownerCount =
        await OrganizationMember.countDocuments({
          organization:
            req.organization._id,

          role:
            'owner',

          status:
            'active',
        });

      if (
        ownerCount <= 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot change the role of the only owner of the organization',
        });
      }
    }

    // ----------------------------------------------------------
    // Update role
    // ----------------------------------------------------------

    targetMembership.role =
      newRole;

    await targetMembership.save();

    await targetMembership.populate(
      'user',
      'name email avatar',
    );

    return res.status(200).json({
      success: true,

      data: {
        membership:
          targetMembership,
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

// --------------------------------------------------------------
// Named exports
// --------------------------------------------------------------

export {
  listMembers,
  addMember,
  removeMember,
  assignRole,
};