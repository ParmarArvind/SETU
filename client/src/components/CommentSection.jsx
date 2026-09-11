import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { useSocket } from '../context/SocketContext';

import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from '../services/comment.service';

const MAX_COMMENT_LENGTH = 2000;

const formatCommentDate = (date) => {
  if (!date) return '';

  return new Date(date).toLocaleString();
};

const CommentSection = ({ taskId }) => {
  const { user } = useAuth();
  const { currentRole } = useOrganization();

  const {
    connected,
    onCommentCreated,
  } = useSocket();

  const currentUserId =
    user?._id || user?.id;

  const [comments, setComments] =
    useState([]);

  const [content, setContent] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [submitError, setSubmitError] =
    useState('');

  const [editingId, setEditingId] =
    useState(null);

  const [editingContent, setEditingContent] =
    useState('');

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  // ============================================================
  // Load comments
  // ============================================================

  const loadComments = useCallback(
    async () => {
      setLoading(true);
      setError('');

      try {
        const result =
          await getTaskComments(taskId);

        setComments(
          result.data?.comments || [],
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Failed to load comments',
        );
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // ============================================================
  // REAL-TIME COMMENT CREATED
  //
  // Server event:
  //
  // comment:created
  //
  // Payload:
  //
  // {
  //   comment
  // }
  // ============================================================

  useEffect(() => {
    if (!taskId || !onCommentCreated) {
      return undefined;
    }

    const handleCommentCreated = (
      payload,
    ) => {
      const newComment =
        payload?.comment;

      if (!newComment?._id) {
        return;
      }

      // --------------------------------------------------------
      // Only add comments belonging to this task
      // --------------------------------------------------------

      const commentTaskId =
        newComment.task?._id ||
        newComment.task;

      if (
        commentTaskId?.toString() !==
        taskId?.toString()
      ) {
        return;
      }

      // --------------------------------------------------------
      // Prevent duplicate comment
      //
      // The creator already receives the socket event after
      // the POST request has added the comment locally.
      // --------------------------------------------------------

      setComments((prev) => {
        const alreadyExists =
          prev.some(
            (comment) =>
              comment._id ===
              newComment._id,
          );

        if (alreadyExists) {
          return prev;
        }

        return [
          ...prev,
          newComment,
        ];
      });
    };

    const unsubscribe =
      onCommentCreated(
        handleCommentCreated,
      );

    return unsubscribe;
  }, [
    taskId,
    onCommentCreated,
  ]);

  // ============================================================
  // Add comment
  // ============================================================

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    const trimmedContent =
      content.trim();

    if (!trimmedContent) {
      setSubmitError(
        'Comment cannot be empty',
      );

      return;
    }

    if (
      trimmedContent.length >
      MAX_COMMENT_LENGTH
    ) {
      setSubmitError(
        `Comment must be at most ${MAX_COMMENT_LENGTH} characters`,
      );

      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const result =
        await createComment(
          taskId,
          trimmedContent,
        );

      const newComment =
        result.data?.comment;

      if (newComment) {
        setComments((prev) => {
          // ----------------------------------------------------
          // Prevent duplicate in case the socket event arrives
          // before the API response is processed.
          // ----------------------------------------------------

          const alreadyExists =
            prev.some(
              (comment) =>
                comment._id ===
                newComment._id,
            );

          if (alreadyExists) {
            return prev;
          }

          return [
            ...prev,
            newComment,
          ];
        });
      }

      setContent('');
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          'Failed to add comment',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Start editing
  // ============================================================

  const handleStartEdit = (
    comment,
  ) => {
    setEditingId(comment._id);
    setEditingContent(
      comment.content,
    );
    setSubmitError('');
  };

  // ============================================================
  // Cancel editing
  // ============================================================

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  // ============================================================
  // Save edit
  // ============================================================

  const handleSaveEdit = async (
    commentId,
  ) => {
    const trimmedContent =
      editingContent.trim();

    if (!trimmedContent) {
      setSubmitError(
        'Comment cannot be empty',
      );

      return;
    }

    if (
      trimmedContent.length >
      MAX_COMMENT_LENGTH
    ) {
      setSubmitError(
        `Comment must be at most ${MAX_COMMENT_LENGTH} characters`,
      );

      return;
    }

    setSavingEdit(true);
    setSubmitError('');

    try {
      const result =
        await updateComment(
          taskId,
          commentId,
          trimmedContent,
        );

      const updatedComment =
        result.data?.comment;

      if (updatedComment) {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? updatedComment
              : comment,
          ),
        );
      }

      handleCancelEdit();
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          'Failed to update comment',
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // ============================================================
  // Delete
  // ============================================================

  const handleDelete = async (
    commentId,
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this comment?',
      );

    if (!confirmed) return;

    setDeletingId(commentId);
    setSubmitError('');

    try {
      await deleteComment(
        taskId,
        commentId,
      );

      setComments((prev) =>
        prev.filter(
          (comment) =>
            comment._id !== commentId,
        ),
      );
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          'Failed to delete comment',
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // Permissions
  // ============================================================

  const canModerate =
    currentRole === 'owner' ||
    currentRole === 'admin';

  // ============================================================
  // UI
  // ============================================================

  return (
    <section className="comments-section">
      <div className="comments-header">
        <div>
          <h2>Comments</h2>

          <span className="comments-count">
            {comments.length}
          </span>
        </div>

        {/* ------------------------------------------------------
            Real-time connection indicator
        ------------------------------------------------------ */}

        <span
          className={`comment-connection-status ${
            connected
              ? 'connected'
              : 'disconnected'
          }`}
        >
          {connected
            ? 'Live'
            : 'Offline'}
        </span>
      </div>

      {/* ========================================================
          Add comment
      ======================================================== */}

      <form
        className="comment-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="task-comment">
          Add a comment
        </label>

        <textarea
          id="task-comment"
          value={content}
          onChange={(event) =>
            setContent(
              event.target.value,
            )
          }
          placeholder="Write a comment..."
          maxLength={
            MAX_COMMENT_LENGTH
          }
          rows={4}
          disabled={submitting}
        />

        <div className="comment-form-footer">
          <span className="comment-character-count">
            {content.length}/
            {MAX_COMMENT_LENGTH}
          </span>

          <button
            type="submit"
            disabled={
              submitting ||
              !content.trim()
            }
          >
            {submitting
              ? 'Posting...'
              : 'Add Comment'}
          </button>
        </div>

        {submitError && (
          <p
            className="comment-error"
            role="alert"
          >
            {submitError}
          </p>
        )}
      </form>

      {/* ========================================================
          Loading
      ======================================================== */}

      {loading && (
        <p className="comments-state">
          Loading comments...
        </p>
      )}

      {/* ========================================================
          Loading error
      ======================================================== */}

      {!loading && error && (
        <div className="comments-error">
          <p role="alert">
            {error}
          </p>

          <button
            type="button"
            onClick={loadComments}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ========================================================
          Empty
      ======================================================== */}

      {!loading &&
        !error &&
        comments.length === 0 && (
          <p className="comments-empty">
            No comments yet. Start the
            discussion.
          </p>
        )}

      {/* ========================================================
          Comments
      ======================================================== */}

      {!loading &&
        !error &&
        comments.length > 0 && (
          <div className="comments-list">
            {comments.map(
              (comment) => {
                const authorId =
                  comment.author?._id ||
                  comment.author?.id;

                const isAuthor =
                  authorId ===
                  currentUserId;

                const canEdit =
                  isAuthor ||
                  canModerate;

                const canDelete =
                  isAuthor ||
                  canModerate;

                const isEditing =
                  editingId ===
                  comment._id;

                return (
                  <article
                    key={comment._id}
                    className="comment-item"
                  >
                    {/* ------------------------------------------
                        Author
                    ------------------------------------------ */}

                    <div className="comment-author">
                      <strong>
                        {comment.author
                          ?.name ||
                          'Unknown User'}
                      </strong>

                      <time
                        dateTime={
                          comment.createdAt
                        }
                      >
                        {formatCommentDate(
                          comment.createdAt,
                        )}
                      </time>
                    </div>

                    {/* ------------------------------------------
                        Editing
                    ------------------------------------------ */}

                    {isEditing ? (
                      <div className="comment-edit">
                        <textarea
                          value={
                            editingContent
                          }
                          onChange={(
                            event,
                          ) =>
                            setEditingContent(
                              event.target
                                .value,
                            )
                          }
                          maxLength={
                            MAX_COMMENT_LENGTH
                          }
                          rows={4}
                          disabled={
                            savingEdit
                          }
                        />

                        <div className="comment-edit-footer">
                          <span>
                            {
                              editingContent.length
                            }
                            /
                            {
                              MAX_COMMENT_LENGTH
                            }
                          </span>

                          <div>
                            <button
                              type="button"
                              onClick={
                                handleCancelEdit
                              }
                              disabled={
                                savingEdit
                              }
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSaveEdit(
                                  comment._id,
                                )
                              }
                              disabled={
                                savingEdit ||
                                !editingContent.trim()
                              }
                            >
                              {savingEdit
                                ? 'Saving...'
                                : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ------------------------------------
                            Comment content
                        ------------------------------------ */}

                        <p className="comment-content">
                          {comment.content}
                        </p>

                        {/* ------------------------------------
                            Actions
                        ------------------------------------ */}

                        {(
                          canEdit ||
                          canDelete
                        ) && (
                          <div className="comment-actions">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartEdit(
                                    comment,
                                  )
                                }
                              >
                                Edit
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    comment._id,
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  comment._id
                                }
                              >
                                {deletingId ===
                                comment._id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              },
            )}
          </div>
        )}
    </section>
  );
};

export default CommentSection;