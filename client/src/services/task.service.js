import api from './api';

// --------------------------------------------------------------
// listTasks: GET /api/projects/:projectId/tasks
// params: { search, status, priority, assignee, label, page, limit }
// --------------------------------------------------------------
export const listTasks = async (projectId, params = {}) => {
  // Strip empty-string/undefined values so we don't send
  // ?status=&priority=&page=1 style noise to the API.
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
  );

  const response = await api.get(`/projects/${projectId}/tasks`, {
    params: cleanParams,
  });
  return response.data;
};

// --------------------------------------------------------------
// getKanbanBoard: GET /api/projects/:projectId/kanban
// --------------------------------------------------------------
export const getKanbanBoard = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/kanban`);
  return response.data;
};

// --------------------------------------------------------------
// createTask: POST /api/projects/:projectId/tasks
// --------------------------------------------------------------
export const createTask = async (projectId, payload) => {
  const response = await api.post(`/projects/${projectId}/tasks`, payload);
  return response.data;
};

// --------------------------------------------------------------
// getTask: GET /api/tasks/:taskId
// --------------------------------------------------------------
export const getTask = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};

// --------------------------------------------------------------
// updateTask: PATCH /api/tasks/:taskId
// (title, description, labels, dueDate only — see task.controller.js)
// --------------------------------------------------------------
export const updateTask = async (taskId, payload) => {
  const response = await api.patch(`/tasks/${taskId}`, payload);
  return response.data;
};

// --------------------------------------------------------------
// assignTask: PATCH /api/tasks/:taskId/assign
// Pass assignee: null to unassign.
// --------------------------------------------------------------
export const assignTask = async (taskId, assignee) => {
  const response = await api.patch(`/tasks/${taskId}/assign`, { assignee });
  return response.data;
};

// --------------------------------------------------------------
// updateTaskPriority: PATCH /api/tasks/:taskId/priority
// --------------------------------------------------------------
export const updateTaskPriority = async (taskId, priority) => {
  const response = await api.patch(`/tasks/${taskId}/priority`, { priority });
  return response.data;
};

// --------------------------------------------------------------
// updateTaskStatus: PATCH /api/tasks/:taskId/status
// The endpoint the Kanban board's drag-and-drop calls.
// --------------------------------------------------------------
export const updateTaskStatus = async (taskId, status) => {
  const response = await api.patch(`/tasks/${taskId}/status`, { status });
  return response.data;
};