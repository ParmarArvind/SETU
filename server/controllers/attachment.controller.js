import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import Attachment from '../models/Attachment.js';
import { hasPermission } from '../config/permissions.js';

// ------------------------------------------------------------
// Physical upload directory
//
// server/
//   uploads/
//     tasks/
// ------------------------------------------------------------

const UPLOAD_ROOT =
  path.resolve(
    process.cwd(),
    'uploads',
    'tasks',
  );

// ------------------------------------------------------------
// Sanitize original filename
// ------------------------------------------------------------

const sanitizeFileName = (
  name,
) => {
  const base =
    path.basename(
      name || 'file',
    );

  const sanitized =
    base
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      )
      .slice(0, 180);

  return (
    sanitized ||
    'file'
  );
};

// ------------------------------------------------------------
// Upload permission
// ------------------------------------------------------------

const canManageAttachment = (
  role,
) =>
  hasPermission(
    role,
    'tasks:update',
  ) ||
  role === 'owner' ||
  role === 'admin' ||
  role === 'manager' ||
  role === 'developer' ||
  role === 'qa';

// ------------------------------------------------------------
// Delete permission
//
// Owner/Admin/Manager
//     -> can delete any attachment
//
// Other allowed users
//     -> can delete their own attachment
// ------------------------------------------------------------

const canDeleteAttachment = (
  attachment,
  req,
) => {
  if (
    req.membership.role ===
      'owner' ||
    req.membership.role ===
      'admin' ||
    req.membership.role ===
      'manager'
  ) {
    return true;
  }

  return (
    String(
      attachment.uploadedBy,
    ) ===
    String(
      req.user.id,
    )
  );
};

// ============================================================
// GET /api/tasks/:taskId/attachments
// ============================================================

const listTaskAttachments =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const attachments =
        await Attachment.find({
          task:
            req.task._id,

          project:
            req.project._id,

          organization:
            req.organization._id,
        })
          .populate(
            'uploadedBy',
            'name email avatar',
          )
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json({
          success: true,

          data: {
            attachments,
          },
        });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// POST /api/tasks/:taskId/attachments
// ============================================================

const uploadTaskAttachment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      // ------------------------------------------------------
      // Permission
      // ------------------------------------------------------

      if (
        !canManageAttachment(
          req.membership.role,
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              'You do not have permission to upload files to this task',
          });
      }

      // ------------------------------------------------------
      // Check file
      // ------------------------------------------------------

      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Please select a file to upload',
          });
      }

      // ------------------------------------------------------
      // Create upload directory
      // ------------------------------------------------------

      await fs.mkdir(
        UPLOAD_ROOT,
        {
          recursive: true,
        },
      );

      // ------------------------------------------------------
      // Sanitize original name
      // ------------------------------------------------------

      const safeOriginalName =
        sanitizeFileName(
          req.file.originalname,
        );

      // ------------------------------------------------------
      // Keep original extension
      // ------------------------------------------------------

      const extension =
        path.extname(
          safeOriginalName,
        );

      // ------------------------------------------------------
      // Generate secure internal filename
      // ------------------------------------------------------

      const storedName =
        `${crypto.randomUUID()}${extension}`;

      const storagePath =
        path.join(
          UPLOAD_ROOT,
          storedName,
        );

      // ------------------------------------------------------
      // Save physical file
      // ------------------------------------------------------

      await fs.writeFile(
        storagePath,
        req.file.buffer,
      );

      try {
        // ----------------------------------------------------
        // Save attachment metadata in MongoDB
        // ----------------------------------------------------

        const attachment =
          await Attachment.create({
            task:
              req.task._id,

            project:
              req.project._id,

            organization:
              req.organization._id,

            uploadedBy:
              req.user.id,

            originalName:
              safeOriginalName,

            storedName,

            mimeType:
              req.file.mimetype,

            size:
              req.file.size,

            storagePath,
          });

        // ----------------------------------------------------
        // Populate uploader
        // ----------------------------------------------------

        await attachment.populate(
          'uploadedBy',
          'name email avatar',
        );

        return res
          .status(201)
          .json({
            success: true,

            data: {
              attachment,
            },

            message:
              'File uploaded successfully',
          });
      } catch (databaseError) {
        // ----------------------------------------------------
        // If MongoDB fails, remove physical file
        // ----------------------------------------------------

        await fs
          .unlink(
            storagePath,
          )
          .catch(
            () => {},
          );

        throw databaseError;
      }
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET /api/tasks/:taskId/attachments/:attachmentId
//
// Protected download
// ============================================================

const downloadTaskAttachment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const attachment =
        await Attachment.findOne({
          _id:
            req.params
              .attachmentId,

          task:
            req.task._id,

          project:
            req.project._id,

          organization:
            req.organization._id,
        });

      if (!attachment) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Attachment not found',
          });
      }

      // ------------------------------------------------------
      // Check physical file
      // ------------------------------------------------------

      try {
        await fs.access(
          attachment.storagePath,
        );
      } catch {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Attachment file is no longer available',
          });
      }

      // ------------------------------------------------------
      // Response headers
      // ------------------------------------------------------

      res.setHeader(
        'Content-Type',
        attachment.mimeType,
      );

      res.setHeader(
        'Content-Length',
        String(
          attachment.size,
        ),
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${attachment.originalName.replace(
          /"/g,
          '\\"',
        )}"`,
      );

      // ------------------------------------------------------
      // Send protected file
      // ------------------------------------------------------

      return res.sendFile(
        attachment.storagePath,
      );
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// DELETE /api/tasks/:taskId/attachments/:attachmentId
// ============================================================

const deleteTaskAttachment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const attachment =
        await Attachment.findOne({
          _id:
            req.params
              .attachmentId,

          task:
            req.task._id,

          project:
            req.project._id,

          organization:
            req.organization._id,
        });

      if (!attachment) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Attachment not found',
          });
      }

      // ------------------------------------------------------
      // Permission
      // ------------------------------------------------------

      if (
        !canDeleteAttachment(
          attachment,
          req,
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              'You do not have permission to delete this attachment',
          });
      }

      // ------------------------------------------------------
      // Delete physical file
      // ------------------------------------------------------

      await fs
        .unlink(
          attachment.storagePath,
        )
        .catch(
          () => {},
        );

      // ------------------------------------------------------
      // Delete MongoDB document
      // ------------------------------------------------------

      await attachment.deleteOne();

      return res
        .status(200)
        .json({
          success: true,

          message:
            'Attachment deleted successfully',
        });
    } catch (error) {
      next(error);
    }
  };

export {
  listTaskAttachments,
  uploadTaskAttachment,
  downloadTaskAttachment,
  deleteTaskAttachment,
};