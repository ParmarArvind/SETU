import { hasPermission } from '../config/permissions.js';

// --------------------------------------------------------------
// requireRole(...allowedRoles)
//
// Coarse-grained gate: "only these exact roles may proceed."
// Must run AFTER loadMembership, since it reads req.membership.
//
// Usage:
//   router.patch('/:id', protect, loadMembership, requireRole('owner', 'admin'), updateOrganization);
// --------------------------------------------------------------
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      // Defensive check — this middleware was wired up without
      // loadMembership running first. Fail closed, not open.
      return res.status(500).json({
        success: false,
        message: 'requireRole used without loadMembership',
      });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};

// --------------------------------------------------------------
// requirePermission(permission)
//
// Fine-grained gate: "only roles whose permission matrix includes
// this capability may proceed." Prefer this over requireRole for
// most routes — it reads intent ('tasks:assign') rather than an
// arbitrary list of role names, and stays correct automatically
// if the permission matrix changes (config/permissions.js).
//
// Usage:
//   router.post('/:id/members', protect, loadMembership, requirePermission('members:invite'), addMember);
// --------------------------------------------------------------
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(500).json({
        success: false,
        message: 'requirePermission used without loadMembership',
      });
    }

    if (!hasPermission(req.membership.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};

export { requireRole, requirePermission };