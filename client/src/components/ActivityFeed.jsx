import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getProjectActivity,
} from '../services/activity.service';

import {
  formatExactDate,
  formatRelativeTime,
  formatStatus,
  formatPriority,
  getActivityCategory,
  getActivityDescription,
  getActivityIcon,
} from '../utils/activityFormatter';

import { useSocket } from '../context/SocketContext';

// ============================================================
// Filters
// ============================================================

const FILTERS = [
  {
    label: 'All',
    value: '',
  },
  {
    label: 'Tasks',
    value: 'tasks',
  },
  {
    label: 'Comments',
    value: 'comments',
  },
  {
    label: 'Projects',
    value: 'projects',
  },
  {
    label: 'Members',
    value: 'members',
  },
];

// ============================================================
// Activity Feed
// ============================================================

const ActivityFeed = ({
  projectId,
  limit = 20,
}) => {
  // ==========================================================
  // Socket
  // ==========================================================

  const {
    connected,
    onActivityCreated,
  } = useSocket();

  // ==========================================================
  // State
  // ==========================================================

  const [activities, setActivities] =
    useState([]);

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [filter, setFilter] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] =
    useState('');

  // ==========================================================
  // Fetch activities
  // ==========================================================

  const fetchActivities = useCallback(
    async ({
      pageNumber = 1,
      append = false,
      selectedFilter = filter,
    } = {}) => {
      if (!projectId) {
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError('');

        const response =
          await getProjectActivity({
            projectId,
            page: pageNumber,
            limit,
          });

        const data =
          response?.data || {};

        let fetchedActivities =
          Array.isArray(
            data.activities,
          )
            ? data.activities
            : [];

        // ------------------------------------------------------
        // Frontend category filtering
        // ------------------------------------------------------

        if (selectedFilter) {
          fetchedActivities =
            fetchedActivities.filter(
              (activity) =>
                getActivityCategory(
                  activity.action,
                ) === selectedFilter,
            );
        }

        // ------------------------------------------------------
        // Remove duplicates
        // ------------------------------------------------------

        setActivities((previous) => {
          const combined =
            append
              ? [
                  ...previous,
                  ...fetchedActivities,
                ]
              : fetchedActivities;

          const uniqueActivities =
            [];

          const seenIds =
            new Set();

          combined.forEach(
            (activity) => {
              const activityId =
                activity?._id;

              if (activityId) {
                if (
                  seenIds.has(
                    activityId,
                  )
                ) {
                  return;
                }

                seenIds.add(
                  activityId,
                );
              }

              uniqueActivities.push(
                activity,
              );
            },
          );

          return uniqueActivities;
        });

        setPagination(
          data.pagination || {
            page: pageNumber,
            limit,
            total:
              fetchedActivities.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage:
              pageNumber > 1,
          },
        );

        setPage(pageNumber);
      } catch (err) {
        console.error(
          'Failed to fetch project activity:',
          err,
        );

        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            'Failed to load activity.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      projectId,
      limit,
      filter,
    ],
  );

  // ==========================================================
  // Initial load / filter change
  // ==========================================================

  useEffect(() => {
    setActivities([]);
    setPage(1);

    fetchActivities({
      pageNumber: 1,
      append: false,
      selectedFilter: filter,
    });
  }, [
    projectId,
    filter,
  ]);

  // ==========================================================
  // REAL-TIME ACTIVITY
  //
  // Server event:
  //
  // activity:created
  //
  // Payload:
  //
  // {
  //   activity
  // }
  // ==========================================================

  useEffect(() => {
    if (
      !projectId ||
      !onActivityCreated
    ) {
      return undefined;
    }

    const handleActivityCreated =
      (payload) => {
        const newActivity =
          payload?.activity;

        if (!newActivity?._id) {
          return;
        }

        // ----------------------------------------------------
        // Make sure this activity belongs to this project.
        // ----------------------------------------------------

        const activityProjectId =
          newActivity.project?._id ||
          newActivity.project;

        if (
          activityProjectId
            ?.toString() !==
          projectId?.toString()
        ) {
          return;
        }

        // ----------------------------------------------------
        // Respect current filter.
        // ----------------------------------------------------

        if (filter) {
          const category =
            getActivityCategory(
              newActivity.action,
            );

          if (category !== filter) {
            return;
          }
        }

        // ----------------------------------------------------
        // Add new activity at the top.
        // ----------------------------------------------------

        setActivities((previous) => {
          const alreadyExists =
            previous.some(
              (activity) =>
                activity._id ===
                newActivity._id,
            );

          if (alreadyExists) {
            return previous;
          }

          return [
            newActivity,
            ...previous,
          ];
        });

        // ----------------------------------------------------
        // Update total count.
        // ----------------------------------------------------

        setPagination(
          (previous) => ({
            ...previous,
            total:
              (previous.total || 0) +
              1,
          }),
        );
      };

    const unsubscribe =
      onActivityCreated(
        handleActivityCreated,
      );

    return unsubscribe;
  }, [
    projectId,
    filter,
    onActivityCreated,
  ]);

  // ==========================================================
  // Filter
  // ==========================================================

  const handleFilterChange = (
    value,
  ) => {
    setFilter(value);
  };

  // ==========================================================
  // Refresh
  // ==========================================================

  const handleRefresh = () => {
    setActivities([]);
    setPage(1);

    fetchActivities({
      pageNumber: 1,
      append: false,
      selectedFilter: filter,
    });
  };

  // ==========================================================
  // Load more
  // ==========================================================

  const handleLoadMore = () => {
    if (
      loadingMore ||
      !pagination.hasNextPage
    ) {
      return;
    }

    fetchActivities({
      pageNumber:
        page + 1,
      append: true,
      selectedFilter: filter,
    });
  };

  // ==========================================================
  // Status change
  // ==========================================================

  const renderStatusChange = (
    activity,
  ) => {
    const previousStatus =
      activity?.metadata
        ?.previousStatus;

    const newStatus =
      activity?.metadata
        ?.newStatus;

    if (
      !previousStatus ||
      !newStatus
    ) {
      return null;
    }

    return (
      <div className="activity-change">
        <span className="activity-status-old">
          {formatStatus(
            previousStatus,
          )}
        </span>

        <span className="activity-arrow">
          →
        </span>

        <span className="activity-status-new">
          {formatStatus(
            newStatus,
          )}
        </span>
      </div>
    );
  };

  // ==========================================================
  // Priority change
  // ==========================================================

  const renderPriorityChange = (
    activity,
  ) => {
    const previousPriority =
      activity?.metadata
        ?.previousPriority;

    const newPriority =
      activity?.metadata
        ?.newPriority;

    if (
      !previousPriority ||
      !newPriority
    ) {
      return null;
    }

    return (
      <div className="activity-change">
        <span>
          {formatPriority(
            previousPriority,
          )}
        </span>

        <span className="activity-arrow">
          →
        </span>

        <span>
          {formatPriority(
            newPriority,
          )}
        </span>
      </div>
    );
  };

  // ==========================================================
  // Comment preview
  // ==========================================================

  const renderCommentPreview = (
    activity,
  ) => {
    const content =
      activity?.metadata?.content ||
      activity?.metadata
        ?.commentContent ||
      activity?.metadata
        ?.commentPreview;

    if (!content) {
      return null;
    }

    return (
      <div className="activity-comment-preview">
        {content}
      </div>
    );
  };

  // ==========================================================
  // No project
  // ==========================================================

  if (!projectId) {
    return null;
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <section className="activity-feed">
      {/* ======================================================
          Header
      ====================================================== */}

      <div className="activity-header">
        <div>
          <h2 className="activity-title">
            Activity
          </h2>

          <p className="activity-subtitle">
            Recent activity in this project
          </p>
        </div>

        <div className="activity-header-actions">
          {/* --------------------------------------------------
              Real-time status
          -------------------------------------------------- */}

          <span
            className={`activity-connection-status ${
              connected
                ? 'connected'
                : 'disconnected'
            }`}
            title={
              connected
                ? 'Real-time updates are active'
                : 'Real-time updates are disconnected'
            }
          >
            <span className="activity-connection-dot" />

            {connected
              ? 'Live'
              : 'Offline'}
          </span>

          {/* --------------------------------------------------
              Refresh
          -------------------------------------------------- */}

          <button
            type="button"
            className="activity-refresh-button"
            onClick={
              handleRefresh
            }
            disabled={loading}
            title="Refresh activity"
          >
            ↻
            <span>
              Refresh
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================
          Filters
      ====================================================== */}

      <div className="activity-filters">
        {FILTERS.map(
          (item) => (
            <button
              key={
                item.value ||
                'all'
              }
              type="button"
              className={`activity-filter ${
                filter ===
                item.value
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                handleFilterChange(
                  item.value,
                )
              }
            >
              {item.label}
            </button>
          ),
        )}
      </div>

      {/* ======================================================
          Loading
      ====================================================== */}

      {loading && (
        <div className="activity-state">
          <div className="activity-spinner" />

          <p>
            Loading activity...
          </p>
        </div>
      )}

      {/* ======================================================
          Error
      ====================================================== */}

      {!loading &&
        error && (
          <div className="activity-state activity-error">
            <div className="activity-state-icon">
              !
            </div>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              className="activity-retry-button"
            >
              Try again
            </button>
          </div>
        )}

      {/* ======================================================
          Empty
      ====================================================== */}

      {!loading &&
        !error &&
        activities.length ===
          0 && (
          <div className="activity-state">
            <div className="activity-empty-icon">
              ◷
            </div>

            <h3>
              No activity yet
            </h3>

            <p>
              Project activity will
              appear here as your
              team works.
            </p>
          </div>
        )}

      {/* ======================================================
          Timeline
      ====================================================== */}

      {!loading &&
        !error &&
        activities.length >
          0 && (
          <>
            <div className="activity-timeline">
              {activities.map(
                (
                  activity,
                  index,
                ) => {
                  const actorName =
                    activity
                      ?.actor
                      ?.name ||
                    activity?.actorName ||
                    'Unknown user';

                  return (
                    <article
                      key={
                        activity._id ||
                        `${activity.action}-${activity.createdAt}-${index}`
                      }
                      className="activity-item"
                    >
                      {/* ----------------------------------------
                          Timeline line
                      ---------------------------------------- */}

                      <div className="activity-timeline-line" />

                      {/* ----------------------------------------
                          Icon
                      ---------------------------------------- */}

                      <div className="activity-icon">
                        {getActivityIcon(
                          activity.action,
                        )}
                      </div>

                      {/* ----------------------------------------
                          Content
                      ---------------------------------------- */}

                      <div className="activity-content">
                        <div className="activity-main">
                          <span>
                            {getActivityDescription(
                              activity,
                            )}
                          </span>
                        </div>

                        {/* --------------------------------------
                            Status transition
                        -------------------------------------- */}

                        {activity.action ===
                          'task.status_changed' &&
                          renderStatusChange(
                            activity,
                          )}

                        {/* --------------------------------------
                            Priority transition
                        -------------------------------------- */}

                        {activity.action ===
                          'task.priority_changed' &&
                          renderPriorityChange(
                            activity,
                          )}

                        {/* --------------------------------------
                            Comment preview
                        -------------------------------------- */}

                        {activity.action ===
                          'comment.created' &&
                          renderCommentPreview(
                            activity,
                          )}

                        {/* --------------------------------------
                            Meta
                        -------------------------------------- */}

                        <div className="activity-meta">
                          <time
                            dateTime={
                              activity.createdAt
                            }
                            title={formatExactDate(
                              activity.createdAt,
                            )}
                          >
                            {formatRelativeTime(
                              activity.createdAt,
                            )}
                          </time>

                          <span className="activity-dot">
                            •
                          </span>

                          <span>
                            {actorName}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {/* ==================================================
                Load more
            ================================================== */}

            {pagination.hasNextPage && (
              <div className="activity-load-more-wrapper">
                <button
                  type="button"
                  className="activity-load-more"
                  onClick={
                    handleLoadMore
                  }
                  disabled={
                    loadingMore
                  }
                >
                  {loadingMore
                    ? 'Loading...'
                    : 'Load more'}
                </button>
              </div>
            )}

            {/* ==================================================
                End
            ================================================== */}

            {!pagination.hasNextPage &&
              activities.length >
                0 && (
                <div className="activity-end">
                  You've reached the
                  end of the activity
                  history.
                </div>
              )}
          </>
        )}
    </section>
  );
};

export default ActivityFeed;