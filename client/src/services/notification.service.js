import api from './api';

// ============================================================
// List notifications
// ============================================================

export const listNotifications = async (
  limit = 50,
) => {
  const response =
    await api.get(
      '/notifications',
      {
        params: {
          limit,
        },
      },
    );

  return response.data;
};

// ============================================================
// Mark one notification as read
// ============================================================

export const markNotificationRead =
  async (notificationId) => {
    const response =
      await api.patch(
        `/notifications/${notificationId}/read`,
      );

    return response.data;
  };

// ============================================================
// Mark all notifications as read
// ============================================================

export const markAllNotificationsRead =
  async () => {
    const response =
      await api.patch(
        '/notifications/read-all',
      );

    return response.data;
  };