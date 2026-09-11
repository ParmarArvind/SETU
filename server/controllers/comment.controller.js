import mongoose from 'mongoose';

import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';

import {
  hasPermission,
} from '../config/permissions.js';

import {
  logActivity,
} from '../utils/activity.js';

import {
  createNotifications,
} from '../utils/notification.js';

import {
  emitCommentCreated,
  emitActivityCreated,
} from '../socket/collaborationEvents.js';

// ============================================================
// Create comment
// POST /api/tasks/:taskId/comments
//
// Required middleware:
// protect -> loadTask
//
// Real-time events:
//   comment:created
//   activity:created
//
// Notification:
//   comment_created
//
// Recipients:
//   - Task assignee
//   - Task creator
//
// The commenter themselves is never notified.
// Duplicate recipients are removed.
// ============================================================

export const createComment = async (
  req,
  res,
  next,
) => {
  try {
    const {
      taskId,
    } = req.params;

    const {
      content,
    } = req.body;

    // ----------------------------------------------------------
    // Validate content
    // ----------------------------------------------------------

    if (
      !content ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Comment content is required',
      });
    }

    const trimmedContent =
      content.trim();

    if (
      trimmedContent.length >
      2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Comment must be at most 2000 characters',
      });
    }

    // ----------------------------------------------------------
    // loadTask has already verified:
    //
    // - task exists
    // - organization membership
    // - project access
    // ----------------------------------------------------------

    const comment =
      await Comment.create({
        task:
          req.task._id,

        project:
          req.project._id,

        organization:
          req.organization._id,

        author:
          req.user.id,

        content:
          trimmedContent,
      });

    // ----------------------------------------------------------
    // Populate author
    // ----------------------------------------------------------

    const populatedComment =
      await Comment.findById(
        comment._id,
      ).populate(
        'author',
        'name email',
      );

    if (!populatedComment) {
      return res.status(500).json({
        success: false,
        message:
          'Comment was created but could not be loaded',
      });
    }

    // ==========================================================
    // CREATE ACTIVITY
    // ==========================================================

    const activity =
      await logActivity({
        organization:
          req.organization._id,

        project:
          req.project._id,

        actor:
          req.user.id,

        action:
          'comment.created',

        entityType:
          'comment',

        entityId:
          populatedComment._id,

        metadata: {
          taskId:
            req.task._id,

          taskTitle:
            req.task.title,

          commentId:
            populatedComment._id,

          commentPreview:
            trimmedContent.slice(
              0,
              200,
            ),
        },
      });

    // ==========================================================
    // SOCKET.IO
    // ==========================================================

    const io =
      req.app.get('io');

    // ----------------------------------------------------------
    // Emit comment to project room
    // ----------------------------------------------------------

    emitCommentCreated(
      io,
      populatedComment,
    );

    // ----------------------------------------------------------
    // Emit activity to project room
    // ----------------------------------------------------------

    if (activity) {
      const populatedActivity =
        await Activity.findById(
          activity._id,
        )
          .populate(
            'actor',
            'name email',
          )
          .lean();

      if (populatedActivity) {
        emitActivityCreated(
          io,
          populatedActivity,
        );
      }
    }

    // ==========================================================
    // COMMENT NOTIFICATIONS
    // ==========================================================

    // ----------------------------------------------------------
    // Build recipient list.
    //
    // We notify:
    //
    // 1. Task assignee
    // 2. Task creator
    //
    // But never:
    //
    // - the person who created the comment
    // - the same user twice
    // ----------------------------------------------------------

    const recipientIds =
      new Set();

    const commenterId =
      String(
        req.user.id,
      );

    // ----------------------------------------------------------
    // Task assignee
    // ----------------------------------------------------------

    if (
      req.task.assignee
    ) {
      const assigneeId =
        String(
          req.task.assignee,
        );

      if (
        assigneeId !==
        commenterId
      ) {
        recipientIds.add(
          assigneeId,
        );
      }
    }

    // ----------------------------------------------------------
    // Task creator
    // ----------------------------------------------------------

    if (
      req.task.createdBy
    ) {
      const creatorId =
        String(
          req.task.createdBy,
        );

      if (
        creatorId !==
        commenterId
      ) {
        recipientIds.add(
          creatorId,
        );
      }
    }

    // ----------------------------------------------------------
    // Create notifications
    //
    // createNotifications() handles:
    //
    // MongoDB persistence
    // +
    // notification:new Socket.IO event
    // ----------------------------------------------------------

    if (
      recipientIds.size >
      0
    ) {
      await createNotifications({
        recipients:
          Array.from(
            recipientIds,
          ),

        type:
          'comment_created',

        title:
          'New Comment',

        message:
          `A new comment was added to the task "${req.task.title}".`,

        organization:
          req.organization._id,

        data: {
          taskId:
            req.task._id,

          taskTitle:
            req.task.title,

          commentId:
            populatedComment._id,

          projectId:
            req.project._id,

          commentPreview:
            trimmedContent.slice(
              0,
              200,
            ),
        },

        io,
      });
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.status(201).json({
      success: true,

      message:
        'Comment added successfully',

      data: {
        comment:
          populatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Get task comments
// GET /api/tasks/:taskId/comments
//
// Required middleware:
// protect -> loadTask
// ============================================================

export const getTaskComments = async (
  req,
  res,
  next,
) => {
  try {
    const comments =
      await Comment.find({
        task:
          req.task._id,

        project:
          req.project._id,

        organization:
          req.organization._id,
      })
        .populate(
          'author',
          'name email',
        )
        .sort({
          createdAt: 1,
        });

    return res.status(200).json({
      success: true,

      count:
        comments.length,

      data: {
        comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Update comment
// PATCH /api/tasks/:taskId/comments/:commentId
//
// Required middleware:
// protect -> loadTask
//
// Author can edit own comment.
// Owner/Admin can moderate comments.
// ============================================================

export const updateComment = async (
  req,
  res,
  next,
) => {
  try {
    const {
      taskId,
      commentId,
    } = req.params;

    const {
      content,
    } = req.body;

    // ----------------------------------------------------------
    // Validate comment id
    // ----------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        commentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid comment id',
      });
    }

    // ----------------------------------------------------------
    // Validate content
    // ----------------------------------------------------------

    if (
      !content ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Comment content is required',
      });
    }

    const trimmedContent =
      content.trim();

    if (
      trimmedContent.length >
      2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Comment must be at most 2000 characters',
      });
    }

    // ----------------------------------------------------------
    // Find comment within verified scope
    // ----------------------------------------------------------

    const comment =
      await Comment.findOne({
        _id:
          commentId,

        task:
          taskId,

        project:
          req.project._id,

        organization:
          req.organization._id,
      });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          'Comment not found',
      });
    }

    // ----------------------------------------------------------
    // Authorization
    // ----------------------------------------------------------

    const isAuthor =
      comment.author.toString() ===
      req.user.id;

    const canModerate =
      hasPermission(
        req.membership.role,
        'comments:moderate',
      );

    if (
      !isAuthor &&
      !canModerate
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You can only edit your own comments',
      });
    }

    // ----------------------------------------------------------
    // Update
    // ----------------------------------------------------------

    comment.content =
      trimmedContent;

    await comment.save();

    // ----------------------------------------------------------
    // Populate author
    // ----------------------------------------------------------

    const populatedComment =
      await Comment.findById(
        comment._id,
      ).populate(
        'author',
        'name email',
      );

    return res.status(200).json({
      success: true,

      message:
        'Comment updated successfully',

      data: {
        comment:
          populatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Delete comment
// DELETE /api/tasks/:taskId/comments/:commentId
//
// Required middleware:
// protect -> loadTask
//
// Author can delete own comment.
// Owner/Admin can moderate/delete any comment.
// ============================================================

export const deleteComment = async (
  req,
  res,
  next,
) => {
  try {
    const {
      taskId,
      commentId,
    } = req.params;

    // ----------------------------------------------------------
    // Validate comment id
    // ----------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        commentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid comment id',
      });
    }

    // ----------------------------------------------------------
    // Find comment
    // ----------------------------------------------------------

    const comment =
      await Comment.findOne({
        _id:
          commentId,

        task:
          taskId,

        project:
          req.project._id,

        organization:
          req.organization._id,
      });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          'Comment not found',
      });
    }

    // ----------------------------------------------------------
    // Authorization
    // ----------------------------------------------------------

    const isAuthor =
      comment.author.toString() ===
      req.user.id;

    const canModerate =
      hasPermission(
        req.membership.role,
        'comments:moderate',
      );

    if (
      !isAuthor &&
      !canModerate
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You can only delete your own comments',
      });
    }

    // ----------------------------------------------------------
    // Delete
    // ----------------------------------------------------------

    await Comment.deleteOne({
      _id:
        comment._id,
    });

    return res.status(200).json({
      success: true,

      message:
        'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};