import mongoose from 'mongoose';

import User from '../models/User.js';
import OrganizationMember, { ORG_ROLES } from '../models/OrganizationMember.js';
import { ROLE_RANK } from '../config/permissions.js';

// --------------------------------------------------------------
// GET /api/organizations/:id/members
//
// Any active member can view the member list (needed for things
// like task-assignment dropdowns) — no extra permission beyond
// loadMembership having already confirmed membership.
// --------------------------------------------------------------
const listMembers = async (req, res, next) => {
  try {
    const members = await OrganizationMember.find({
      organization: req.organization._id,
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
// Adds an existing SETU user to the organization by email.
//
// NOTE: This milestone only supports adding users who have already
// registered an account. Inviting someone who doesn't have an
// account yet (email-invite-to-signup flow) is listed under SRS
// "Future Enhancements" and is intentionally out of scope here.
// --------------------------------------------------------------
const addMember = async (req, res, next) => {
  try {
    const { email, role = 'developer' } = req.body;

    // 1. Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!ORG_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be one of: ' + ORG_ROLES.join(', '),
      });
    }

    // Ownership is granted at organization-creation time or via a
    // dedicated transfer flow, never through a generic "add member"
    // call — that would risk an org ending up with multiple/ambiguous
    // owners.
    if (role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Owner role cannot be assigned through this endpoint',
      });
    }

    // 2. Find the user by email
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No SETU account found with that email',
      });
    }

    // 3. Prevent duplicate membership
    const existingMembership = await OrganizationMember.findOne({
      organization: req.organization._id,
      user: user._id,
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: 'This user is already a member of the organization',
      });
    }

    // 4. Create the membership
    const membership = await OrganizationMember.create({
      organization: req.organization._id,
      user: user._id,
      role,
      status: 'active',
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

    // Duplicate-key race condition (two simultaneous invites)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This user is already a member of the organization',
      });
    }

    next(error);
  }
};

// --------------------------------------------------------------
// DELETE /api/organizations/:id/members/:memberId
//
// Removes a membership record. Guarded by two safety rules:
//   1. An organization must always have at least one owner.
//   2. A caller cannot remove someone of equal-or-higher privilege
//      than themselves, unless the caller is the owner.
//      (Prevents an Admin from removing another Admin or the Owner.)
// --------------------------------------------------------------
const removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member id',
      });
    }

    const targetMembership = await OrganizationMember.findOne({
      _id: memberId,
      organization: req.organization._id,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this organization',
      });
    }

    // Rule 1: never remove the only owner.
    if (targetMembership.role === 'owner') {
      const ownerCount = await OrganizationMember.countDocuments({
        organization: req.organization._id,
        role: 'owner',
      });

      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the only owner of the organization',
        });
      }
    }

    // Rule 2: hierarchy check — the owner can remove anyone; everyone
    // else can only remove members with strictly lower privilege
    // than themselves.
    const actingRank = ROLE_RANK[req.membership.role];
    const targetRank = ROLE_RANK[targetMembership.role];
    const actingIsOwner = req.membership.role === 'owner';

    if (!actingIsOwner && targetRank <= actingRank) {
      return res.status(403).json({
        success: false,
        message: 'You cannot remove a member with equal or higher privilege than yourself',
      });
    }

    await OrganizationMember.findByIdAndDelete(targetMembership._id);

    return res.status(200).json({
      success: true,
      message: 'Member removed from organization',
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/organizations/:id/members/:memberId/role
//
// Reuses the exact hierarchy logic from removeMember, plus one
// extra rule specific to role assignment: nobody can hand out a
// role more privileged than their own.
//
// Together these three rules stop every privilege-escalation path:
//   1. Cannot assign a role above your own rank (unless you're Owner).
//   2. Cannot change the role of someone equal-or-higher rank than
//      you (unless you're Owner).
//   3. Cannot demote the organization's only remaining Owner.
//
// Because rule 1 and rule 2 both reduce to "false" when a non-owner
// targets themselves (their own rank is never > their own rank),
// self-escalation is blocked without needing a separate special case.
// --------------------------------------------------------------
const assignRole = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role: newRole } = req.body;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member id',
      });
    }

    if (!newRole || !ORG_ROLES.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be one of: ' + ORG_ROLES.join(', '),
      });
    }

    const targetMembership = await OrganizationMember.findOne({
      _id: memberId,
      organization: req.organization._id,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this organization',
      });
    }

    const actingRank = ROLE_RANK[req.membership.role];
    const targetRank = ROLE_RANK[targetMembership.role];
    const newRoleRank = ROLE_RANK[newRole];
    const actingIsOwner = req.membership.role === 'owner';

    // Rule 1: cannot grant a role more privileged than your own.
    if (!actingIsOwner && newRoleRank < actingRank) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign a role higher than your own',
      });
    }

    // Rule 2: cannot touch someone already equal-or-higher privilege.
    if (!actingIsOwner && targetRank <= actingRank) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change the role of a member with equal or higher privilege than yourself',
      });
    }

    // Rule 3: never demote the organization's only owner.
    if (targetMembership.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await OrganizationMember.countDocuments({
        organization: req.organization._id,
        role: 'owner',
      });

      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change the role of the only owner of the organization',
        });
      }
    }

    targetMembership.role = newRole;
    await targetMembership.save();
    await targetMembership.populate('user', 'name email avatar');

    return res.status(200).json({
      success: true,
      data: { membership: targetMembership },
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
// Named exports
// --------------------------------------------------------------
export { listMembers, addMember, removeMember, assignRole };