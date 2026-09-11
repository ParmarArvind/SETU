import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useOrganization,
} from '../context/OrganizationContext';

import {
  useSocket,
} from '../context/SocketContext';

import {
  acceptOrganizationRequest,
  rejectOrganizationRequest,
} from '../services/organizationRequest.service';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';

import './notifications.css';

// ============================================================
// Helpers
// ============================================================

const getRequestId =
  (notification) =>
    notification?.request?._id ||
    notification?.request ||
    notification?.data?.requestId ||
    notification?.data?.request?._id ||
    null;

const getOrganizationName =
  (notification) =>
    notification?.organization?.name ||
    notification?.data?.organizationName ||
    notification?.data?.organization?.name ||
    'Organization';

const getNotificationCategory =
  (notification) => {
    if (
      notification.type === 'organization_invitation' ||
      notification.type === 'organization_join_request' ||
      notification.type === 'organization_request_accepted' ||
      notification.type === 'organization_request_rejected' ||
      notification.type === 'organization_request_expired'
    ) {
      return 'organization';
    }

    if (
      notification.type === 'task_assigned' ||
      notification.type === 'task_updated'
    ) {
      return 'task';
    }

    if (
      notification.type === 'comment_created'
    ) {
      return 'comment';
    }

    return 'other';
  };

const formatDate =
  (value) => {
    if (!value) {
      return 'Just now';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return 'Recently';
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  };

const formatRequestExpiry =
  (value) => {
    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '';
    }

    return `Expires ${date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    )}`;
  };

// ============================================================
// Notifications
// ============================================================

const Notifications =
  () => {
    const navigate =
      useNavigate();

    const {
      refreshOrganizations,
    } =
      useOrganization();

    const {
  onNotificationNew,
  onNotificationRead,
  onNotificationsAllRead,
  onOrganizationRequestUpdated,
} = useSocket();

    const [
      notifications,
      setNotifications,
    ] = useState([]);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      pageError,
      setPageError,
    ] = useState('');

    const [
      actionError,
      setActionError,
    ] = useState('');

    const [
      processingId,
      setProcessingId,
    ] = useState(null);

    const [
      filter,
      setFilter,
    ] = useState('all');

    // ========================================================
    // Load notifications
    // ========================================================

    const loadNotifications =
      useCallback(
        async () => {
          setLoading(true);
          setPageError('');

          try {
            const response =
              await listNotifications(
                100,
              );

            setNotifications(
              response?.data?.notifications ||
              [],
            );
          } catch (error) {
            setPageError(
              error.response
                ?.data
                ?.message ||
              'Unable to load notifications.',
            );
          } finally {
            setLoading(false);
          }
        },
        [],
      );

    // ========================================================
    // Initial load
    // ========================================================

    useEffect(() => {
      loadNotifications();
    }, [
      loadNotifications,
    ]);

    // ========================================================
    // Real-time notification:new listener
    // ========================================================

    useEffect(() => {
      if (
        typeof onNotificationNew !==
        'function'
      ) {
        return undefined;
      }

      const unsubscribe =
        onNotificationNew(
          (payload) => {
            const notification =
              payload?.notification;

            if (!notification) {
              return;
            }

            console.log(
              '[Notifications] New notification:',
              notification,
            );

            setNotifications(
              (current) => {
                const alreadyExists =
                  current.some(
                    (item) =>
                      item._id ===
                      notification._id,
                  );

                if (
                  alreadyExists
                ) {
                  return current;
                }

                return [
                  notification,
                  ...current,
                ].slice(
                  0,
                  100,
                );
              },
            );
          },
        );

      return unsubscribe;
    }, [
      onNotificationNew,
    ]);

  useEffect(() => {
  if (
    typeof onOrganizationRequestUpdated !== 'function'
  ) {
    return undefined;
  }

  const unsubscribe =
    onOrganizationRequestUpdated(async (payload) => {
      if (!payload?.requestId) {
        return;
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => {
          const notificationRequestId =
            notification.request?._id ||
            notification.request ||
            notification.data?.requestId;

          if (
            String(notificationRequestId) !==
            String(payload.requestId)
          ) {
            return notification;
          }

          return {
            ...notification,

            data: {
              ...(notification.data || {}),
              requestId: payload.requestId,
              action: payload.action,
              status: payload.status,
            },

            request:
              notification.request &&
              typeof notification.request === 'object'
                ? {
                    ...notification.request,
                    status: payload.status,
                    respondedAt:
                      new Date().toISOString(),
                  }
                : notification.request,

            requestStatus: payload.status,
            action: payload.action,
          };
        }),
      );

      // ------------------------------------------------------
      // Refresh organization state after an accepted request
      // ------------------------------------------------------

      if (
        payload.status === 'accepted' &&
        payload.requestType === 'invitation'
      ) {
        try {
          await refreshOrganizations();
        } catch (error) {
          console.error(
            '[Organization] Failed to refresh organizations after invitation acceptance:',
            error,
          );
        }
      }
    });

  return unsubscribe;
}, [
  onOrganizationRequestUpdated,
  refreshOrganizations,
]);
    // ========================================================
    // 7.6.4 - Real-time notification:read listener
    // ========================================================

    useEffect(() => {
      if (
        typeof onNotificationRead !==
        'function'
      ) {
        return undefined;
      }

      const unsubscribe =
        onNotificationRead(
          (payload) => {
            const notificationId =
              payload?.notificationId;

            if (!notificationId) {
              return;
            }

            console.log(
              '[Notifications] Notification marked as read:',
              notificationId,
            );

            setNotifications(
              (current) =>
                current.map(
                  (notification) =>
                    notification._id ===
                    notificationId
                      ? {
                          ...notification,
                          read: true,
                          readAt:
                            payload.readAt ||
                            new Date().toISOString(),
                        }
                      : notification,
                ),
            );
          },
        );

      return unsubscribe;
    }, [
      onNotificationRead,
    ]);

    // ========================================================
    // 7.6.4 - Real-time notification:allRead listener
    // ========================================================

    useEffect(() => {
      if (
        typeof onNotificationsAllRead !==
        'function'
      ) {
        return undefined;
      }

      const unsubscribe =
        onNotificationsAllRead(
          (payload) => {
            const readAt =
              payload?.readAt ||
              new Date().toISOString();

            console.log(
              '[Notifications] All notifications marked as read',
            );

            setNotifications(
              (current) =>
                current.map(
                  (notification) => ({
                    ...notification,
                    read: true,
                    readAt,
                  }),
                ),
            );
          },
        );

      return unsubscribe;
    }, [
      onNotificationsAllRead,
    ]);

    // ========================================================
    // Unread count
    // ========================================================

    const unreadCount =
      useMemo(
        () =>
          notifications.filter(
            (notification) =>
              !notification.read,
          ).length,
        [
          notifications,
        ],
      );

    // ========================================================
    // Filter
    // ========================================================

    const visibleNotifications =
      useMemo(
        () => {
          if (
            filter === 'all'
          ) {
            return notifications;
          }

          return notifications.filter(
            (notification) =>
              getNotificationCategory(
                notification,
              ) === filter,
          );
        },
        [
          filter,
          notifications,
        ],
      );

    // ========================================================
    // Mark one read
    // ========================================================

    const handleMarkRead =
      async (
        notification,
      ) => {
        if (
          notification.read
        ) {
          return;
        }

        try {
          await markNotificationRead(
            notification._id,
          );

          setNotifications(
            (current) =>
              current.map(
                (item) =>
                  item._id ===
                  notification._id
                    ? {
                        ...item,
                        read: true,
                        readAt:
                          new Date().toISOString(),
                      }
                    : item,
              ),
          );
        } catch (error) {
          setActionError(
            error.response
              ?.data
              ?.message ||
            'Unable to mark notification as read.',
          );
        }
      };

    // ========================================================
    // Mark all read
    // ========================================================

    const handleMarkAllRead =
      async () => {
        try {
          await markAllNotificationsRead();

          const readAt =
            new Date().toISOString();

          setNotifications(
            (current) =>
              current.map(
                (
                  notification,
                ) => ({
                  ...notification,
                  read: true,
                  readAt,
                }),
              ),
          );
        } catch (error) {
          setActionError(
            error.response
              ?.data
              ?.message ||
            'Unable to mark notifications as read.',
          );
        }
      };

    // ========================================================
    // Organization request
    // ========================================================

    const handleOrganizationRequest =
      async (
        notification,
        action,
      ) => {
        const requestId =
          getRequestId(
            notification,
          );

        if (!requestId) {
          setActionError(
            'This invitation is missing its request information. Refresh and try again.',
          );

          return;
        }

        setProcessingId(
          notification._id,
        );

        setActionError('');

        try {
          if (
            action ===
            'accept'
          ) {
            await acceptOrganizationRequest(
              requestId,
            );

            await refreshOrganizations();
          } else {
            await rejectOrganizationRequest(
              requestId,
            );
          }

          await markNotificationRead(
            notification._id,
          );

          setNotifications(
            (current) =>
              current.map(
                (item) =>
                  item._id ===
                  notification._id
                    ? {
                        ...item,
                        read: true,
                        readAt:
                          new Date().toISOString(),
                        data: {
                          ...(item.data ||
                            {}),
                          actionCompleted:
                            action,
                        },
                      }
                    : item,
              ),
          );
        } catch (error) {
          setActionError(
            error.response
              ?.data
              ?.message ||
            `Unable to ${action} this organization request.`,
          );
        } finally {
          setProcessingId(
            null,
          );
        }
      };

    // ========================================================
    // Invitation state
    // ========================================================

    const isActionableInvitation =
      (
        notification,
      ) =>
        notification.type ===
          'organization_invitation' &&
        !notification.data
          ?.actionCompleted &&
        Boolean(
          getRequestId(
            notification,
          ),
        );

    // ========================================================
    // Render
    // ========================================================

    return (
      <div className="page page-notifications">

        {/* ================================================== */}
        {/* Header */}
        {/* ================================================== */}

        <div className="notifications-page-header">
          <div>
            <span className="eyebrow">
              Workspace
            </span>

            <h1>
              Notifications
            </h1>

            <p className="page-subtitle">
              Invitations, organization
              requests and workspace
              updates.
            </p>
          </div>

          <div className="notifications-header-actions">
            <span className="notifications-count">
              {unreadCount}{' '}
              unread
            </span>

            <button
              type="button"
              className="button notifications-mark-all"
              onClick={
                handleMarkAllRead
              }
              disabled={
                unreadCount ===
                0
              }
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* Action error */}
        {/* ================================================== */}

        {actionError && (
          <div
            className="notifications-alert"
            role="alert"
          >
            {actionError}
          </div>
        )}

        {/* ================================================== */}
        {/* Notification panel */}
        {/* ================================================== */}

        <section className="notifications-panel">

          {/* ================================================ */}
          {/* Toolbar */}
          {/* ================================================ */}

          <div className="notifications-toolbar">

            <div className="notification-filter-list">

              {[
                [
                  'all',
                  'All',
                ],
                [
                  'organization',
                  'Organization',
                ],
                [
                  'task',
                  'Tasks',
                ],
                [
                  'comment',
                  'Comments',
                ],
                [
                  'other',
                  'Other',
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={value}
                    type="button"
                    className={`notification-filter ${
                      filter ===
                      value
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setFilter(
                        value,
                      )
                    }
                  >
                    {label}
                  </button>
                ),
              )}

            </div>
          </div>

          {/* ================================================ */}
          {/* Loading */}
          {/* ================================================ */}

          {loading && (
            <div className="notifications-state">

              <div className="notification-state-icon">
                ◌
              </div>

              <h2>
                Loading notifications
              </h2>

              <p>
                Checking your latest
                workspace activity.
              </p>

            </div>
          )}

          {/* ================================================ */}
          {/* Error */}
          {/* ================================================ */}

          {!loading &&
            pageError && (
              <div className="notifications-state notifications-state-error">

                <div className="notification-state-icon">
                  !
                </div>

                <h2>
                  Unable to load
                  notifications
                </h2>

                <p>
                  {pageError}
                </p>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={
                    loadNotifications
                  }
                >
                  Try again
                </button>

              </div>
            )}

          {/* ================================================ */}
          {/* Empty */}
          {/* ================================================ */}

          {!loading &&
            !pageError &&
            visibleNotifications.length ===
              0 && (
              <div className="notifications-state">

                <div className="notification-state-icon">
                  ✓
                </div>

                <h2>
                  No notifications
                </h2>

                <p>
                  You are all caught up.
                  New invitations and
                  workspace events will
                  appear here.
                </p>

              </div>
            )}

          {/* ================================================ */}
          {/* List */}
          {/* ================================================ */}

          {!loading &&
            !pageError &&
            visibleNotifications.length >
              0 && (
              <div className="notification-list">

                {visibleNotifications.map(
                  (
                    notification,
                  ) => {
                    const actionableInvitation =
                      isActionableInvitation(
                        notification,
                      );

                    const completedAction =
                      notification
                        .data
                        ?.actionCompleted;

                    const organizationName =
                      getOrganizationName(
                        notification,
                      );

                    return (
                      <article
                        key={
                          notification._id
                        }
                        className={`notification-card ${
                          notification.read
                            ? ''
                            : 'unread'
                        }`}
                      >

                        {/* ================================= */}
                        {/* Icon */}
                        {/* ================================= */}

                        <div className="notification-card-icon">
                          {notification.type ===
                          'organization_invitation'
                            ? '✉'
                            : notification.type ===
                              'organization_join_request'
                            ? '👥'
                            : notification.type ===
                              'task_assigned'
                            ? '☑'
                            : notification.type ===
                              'comment_created'
                            ? '💬'
                            : '•'}
                        </div>

                        {/* ================================= */}
                        {/* Content */}
                        {/* ================================= */}

                        <div className="notification-card-content">

                          <div className="notification-card-top">

                            <div>
                              <span className="notification-category">
                                {getNotificationCategory(
                                  notification,
                                )}
                              </span>

                              <h2>
                                {
                                  notification.title
                                }
                              </h2>
                            </div>

                            {!notification.read && (
                              <span className="notification-unread-dot" />
                            )}

                          </div>

                          <p className="notification-message">
                            {
                              notification.message
                            }
                          </p>

                          {/* ============================= */}
                          {/* Invitation */}
                          {/* ============================= */}

                          {notification.type ===
                            'organization_invitation' && (
                            <div className="notification-invitation">

                              <div className="notification-invitation-info">

                                <strong>
                                  {
                                    organizationName
                                  }
                                </strong>

                                <span>
                                  {notification
                                    .data
                                    ?.role
                                    ? `Invited role: ${notification.data.role}`
                                    : 'Organization invitation'}
                                </span>

                                {formatRequestExpiry(
                                  notification
                                    .data
                                    ?.expiresAt ||
                                  notification
                                    .request
                                    ?.expiresAt,
                                ) && (
                                  <small>
                                    {formatRequestExpiry(
                                      notification
                                        .data
                                        ?.expiresAt ||
                                      notification
                                        .request
                                        ?.expiresAt,
                                    )}
                                  </small>
                                )}

                              </div>

                              {/* =========================== */}
                              {/* Invitation actions */}
                              {/* =========================== */}

                              {actionableInvitation ? (
                                <div className="notification-actions">

                                  <button
                                    type="button"
                                    className="button button-primary"
                                    disabled={
                                      processingId ===
                                      notification._id
                                    }
                                    onClick={() =>
                                      handleOrganizationRequest(
                                        notification,
                                        'accept',
                                      )
                                    }
                                  >
                                    {processingId ===
                                    notification._id
                                      ? 'Processing...'
                                      : 'Accept'}
                                  </button>

                                  <button
                                    type="button"
                                    className="button notification-reject-button"
                                    disabled={
                                      processingId ===
                                      notification._id
                                    }
                                    onClick={() =>
                                      handleOrganizationRequest(
                                        notification,
                                        'reject',
                                      )
                                    }
                                  >
                                    Reject
                                  </button>

                                </div>
                              ) : completedAction ? (
                                <span className="notification-action-complete">
                                  Invitation{' '}
                                  {
                                    completedAction
                                  }ed
                                </span>
                              ) : null}

                            </div>
                          )}

                          {/* ================================= */}
                          {/* Footer */}
                          {/* ================================= */}

                          <div className="notification-card-footer">

                            <time
                              dateTime={
                                notification.createdAt
                              }
                            >
                              {formatDate(
                                notification.createdAt,
                              )}
                            </time>

                            {!notification.read && (
                              <button
                                type="button"
                                className="notification-read-button"
                                onClick={() =>
                                  handleMarkRead(
                                    notification,
                                  )
                                }
                              >
                                Mark as read
                              </button>
                            )}

                          </div>

                        </div>
                      </article>
                    );
                  },
                )}

              </div>
            )}

        </section>

        {/* ================================================== */}
        {/* Back */}
        {/* ================================================== */}

        <button
          type="button"
          className="notifications-back-link"
          onClick={() =>
            navigate(
              '/dashboard',
            )
          }
        >
          ← Back to dashboard
        </button>

      </div>
    );
  };

export default Notifications;