import express from 'express';

import OrganizationRequest from '../models/OrganizationRequest.js';

import {
  respondToRequest,
} from '../controllers/membershipRequest.controller.js';

import {
  protect,
} from '../middleware/auth.middleware.js';

import {
  loadMembership,
} from '../middleware/organization.middleware.js';

const router = express.Router();

// ============================================================
// PATCH /api/organization-requests/:id/accept
//
// Accept an organization invitation / request.
//
// For an invitation:
//   The invited user can accept it.
//
// For a join request:
//   Organization owner/admin can accept it.
//
// ============================================================

router.patch(
  '/:id/accept',
  protect,
  async (req, res, next) => {
    try {
      const request =
        await OrganizationRequest.findById(
          req.params.id,
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Organization request not found',
        });
      }

      // --------------------------------------------------------
      // Put the organization id into req.params.id.
      //
      // respondToRequest expects the organization id here.
      // --------------------------------------------------------

      const organizationId =
        String(request.organization);

      req.params.requestId =
        String(request._id);

      // --------------------------------------------------------
      // Invitation
      //
      // The invited user can accept their own invitation
      // without already being an organization member.
      // --------------------------------------------------------

      if (
        request.type === 'invitation' &&
        String(request.user) ===
          String(req.user.id)
      ) {
        req.params.id = organizationId;

        req.body = {
          ...req.body,
          action: 'accept',
        };

        return respondToRequest(
          req,
          res,
          next,
        );
      }

      // --------------------------------------------------------
      // Join request
      //
      // Only an existing authorized organization member should
      // be able to approve it.
      // --------------------------------------------------------

      req.params.id = organizationId;

      return loadMembership(
        req,
        res,
        () => {
          req.body = {
            ...req.body,
            action: 'accept',
          };

          return respondToRequest(
            req,
            res,
            next,
          );
        },
      );
    } catch (error) {
      return next(error);
    }
  },
);

// ============================================================
// PATCH /api/organization-requests/:id/reject
//
// Reject an organization invitation / request.
// ============================================================

router.patch(
  '/:id/reject',
  protect,
  async (req, res, next) => {
    try {
      const request =
        await OrganizationRequest.findById(
          req.params.id,
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Organization request not found',
        });
      }

      const organizationId =
        String(request.organization);

      req.params.requestId =
        String(request._id);

      // --------------------------------------------------------
      // Invited user can reject their own invitation.
      // --------------------------------------------------------

      if (
        request.type === 'invitation' &&
        String(request.user) ===
          String(req.user.id)
      ) {
        req.params.id = organizationId;

        req.body = {
          ...req.body,
          action: 'reject',
        };

        return respondToRequest(
          req,
          res,
          next,
        );
      }

      // --------------------------------------------------------
      // Organization member rejects a join request.
      // --------------------------------------------------------

      req.params.id = organizationId;

      return loadMembership(
        req,
        res,
        () => {
          req.body = {
            ...req.body,
            action: 'reject',
          };

          return respondToRequest(
            req,
            res,
            next,
          );
        },
      );
    } catch (error) {
      return next(error);
    }
  },
);

export default router;