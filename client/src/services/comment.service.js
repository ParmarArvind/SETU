import api from './api';

// GET /api/tasks/:taskId/comments
export const getTaskComments = async (taskId) => {
  const response = await api.get(
    `/tasks/${taskId}/comments`,
  );

  return response.data;
};

// POST /api/tasks/:taskId/comments
export const createComment = async (taskId, content) => {
  const response = await api.post(
    `/tasks/${taskId}/comments`,
    {
      content,
    },
  );

  return response.data;
};

// PATCH /api/tasks/:taskId/comments/:commentId
export const updateComment = async (
  taskId,
  commentId,
  content,
) => {
  const response = await api.patch(
    `/tasks/${taskId}/comments/${commentId}`,
    {
      content,
    },
  );

  return response.data;
};

// DELETE /api/tasks/:taskId/comments/:commentId
export const deleteComment = async (
  taskId,
  commentId,
) => {
  const response = await api.delete(
    `/tasks/${taskId}/comments/${commentId}`,
  );

  return response.data;
};