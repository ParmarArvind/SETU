import OrganizationMember, {
  ORG_ROLES,
} from '../models/OrganizationMember.js';

import OrganizationRequest from '../models/OrganizationRequest.js';

import User from '../models/User.js';

import {
  VALIDITY_DAYS,
  expirePendingRequests,
  hasActiveMembership,
} from '../utils/membershipRequests.js';

import {
  createNotification,
  createNotifications,
} from '../utils/notification.js';

import {
  emitOrganizationRequestUpdatedToUsers,
} from '../socket/organizationRequestEvents.js';

// ============================================================
// Helpers
// ============================================================

const fail = (
  res,
  status,
  message,
) =>
  res.status(status).json({
    success: false,
    message,
  });

const expiresAt = (
  validityDays = 7,
) =>
  new Date(
    Date.now() +
      Number(validityDays) *
        86400000,
  );

const canApprove = (
  membership,
) =>
  ['owner', 'admin'].includes(
    membership.role,
  );

// ============================================================
// Create organization invitation
//
// POST /api/organizations/:id/invitations
//
// Flow:
//
// Owner/Admin
//      ↓
// Invitation created
//      ↓
// Notification saved
//      ↓
// notification:new
//      ↓
// Invitee receives it instantly
// ============================================================

export const createInvitation =
  async (
    req,
    res,
    next,
  ) => {
    try {
      await expirePendingRequests();

      const {
        email,
        role = 'developer',
        validityDays = 7,
      } = req.body;

      // --------------------------------------------------------
      // Validate email
      // --------------------------------------------------------

      if (!email?.trim()) {
        return fail(
          res,
          400,
          'Email is required',
        );
      }

      // --------------------------------------------------------
      // Validate role
      // --------------------------------------------------------

      if (
        !ORG_ROLES.includes(
          role,
        ) ||
        role === 'owner'
      ) {
        return fail(
          res,
          400,
          'Choose a valid non-owner role',
        );
      }

      // --------------------------------------------------------
      // Validate invitation validity
      // --------------------------------------------------------

      if (
        !VALIDITY_DAYS.includes(
          Number(validityDays),
        )
      ) {
        return fail(
          res,
          400,
          'Validity must be 3, 7, 14, or 30 days',
        );
      }

      // --------------------------------------------------------
      // Find invitee
      // --------------------------------------------------------

      const user =
        await User.findOne({
          email:
            email
              .trim()
              .toLowerCase(),
        });

      if (!user) {
        return fail(
          res,
          404,
          'No SETU account found with that email',
        );
      }

      // --------------------------------------------------------
      // Active membership check
      // --------------------------------------------------------

      if (
        await hasActiveMembership(
          user._id,
        )
      ) {
        return fail(
          res,
          409,
          'This user already belongs to an active organization',
        );
      }

      // --------------------------------------------------------
      // Duplicate invitation check
      // --------------------------------------------------------

      const duplicate =
        await OrganizationRequest.exists(
          {
            organization:
              req.organization._id,

            user:
              user._id,

            type:
              'invitation',

            status:
              'pending',
          },
        );

      if (duplicate) {
        return fail(
          res,
          409,
          'A pending invitation already exists for this user',
        );
      }

      // --------------------------------------------------------
      // Create request
      // --------------------------------------------------------

      const request =
        await OrganizationRequest.create(
          {
            organization:
              req.organization._id,

            user:
              user._id,

            type:
              'invitation',

            role,

            createdBy:
              req.user.id,

            expiresAt:
              expiresAt(
                validityDays,
              ),
          },
        );

      // --------------------------------------------------------
      // Create + emit notification
      // --------------------------------------------------------

      const io =
        req.app.get('io');

      await createNotification({
        recipient:
          user._id,

        type:
          'organization_invitation',

        title:
          'Organization invitation',

        message:
          `You have been invited to join ${req.organization.name} as ${role}.`,

        request:
          request._id,

        organization:
          req.organization._id,

        data: {
          requestId:
            request._id,

          organizationName:
            req.organization.name,

          role,

          expiresAt:
            request.expiresAt,
        },

        io,
      });

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      return res.status(201).json({
        success: true,

        data: {
          request,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// Create join request
//
// POST /api/organizations/:id/join-requests
//
// Flow:
//
// User
//   ↓
// Join request
//   ↓
// Find owner/admin
//   ↓
// Create notification for each approver
//   ↓
// notification:new
// ============================================================

export const createJoinRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      await expirePendingRequests();

      const {
        validityDays = 7,
      } = req.body;

      // --------------------------------------------------------
      // Validate validity
      // --------------------------------------------------------

      if (
        !VALIDITY_DAYS.includes(
          Number(validityDays),
        )
      ) {
        return fail(
          res,
          400,
          'Validity must be 3, 7, 14, or 30 days',
        );
      }

      // --------------------------------------------------------
      // Active membership
      // --------------------------------------------------------

      if (
        await hasActiveMembership(
          req.user.id,
        )
      ) {
        return fail(
          res,
          409,
          'You already belong to an active organization',
        );
      }

      // --------------------------------------------------------
      // Duplicate request
      // --------------------------------------------------------

      const duplicate =
        await OrganizationRequest.exists(
          {
            organization:
              req.organization._id,

            user:
              req.user.id,

            type:
              'join_request',

            status:
              'pending',
          },
        );

      if (duplicate) {
        return fail(
          res,
          409,
          'You already have a pending request for this organization',
        );
      }

      // --------------------------------------------------------
      // Create request
      // --------------------------------------------------------

      const request =
        await OrganizationRequest.create(
          {
            organization:
              req.organization._id,

            user:
              req.user.id,

            type:
              'join_request',

            role:
              'developer',

            createdBy:
              req.user.id,

            expiresAt:
              expiresAt(
                validityDays,
              ),
          },
        );

      // --------------------------------------------------------
      // Find organization approvers
      // --------------------------------------------------------

      const approvers =
        await OrganizationMember.find(
          {
            organization:
              req.organization._id,

            status:
              'active',

            role: {
              $in: [
                'owner',
                'admin',
              ],
            },
          },
        );

      // --------------------------------------------------------
      // Create notifications
      // --------------------------------------------------------

      const io =
        req.app.get('io');

      await createNotifications({
        recipients:
          approvers.map(
            (member) =>
              member.user,
          ),

        type:
          'organization_join_request',

        title:
          'New organization join request',

        message:
          `${req.user.name || 'A user'} requested to join ${req.organization.name}.`,

        request:
          request._id,

        organization:
          req.organization._id,

        data: {
          requestId:
            request._id,

          organizationName:
            req.organization.name,

          requesterName:
            req.user.name,

          requesterId:
            req.user.id,

          role:
            'developer',

          expiresAt:
            request.expiresAt,
        },

        io,
      });

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      return res.status(201).json({
        success: true,

        data: {
          request,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// List organization requests
//
// GET /api/organizations/:id/requests
// ============================================================

export const listOrganizationRequests =
  async (
    req,
    res,
    next,
  ) => {
    try {
      await expirePendingRequests();

      if (
        !canApprove(
          req.membership,
        )
      ) {
        return fail(
          res,
          403,
          'Only an owner or admin can view membership requests',
        );
      }

      const requests =
        await OrganizationRequest.find(
          {
            organization:
              req.organization._id,

            status:
              'pending',
          },
        )
          .populate(
            'user',
            'name email',
          )
          .populate(
            'createdBy',
            'name email',
          )
          .sort({
            createdAt:
              -1,
          });

      return res.json({
        success: true,

        data: {
          requests,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// Respond to invitation / join request
//
// PATCH /api/organization-requests/:requestId
//
// Invitation:
//   Invitee accepts/rejects
//
// Join request:
//   Owner/Admin accepts/rejects
//
// After response:
//   1. Notification is created
//   2. notification:new is emitted
//   3. organization:requestUpdated is emitted
// ============================================================

export const respondToRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      await expirePendingRequests();

      const {
        action,
      } = req.body;

      // --------------------------------------------------------
      // Validate action
      // --------------------------------------------------------

      if (
        ![
          'accept',
          'reject',
        ].includes(action)
      ) {
        return fail(
          res,
          400,
          'Action must be accept or reject',
        );
      }

      // --------------------------------------------------------
      // Find request
      // --------------------------------------------------------

      const requestId =
        req.params.requestId ||
        req.params.id;

      const request =
        await OrganizationRequest.findById(
          requestId,
        ).populate(
          'organization',
        );

      if (!request) {
        return fail(
          res,
          404,
          'Request not found',
        );
      }

      // --------------------------------------------------------
      // Request must still be pending
      // --------------------------------------------------------

      if (
        request.status !==
        'pending'
      ) {
        return fail(
          res,
          409,
          `This request is already ${request.status}`,
        );
      }

      // --------------------------------------------------------
      // Expiry check
      // --------------------------------------------------------

      if (
        request.expiresAt <=
        new Date()
      ) {
        request.status =
          'expired';

        request.respondedAt =
          new Date();

        await request.save();

        return fail(
          res,
          410,
          'This request has expired',
        );
      }

      // --------------------------------------------------------
      // Authorization
      // --------------------------------------------------------

      const isInvitee =
        String(
          request.user,
        ) ===
        String(
          req.user.id,
        );

      if (
        (
          request.type ===
            'invitation' &&
          !isInvitee
        ) ||
        (
          request.type ===
            'join_request' &&
          (
            isInvitee ||
            !canApprove(
              req.membership,
            )
          )
        )
      ) {
        return fail(
          res,
          403,
          'You cannot respond to this request',
        );
      }

      // --------------------------------------------------------
      // Accept
      // --------------------------------------------------------

      if (
        action ===
        'accept'
      ) {
        if (
          await hasActiveMembership(
            request.user,
          )
        ) {
          return fail(
            res,
            409,
            'This user already belongs to an active organization',
          );
        }

        await OrganizationMember.create(
          {
            organization:
              request.organization?._id ||
              request.organization,

            user:
              request.user,

            role:
              request.role,

            status:
              'active',
          },
        );
      }

      // --------------------------------------------------------
      // Update request
      // --------------------------------------------------------

      request.status =
        action ===
        'accept'
          ? 'accepted'
          : 'rejected';

      request.respondedAt =
        new Date();

      await request.save();

      // --------------------------------------------------------
      // Organization ID
      // --------------------------------------------------------

      const organizationId =
        request.organization?._id ||
        request.organization;

      // --------------------------------------------------------
      // Find organization approvers
      //
      // Needed for real-time synchronization of join requests.
      // --------------------------------------------------------

      let approverUserIds = [];

      if (
        request.type ===
        'join_request'
      ) {
        const approvers =
          await OrganizationMember.find(
            {
              organization:
                organizationId,

              status:
                'active',

              role: {
                $in: [
                  'owner',
                  'admin',
                ],
              },
            },
          ).select(
            'user',
          );

        approverUserIds =
          approvers.map(
            (member) =>
              member.user,
          );
      }

      // --------------------------------------------------------
      // Determine notification recipient
      //
      // Invitation:
      //   Notify invitation creator
      //
      // Join request:
      //   Notify requester
      // --------------------------------------------------------

      const notificationRecipient =
        request.type ===
        'invitation'
          ? request.createdBy
          : request.user;

      const io =
        req.app.get('io');

      // --------------------------------------------------------
      // Notify recipient
      // --------------------------------------------------------

      await createNotification({
        recipient:
          notificationRecipient,

        type:
          `organization_request_${request.status}`,

        title:
          `Organization ${request.status}`,

        message:
          `${request.organization?.name || 'Organization'} ${
            request.type ===
            'invitation'
              ? 'invitation'
              : 'join request'
          } was ${request.status}.`,

        request:
          request._id,

        organization:
          organizationId,

        data: {
          requestId:
            request._id,

          organizationName:
            request.organization?.name ||
            'Organization',

          requestType:
            request.type,

          action,
        },

        io,
      });

      // --------------------------------------------------------
      // Real-time request update
      //
      // Notify every relevant connected client so that:
      //
      // - Notifications page updates
      // - Accept/Reject buttons disappear
      // - Request status changes immediately
      // - Multiple browsers stay synchronized
      // --------------------------------------------------------

      const requestUpdateRecipients = [
        request.user,
        request.createdBy,
        ...approverUserIds,
      ];

      emitOrganizationRequestUpdatedToUsers(
        io,
        requestUpdateRecipients,
        {
          requestId:
            request._id.toString(),

          status:
            request.status,

          action,

          organizationId:
            organizationId.toString(),

          requestType:
            request.type,

          organizationName:
            request.organization?.name ||
            'Organization',
        },
      );

      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      return res.json({
        success: true,

        data: {
          request,
        },
      });
    } catch (error) {
      // Duplicate active membership
      if (
        error.code ===
        11000
      ) {
        return fail(
          res,
          409,
          'This user already belongs to this organization',
        );
      }

      next(error);
    }
  };