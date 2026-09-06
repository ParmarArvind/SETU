import Organization from '../models/Organization.js';
import OrganizationMember from '../models/OrganizationMember.js';

// --------------------------------------------------------------
// Helper: append a short random suffix to a slug.
// Used only when the auto-generated slug collides with an
// existing organization (e.g. two orgs both named "Tech Corp").
// --------------------------------------------------------------
const withRandomSuffix = (slug) => `${slug}-${Math.random().toString(36).slice(2, 6)}`;

// --------------------------------------------------------------
// POST /api/organizations
//
// Creates an organization and, in the same operation, makes the
// requesting user its "owner" via an OrganizationMember record.
//
// This endpoint deliberately does NOT use a Mongo transaction:
// SETU's default local/dev MongoDB runs as a standalone instance
// (no replica set), and transactions require one. Instead we use
// a compensating action — if the membership write fails after the
// organization was created, we delete the organization we just
// created so we never leave an "orphaned" org with no owner.
// --------------------------------------------------------------
const createOrganization = async (req, res, next) => {
  let createdOrganization;

  try {
    const { name, description } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required',
      });
    }

    // 2. Create the organization
    //    Slug is auto-derived from the name by the model's
    //    pre('validate') hook (see models/Organization.js).
    try {
      createdOrganization = await Organization.create({
        name: name.trim(),
        description: description ? description.trim() : '',
        owner: req.user.id,
      });
    } catch (error) {
      // Duplicate slug — retry once with a randomized suffix
      // rather than failing the whole request outright.
      if (error.code === 11000 && error.keyPattern?.slug) {
        const retrySlug = withRandomSuffix(
          name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        );

        createdOrganization = await Organization.create({
          name: name.trim(),
          description: description ? description.trim() : '',
          owner: req.user.id,
          slug: retrySlug,
        });
      } else {
        throw error;
      }
    }

    // 3. Make the creator the "owner" member of the new organization
    let ownerMembership;

    try {
      ownerMembership = await OrganizationMember.create({
        organization: createdOrganization._id,
        user: req.user.id,
        role: 'owner',
        status: 'active',
      });
    } catch (membershipError) {
      // Compensating rollback: don't leave an ownerless organization behind.
      await Organization.findByIdAndDelete(createdOrganization._id);
      throw membershipError;
    }

    // 4. Return the created organization + the caller's membership
    return res.status(201).json({
      success: true,
      data: {
        organization: createdOrganization,
        membership: ownerMembership,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Forward unexpected errors to centralized error middleware
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/organizations
//
// Lists every organization the authenticated user belongs to,
// along with the role they hold in each. This never touches
// organizations the user isn't a member of — the query is scoped
// by req.user.id, not by anything the client can influence.
// --------------------------------------------------------------
const listMyOrganizations = async (req, res, next) => {
  try {
    const memberships = await OrganizationMember.find({
      user: req.user.id,
      status: 'active',
    }).populate('organization');

    const organizations = memberships
      // Defensive filter: skip any membership whose organization
      // was deleted without cleaning up the membership record.
      .filter((membership) => membership.organization)
      .map((membership) => ({
        organization: membership.organization,
        role: membership.role,
      }));

    return res.status(200).json({
      success: true,
      data: { organizations },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/organizations/:id
//
// Sits behind loadMembership, so by the time we get here the
// caller has already been confirmed as an active member and
// req.organization / req.membership are populated.
// --------------------------------------------------------------
const getOrganization = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        organization: req.organization,
        membership: req.membership,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------------------
// PATCH /api/organizations/:id
//
// Sits behind loadMembership + requirePermission('organization:manage'),
// so only owner/admin can reach this controller.
//
// Only name and description are editable here. Deliberately NOT
// editable through this endpoint: slug (would break existing
// links/references) and owner (transferring ownership is a
// distinct, more sensitive operation — not part of this milestone).
// --------------------------------------------------------------
const updateOrganization = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Organization name cannot be empty',
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.organization._id,
      updates,
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      data: { organization: updatedOrganization },
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
export {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  updateOrganization,
};