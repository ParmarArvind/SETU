import mongoose from 'mongoose';

import Organization from '../models/Organization.js';
import OrganizationMember from '../models/OrganizationMember.js';

// --------------------------------------------------------------
// loadMembership
//
// Expects an organization id at req.params.id (i.e. routes shaped
// like /api/organizations/:id/...). Must run AFTER `protect`
// (auth.middleware.js), since it relies on req.user.id.
//
// On success, attaches:
//   req.organization  -> the Organization document
//   req.membership    -> the caller's OrganizationMember document
//
// This is the gate every organization-scoped route sits behind.
// Controllers should read req.organization / req.membership
// instead of re-querying, and should never trust an organization
// id from anywhere except this verified req.params.id.
// --------------------------------------------------------------
const loadMembership = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Reject malformed ids before hitting the database.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization id',
      });
    }

    // 2. Confirm the organization actually exists.
    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // 3. Confirm the caller belongs to it.
    //    This is the core of data isolation (FR-07): a valid,
    //    authenticated user with no membership record for this
    //    organization gets 403, never the organization's data.
    const membership = await OrganizationMember.findOne({
      organization: organization._id,
      user: req.user.id,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this organization',
      });
    }

    // 4. Attach for downstream middleware/controllers.
    req.organization = organization;
    req.membership = membership;

    next();
  } catch (error) {
    next(error);
  }
};

export { loadMembership };