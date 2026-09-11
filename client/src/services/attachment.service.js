import api from './api';

// ============================================================
// LIST TASK ATTACHMENTS
// GET /api/tasks/:taskId/attachments
// ============================================================

export const listTaskAttachments = async (
  taskId,
) => {
  const response = await api.get(
    `/tasks/${taskId}/attachments`,
  );

  return response.data;
};

// ============================================================
// UPLOAD TASK ATTACHMENT
// POST /api/tasks/:taskId/attachments
// ============================================================

export const uploadTaskAttachment = async (
  taskId,
  file,
  onUploadProgress,
) => {
  const formData = new FormData();

  formData.append(
    'file',
    file,
  );

  const response = await api.post(
    `/tasks/${taskId}/attachments`,
    formData,
    {
      onUploadProgress,
    },
  );

  return response.data;
};

// ============================================================
// DOWNLOAD TASK ATTACHMENT
// GET /api/tasks/:taskId/attachments/:attachmentId
// ============================================================

export const downloadTaskAttachment = async (
  taskId,
  attachmentId,
) => {
  const response = await api.get(
    `/tasks/${taskId}/attachments/${attachmentId}`,
    {
      responseType: 'blob',
    },
  );

  return response;
};

// ============================================================
// DELETE TASK ATTACHMENT
// DELETE /api/tasks/:taskId/attachments/:attachmentId
// ============================================================

export const deleteTaskAttachment = async (
  taskId,
  attachmentId,
) => {
  const response = await api.delete(
    `/tasks/${taskId}/attachments/${attachmentId}`,
  );

  return response.data;
};